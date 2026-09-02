import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, GripVertical, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Buscador from '../components/Buscador.jsx';
import { api } from '../services/api.js';
import { useUI } from '../contexts/UIContext.jsx';

// Sección 7.4: ABM de Forms + reordenamiento de preguntas.
export default function FormsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useUI();
  const nav = useNavigate();

  async function load() {
    const data = await api(`/forms${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    setItems(data);
  }
  useEffect(() => { load().catch(() => {}); }, [q]);

  function openEdit(form) {
    setEdit(form ? {
      id: form.id,
      tipo_maquina_id: form.tipo_maquina_id,
      tipo_maquina: form.tipo_maquina,
      preguntas: form.preguntas.map((p, i) => ({ ...p, _key: i })),
    } : { preguntas: [] });
  }

  function mover(idx, delta) {
    const arr = [...edit.preguntas];
    const t = idx + delta;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setEdit({ ...edit, preguntas: arr });
  }

  async function guardar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        preguntas: edit.preguntas.map(p => ({
          texto: p.texto.trim(),
          tipo_dato: p.tipo_dato,
          obligatoria: !!p.obligatoria,
        })),
      };
      if (edit.id) await api(`/forms/${edit.id}`, { method: 'PUT', body });
      showToast('Guardado.', 'success');
      setEdit(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  async function eliminar() {
    setBusy(true);
    try {
      await api(`/forms/${del.id}`, { method: 'DELETE' });
      showToast('Eliminado.', 'success');
      setDel(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <DashboardLayout
      title="Form"
      actions={<Button variant="secondary" size="sm" onClick={() => nav('/inicio')}><ArrowLeft size={16} /> Volver</Button>}
    >
      <div className="mb-4">
        <Buscador placeholder="Buscar formulario…" onBuscar={setQ} />
      </div>

      <div className="bg-white rounded-lg shadow table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-jg-fondoSuave text-jg-primario">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Preguntas</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={3} className="text-center text-jg-texto/60 py-6">Sin resultados.</td></tr>}
            {items.map(it => (
              <tr key={it.id} className="border-t hover:bg-jg-fondoSuave/40">
                <td className="px-4 py-2">{it.nombre}</td>
                <td className="px-4 py-2">{it.preguntas.length}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => openEdit(it)} className="text-jg-secundario hover:underline"><Edit2 size={16} /></button>
                  <button onClick={() => setDel(it)}     className="text-jg-error hover:underline"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Editar Form: ${edit.tipo_maquina}` : 'Form'} maxWidth="max-w-2xl">
        <form onSubmit={guardar} className="space-y-3">
          <div className="text-sm text-jg-texto/70">Tipo de máquina: <b>{edit?.tipo_maquina}</b> (autogenerado, no editable)</div>

          <div className="space-y-2 max-h-96 overflow-auto pr-1">
            {edit?.preguntas.map((p, idx) => (
              <div key={p._key} className="flex items-center gap-2 border rounded p-2 bg-white">
                <div className="flex flex-col">
                  <button type="button" onClick={() => mover(idx, -1)} className="text-xs text-jg-texto/60 px-1">▲</button>
                  <GripVertical size={14} className="text-jg-texto/40" />
                  <button type="button" onClick={() => mover(idx, +1)} className="text-xs text-jg-texto/60 px-1">▼</button>
                </div>
                <span className="text-xs text-jg-texto/60 w-6 text-center">{idx + 1}</span>
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  value={p.texto}
                  onChange={(e) => {
                    const arr = [...edit.preguntas];
                    arr[idx] = { ...arr[idx], texto: e.target.value };
                    setEdit({ ...edit, preguntas: arr });
                  }}
                  placeholder="Texto de la pregunta"
                  required
                />
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={p.tipo_dato}
                  onChange={(e) => {
                    const arr = [...edit.preguntas];
                    arr[idx] = { ...arr[idx], tipo_dato: e.target.value };
                    setEdit({ ...edit, preguntas: arr });
                  }}
                >
                  <option value="BOOLEAN">Sí/No</option>
                  <option value="STRING">Texto</option>
                  <option value="INT">Número entero</option>
                </select>
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={!!p.obligatoria}
                    onChange={(e) => {
                      const arr = [...edit.preguntas];
                      arr[idx] = { ...arr[idx], obligatoria: e.target.checked };
                      setEdit({ ...edit, preguntas: arr });
                    }} />
                  Oblig.
                </label>
                <button type="button"
                  onClick={() => setEdit({ ...edit, preguntas: edit.preguntas.filter((_, i) => i !== idx) })}
                  className="text-jg-error p-1" title="Eliminar pregunta">
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="secondary"
            onClick={() => setEdit({ ...edit, preguntas: [...edit.preguntas, { _key: Date.now(), texto: '', tipo_dato: 'BOOLEAN', obligatoria: true }] })}>
            <Plus size={16} /> Agregar pregunta
          </Button>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button type="submit" disabled={busy || (edit?.preguntas?.length ?? 0) === 0}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Eliminar" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDel(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar} disabled={busy}>Eliminar</Button>
        </div>
      }>
        <p>¿Eliminar el formulario <b>{del?.nombre}</b>?</p>
        <p className="text-sm text-jg-texto/70 mt-2">Baja lógica. Los Registros históricos se conservan (sección 7.4).</p>
      </Modal>
    </DashboardLayout>
  );
}
