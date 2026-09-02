import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, ChevronDown, QrCode, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Buscador from '../components/Buscador.jsx';
import QrModal from '../components/QrModal.jsx';
import { api } from '../services/api.js';
import { useUI } from '../contexts/UIContext.jsx';

// Sección 7.5: ABM de Equipos agrupado por TipoMaquina con 4 acciones por fila:
// (Generar QR, Reportes, Editar, Eliminar) y doble-eliminación (Equipo / Form).
export default function EquiposPage() {
  const [grupos, setGrupos] = useState([]);
  const [forms, setForms] = useState([]);
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [edit, setEdit] = useState(null);
  const [delEquipo, setDelEquipo] = useState(null);
  const [delForm, setDelForm] = useState(null);
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useUI();
  const nav = useNavigate();

  async function load() {
    const [g, f] = await Promise.all([
      api(`/equipos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      api('/forms'),
    ]);
    setGrupos(g);
    setForms(f);
  }
  useEffect(() => { load().catch(() => {}); }, [q]);

  function toggle(id) { setCollapsed(s => ({ ...s, [id]: !s[id] })); }

  async function guardar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (edit?.id) await api(`/equipos/${edit.id}`, { method: 'PUT', body: { nombre: edit.nombre, form_id: Number(edit.form_id) } });
      else          await api('/equipos', { method: 'POST', body: { nombre: edit.nombre, form_id: Number(edit.form_id) } });
      showToast('Guardado.', 'success');
      setEdit(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  async function eliminarEquipo() {
    setBusy(true);
    try {
      await api(`/equipos/${delEquipo.id}`, { method: 'DELETE' });
      showToast('Equipo eliminado.', 'success');
      setDelEquipo(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  async function eliminarForm() {
    setBusy(true);
    try {
      await api(`/forms/${delForm.id}`, { method: 'DELETE' });
      showToast('Formulario eliminado.', 'success');
      setDelForm(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <DashboardLayout
      title="Equipo"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => nav('/inicio')}><ArrowLeft size={16} /> Volver</Button>
          <Button onClick={() => setEdit({ nombre: '', form_id: forms[0]?.id })}><Plus size={16} /> Crear +</Button>
        </>
      }
    >
      <div className="mb-4">
        <Buscador placeholder="Buscar equipo por nombre…" onBuscar={setQ} />
      </div>

      <div className="space-y-3">
        {grupos.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-jg-texto/60">
            Sin equipos. Creá uno con "Crear +".
          </div>
        )}
        {grupos.map(g => {
          const isCollapsed = !!collapsed[g.tipo_maquina_id];
          return (
            <div key={g.tipo_maquina_id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="flex items-stretch bg-jg-fondoSuave">
                <button
                  onClick={() => toggle(g.tipo_maquina_id)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-jg-primario font-semibold"
                >
                  <span>{g.tipo_maquina} <span className="text-jg-texto/50 font-normal">({g.equipos.length})</span></span>
                  <ChevronDown size={18} className={`transition ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {/* Acceso a "Eliminar Form asociado" desde el grupo (sección 7.5 ⚠). */}
                <button
                  title="Eliminar el Form asociado a este tipo"
                  onClick={(ev) => { ev.stopPropagation(); const f = forms.find(f => f.tipo_maquina_id === g.tipo_maquina_id); if (f) setDelForm({ id: f.id, nombre: f.nombre }); }}
                  className="px-3 text-jg-error hover:bg-red-50"
                  aria-label="Eliminar Form"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {!isCollapsed && (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-jg-texto/60">
                      <tr>
                        <th className="text-left px-4 py-2">Nombre</th>
                        <th className="text-right px-4 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.equipos.map(e => (
                        <tr key={e.id} className="border-t hover:bg-jg-fondoSuave/40">
                          <td className="px-4 py-2">{e.nombre}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button title="Generar QR" onClick={() => setQr(e)}  className="text-jg-primario hover:bg-jg-fondoSuave p-1 rounded"><QrCode size={16} /></button>
                              <button title="Reportes"   onClick={() => nav(`/reportes?equipo=${e.id}`)} className="text-jg-secundario hover:bg-jg-fondoSuave p-1 rounded"><FileText size={16} /></button>
                              <button title="Editar"     onClick={() => setEdit({ id: e.id, nombre: e.nombre, form_id: e.form_id })} className="text-jg-secundario hover:bg-jg-fondoSuave p-1 rounded"><Edit2 size={16} /></button>
                              <button title="Eliminar"   onClick={() => setDelEquipo(e)} className="text-jg-error hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {g.equipos.length === 0 && (
                        <tr><td colSpan={2} className="text-center text-jg-texto/60 py-3">Sin equipos en este tipo.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal alta/edición de equipo */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar equipo' : 'Nuevo equipo'}>
        <form onSubmit={guardar} className="space-y-3">
          <label className="block text-sm font-medium">Nombre
            <input className="w-full border rounded px-3 py-2 mt-1" required autoFocus
              value={edit?.nombre ?? ''} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Formulario
            <select className="w-full border rounded px-3 py-2 mt-1" required
              value={edit?.form_id ?? ''} onChange={(e) => setEdit({ ...edit, form_id: e.target.value })}>
              {forms.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Doble-eliminación (sección 7.5 ⚠) — dos modales distintos */}
      <Modal open={!!delEquipo} onClose={() => setDelEquipo(null)} title="Eliminar equipo" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDelEquipo(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminarEquipo} disabled={busy}>Eliminar solo el equipo</Button>
        </div>
      }>
        <p>Vas a eliminar <b>{delEquipo?.nombre}</b>.</p>
        <p className="text-sm text-jg-texto/70 mt-2">Esta acción afecta únicamente a esta instancia. El formulario asociado seguirá disponible para otros equipos del mismo tipo. Baja lógica.</p>
      </Modal>

      <Modal open={!!delForm} onClose={() => setDelForm(null)} title="Eliminar formulario" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDelForm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminarForm} disabled={busy}>Eliminar formulario (afecta a todos)</Button>
        </div>
      }>
        <p>Vas a eliminar el formulario <b>{delForm?.nombre}</b>.</p>
        <p className="text-sm text-jg-texto/70 mt-2">
          Atención: como la relación Form ↔ TipoMaquina es 1 a 1 (sección 6.3), esta acción afecta a <b>TODOS</b> los equipos que comparten este tipo. Los Registros históricos se conservan (baja lógica).
        </p>
        <div className="mt-3 flex justify-end">
          <button onClick={() => { setDelForm(null); setDelEquipo({ id: delForm.equipoIdEjemplo, nombre: delForm.nombre }); }} className="text-xs text-jg-secundario hover:underline">
            Prefiero eliminar solo un equipo puntual
          </button>
        </div>
      </Modal>

      <QrModal equipo={qr} onClose={() => setQr(null)} onRegenerado={(eq) => { setQr(eq); load(); }} />
    </DashboardLayout>
  );
}
