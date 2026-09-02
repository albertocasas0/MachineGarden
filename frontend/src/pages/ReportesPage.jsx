import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileDown, Printer, Share2, Trash2, ChevronDown, ChevronRight, Paperclip } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Button from '../components/Button.jsx';
import Buscador from '../components/Buscador.jsx';
import { api, tokenStore } from '../services/api.js';
import { useUI } from '../contexts/UIContext.jsx';

// Sección 7.7: tabla agrupada por TipoMaquina con columnas dinámicas.
// 7.7.1: Exportar PDF/XLSX/DOCX, Imprimir y Compartir.
export default function ReportesPage() {
  const [params] = useSearchParams();
  const equipoId = params.get('equipo') || '';
  const [q, setQ] = useState('');
  const [data, setData] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [del, setDel] = useState(null);
  const { showToast } = useUI();
  const nav = useNavigate();

  async function load() {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (equipoId) sp.set('equipo_id', equipoId);
    const r = await api(`/reportes${sp.toString() ? `?${sp}` : ''}`);
    setData(r);
  }
  useEffect(() => { load().catch(() => {}); }, [equipoId]);

  function exportUrl(ext) {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (equipoId) sp.set('equipo_id', equipoId);
    // Adjuntamos el token para que el backend autorice.
    const t = tokenStore.get();
    return `/api/reportes/export/${ext}?${sp}${t ? `&_t=${t}` : ''}`;
  }

  async function descargar(ext, nombre) {
    try {
      const res = await api(`/reportes/export/${ext}${q || equipoId ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(equipoId ? { equipo_id: equipoId } : {}) })}` : ''}`, { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nombre; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { showToast(e.message, 'error'); }
  }

  function imprimir() {
    // Vista optimizada: nueva ventana con solo las tablas.
    const w = window.open('', '_blank');
    if (!w) return;
    const estilos = `<style>body{font-family:sans-serif;font-size:12px;color:#3A3A3A}
      h2{color:#2F5233;margin-top:18px}table{width:100%;border-collapse:collapse;margin-top:6px}
      th,td{border:1px solid #E8F0E3;padding:4px 6px;text-align:left}
      th{background:#E8F0E3;color:#2F5233}</style>`;
    let html = `<h1>Jardín Ground — Reporte</h1>${estilos}`;
    for (const g of data) {
      if (g.registros.length === 0) continue;
      html += `<h2>${g.tipo_maquina}</h2><table><thead><tr>
        <th>Fecha</th><th>Equipo</th><th>Personal</th>${g.columnas.map(c => `<th>${c.texto}</th>`).join('')}<th>Imgs</th>
        </tr></thead><tbody>`;
      for (const r of g.registros) {
        html += `<tr><td>${fmt(r.fecha_hora)}</td><td>${r.equipo.nombre}</td><td>${r.personal}</td>
          ${g.columnas.map(c => `<td>${valorResp(r.respuestas.find(x => x.preguntaId === c.id), c)}</td>`).join('')}
          <td>${r.imagenes.length ? r.imagenes.length : '-'}</td></tr>`;
      }
      html += '</tbody></table>';
    }
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  }

  async function compartir() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Reporte Jardín Ground', url });
      else { await navigator.clipboard.writeText(url); showToast('Link copiado al portapapeles.', 'success'); }
    } catch {}
  }

  async function eliminar() {
    try {
      await api(`/registros/${del.id}`, { method: 'DELETE' });
      showToast('Registro eliminado.', 'success');
      setDel(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  return (
    <DashboardLayout
      title="Reportes"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => nav('/inicio')}><ArrowLeft size={16} /> Volver</Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Buscador placeholder="Buscar por equipo o personal…" onBuscar={setQ} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => descargar('pdf',  'reporte.pdf')}><FileDown size={16} /> PDF</Button>
          <Button variant="secondary" size="sm" onClick={() => descargar('xlsx', 'reporte.xlsx')}><FileDown size={16} /> Excel</Button>
          <Button variant="secondary" size="sm" onClick={() => descargar('docx', 'reporte.docx')}><FileDown size={16} /> Word</Button>
          <Button variant="secondary" size="sm" onClick={imprimir}><Printer size={16} /> Imprimir</Button>
          <Button variant="secondary" size="sm" onClick={compartir}><Share2 size={16} /> Compartir</Button>
        </div>
      </div>

      <div className="space-y-3">
        {data.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-jg-texto/60">Sin registros.</div>
        )}
        {data.map(g => {
          const isCollapsed = !!collapsed[g.tipo_maquina_id];
          return (
            <div key={g.tipo_maquina_id} className="bg-white rounded-lg shadow overflow-hidden">
              <button onClick={() => setCollapsed(s => ({ ...s, [g.tipo_maquina_id]: !s[g.tipo_maquina_id] }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-jg-fondoSuave text-jg-primario font-semibold">
                <span className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  {g.tipo_maquina} <span className="text-jg-texto/50 font-normal">({g.registros.length})</span>
                </span>
              </button>
              {!isCollapsed && (
                <div className="table-wrap">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-jg-texto/60">
                      <tr>
                        <th className="text-left px-3 py-2">Fecha</th>
                        <th className="text-left px-3 py-2">Equipo</th>
                        <th className="text-left px-3 py-2">Personal</th>
                        {g.columnas.map(c => <th key={c.id} className="text-left px-3 py-2 max-w-[14rem]">{c.texto}</th>)}
                        <th className="text-left px-3 py-2">Imgs</th>
                        <th className="text-right px-3 py-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.registros.length === 0 && (
                        <tr><td colSpan={g.columnas.length + 5} className="text-center text-jg-texto/60 py-3">Sin registros.</td></tr>
                      )}
                      {g.registros.map(r => (
                        <tr key={r.id} className="border-t hover:bg-jg-fondoSuave/40">
                          <td className="px-3 py-2 whitespace-nowrap">{fmt(r.fecha_hora)}</td>
                          <td className="px-3 py-2">{r.equipo.nombre}</td>
                          <td className="px-3 py-2">{r.personal}</td>
                          {g.columnas.map(c => (
                            <td key={c.id} className="px-3 py-2 max-w-[14rem]">
                              <div className="cell-clip" title={String(valorResp(r.respuestas.find(x => x.preguntaId === c.id), c))}>
                                {valorResp(r.respuestas.find(x => x.preguntaId === c.id), c)}
                              </div>
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            {r.imagenes.length > 0 ? (
                              <a href={r.imagenes[0].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-jg-secundario hover:underline">
                                <Paperclip size={14} /> {r.imagenes.length}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setDel(r)} className="text-jg-error hover:underline" title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EliminarReg open={!!del} onClose={() => setDel(null)} onConfirm={eliminar} reg={del} />
    </DashboardLayout>
  );
}

function EliminarReg({ open, onClose, onConfirm, reg }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-5">
          <h2 className="font-semibold mb-2">Eliminar registro</h2>
          <p className="text-sm text-jg-texto/80">¿Eliminar el relevamiento de <b>{reg?.equipo?.nombre}</b> del {fmt(reg?.fecha_hora)}?</p>
        </div>
        <div className="px-5 py-3 border-t bg-jg-fondoSuave/40 flex justify-end gap-2 rounded-b-lg">
          <button onClick={onClose} className="px-3 py-2 text-sm">Cancelar</button>
          <button onClick={onConfirm} className="px-3 py-2 text-sm rounded bg-jg-error text-white">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function fmt(d) {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
function valorResp(r, c) {
  if (!r) return '-';
  if (c.tipo_dato === 'BOOLEAN') return r.valorBoolean === true ? 'Sí' : r.valorBoolean === false ? 'No' : '-';
  if (c.tipo_dato === 'INT')      return r.valorNumero != null ? r.valorNumero : '-';
  return r.valorTexto ?? '-';
}
