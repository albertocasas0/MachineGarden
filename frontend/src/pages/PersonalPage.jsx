import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Buscador from '../components/Buscador.jsx';
import { api } from '../services/api.js';
import { useUI } from '../contexts/UIContext.jsx';

// Sección 7.6: ABM de usuarios. Solo Administrador (rutas con requirePermiso).
export default function PersonalPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useUI();
  const nav = useNavigate();

  async function load() {
    const r = await api(`/personal${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    setItems(r);
  }
  useEffect(() => { load().catch(() => {}); }, [q]);

  function openNew() { setEdit({ nombre: '', apellido: '', rol: 'Tecnico', password: '' }); }
  function openEdit(p) { setEdit({ ...p, password: '' }); }

  async function guardar(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        nombre: edit.nombre.trim(),
        apellido: edit.apellido.trim(),
        rol: edit.rol,
      };
      if (edit.password) body.password = edit.password;
      if (edit.id) await api(`/personal/${edit.id}`, { method: 'PUT', body });
      else {
        if (!edit.password) { showToast('La contraseña es obligatoria al crear.', 'error'); setBusy(false); return; }
        body.password = edit.password;
        await api('/personal', { method: 'POST', body });
      }
      showToast('Guardado.', 'success');
      setEdit(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  async function eliminar() {
    setBusy(true);
    try {
      await api(`/personal/${del.id}`, { method: 'DELETE' });
      showToast('Eliminado.', 'success');
      setDel(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <DashboardLayout
      title="Personal"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => nav('/inicio')}><ArrowLeft size={16} /> Volver</Button>
          <Button onClick={openNew}><Plus size={16} /> Crear +</Button>
        </>
      }
    >
      <div className="mb-4"><Buscador placeholder="Buscar por nombre, apellido o usuario…" onBuscar={setQ} /></div>

      <div className="bg-white rounded-lg shadow table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-jg-fondoSuave text-jg-primario">
            <tr>
              <th className="text-left px-4 py-2">Nombre y Apellido</th>
              <th className="text-left px-4 py-2">Usuario</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="text-center text-jg-texto/60 py-6">Sin resultados.</td></tr>}
            {items.map(p => (
              <tr key={p.id} className={`border-t ${p.activo ? 'hover:bg-jg-fondoSuave/40' : 'opacity-60'}`}>
                <td className="px-4 py-2">{p.nombre} {p.apellido}</td>
                <td className="px-4 py-2 text-jg-texto/70">{p.username}</td>
                <td className="px-4 py-2">{p.rol}</td>
                <td className="px-4 py-2">{p.activo ? <span className="text-jg-exito">Activo</span> : <span className="text-jg-error">Inactivo</span>}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="text-jg-secundario hover:underline"><Edit2 size={16} /></button>
                  <button onClick={() => setDel(p)}    className="text-jg-error hover:underline"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar personal' : 'Nuevo personal'}>
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-medium">Nombre
              <input className="w-full border rounded px-3 py-2 mt-1" required
                value={edit?.nombre ?? ''} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">Apellido
              <input className="w-full border rounded px-3 py-2 mt-1" required
                value={edit?.apellido ?? ''} onChange={(e) => setEdit({ ...edit, apellido: e.target.value })} />
            </label>
          </div>
          <label className="block text-sm font-medium">Rol
            <select className="w-full border rounded px-3 py-2 mt-1" required
              value={edit?.rol ?? 'Tecnico'} onChange={(e) => setEdit({ ...edit, rol: e.target.value })}>
              <option value="Tecnico">Técnico</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Administrador">Administrador</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Contraseña {edit?.id && <span className="text-xs text-jg-texto/60">(dejar vacía para no cambiar)</span>}
            <input type="password" autoComplete="new-password" className="w-full border rounded px-3 py-2 mt-1"
              value={edit?.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              required={!edit?.id} minLength={4} />
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Eliminar personal" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDel(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar} disabled={busy}>Eliminar</Button>
        </div>
      }>
        <p>¿Eliminar a <b>{del?.nombre} {del?.apellido}</b>?</p>
        <p className="text-sm text-jg-texto/70 mt-2">Baja lógica. La persona no podrá loguearse pero se conserva como autor en los Registros históricos.</p>
      </Modal>
    </DashboardLayout>
  );
}
