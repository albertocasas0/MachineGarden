import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Buscador from '../components/Buscador.jsx';
import { api } from '../services/api.js';
import { useUI } from '../contexts/UIContext.jsx';

// Sección 7.3: ABM de tipos de máquina.
export default function MaquinasPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // null | {} | {id, nombre}
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useUI();
  const nav = useNavigate();

  async function load() {
    const data = await api(`/maquinas${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    setItems(data);
  }
  useEffect(() => { load().catch(() => {}); }, [q]);

  async function guardar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (edit?.id) await api(`/maquinas/${edit.id}`, { method: 'PUT', body: { nombre: edit.nombre } });
      else          await api('/maquinas',           { method: 'POST', body: { nombre: edit.nombre } });
      showToast('Guardado.', 'success');
      setEdit(null);
      load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  }

  async function eliminar() {
    setBusy(true);
    try {
      await api(`/maquinas/${del.id}`, { method: 'DELETE' });
      showToast('Eliminado.', 'success');
      setDel(null);
      load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setBusy(false); }
  }

  return (
    <DashboardLayout
      title="Máquina"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => nav('/inicio')}><ArrowLeft size={16} /> Volver</Button>
          <Button onClick={() => setEdit({})}> <Plus size={16} /> Crear +</Button>
        </>
      }
    >
      <div className="mb-4">
        <Buscador placeholder="Buscar tipo de máquina…" onBuscar={setQ} />
      </div>

      <div className="bg-white rounded-lg shadow table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-jg-fondoSuave text-jg-primario">
            <tr>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Equipos</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={3} className="text-center text-jg-texto/60 py-6">Sin resultados.</td></tr>
            )}
            {items.map(it => (
              <tr key={it.id} className="border-t hover:bg-jg-fondoSuave/40">
                <td className="px-4 py-2">{it.nombre}</td>
                <td className="px-4 py-2">{it.cantidad_equipos ?? 0}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEdit(it)} className="text-jg-secundario hover:underline"><Edit2 size={16} /></button>
                  <button onClick={() => setDel(it)}   className="text-jg-error hover:underline"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar tipo de máquina' : 'Nuevo tipo de máquina'}>
        <form onSubmit={guardar} className="space-y-3">
          <label className="block text-sm font-medium">Nombre
            <input className="w-full border rounded px-3 py-2 mt-1" required autoFocus
              value={edit?.nombre ?? ''} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Eliminar" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDel(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar} disabled={busy}>Eliminar</Button>
        </div>
      }>
        <p>¿Eliminar el tipo de máquina <b>{del?.nombre}</b>?</p>
        <p className="text-sm text-jg-texto/70 mt-2">Se aplicará baja lógica. Los equipos y formularios existentes no se borran físicamente (sección 6.7 / 7.3).</p>
      </Modal>
    </DashboardLayout>
  );
}
