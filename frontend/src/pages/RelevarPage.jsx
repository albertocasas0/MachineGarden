import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, CheckCircle2, ArrowLeft, ImagePlus, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';
import Button from '../components/Button.jsx';

// Sección 7.8: wizard de carga vía QR.
export default function RelevarPage() {
  const { token } = useParams();
  const { user, ready, logout } = useAuth();
  const nav = useNavigate();

  const [equipo, setEquipo] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState({}); // { [pregunta_id]: valor }
  const [adjuntos, setAdjuntos] = useState([]);     // [{file, preview, uploadedUrl?}]
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  // Si es Técnico sin token específico → pantalla de instrucción (sección 5.2).
  const esInstruccion = token === 'instruccion';

  // Carga del equipo por token (público). Si no hay sesión, redirige a login con ?next=token.
  useEffect(() => {
    if (!ready) return;
    if (esInstruccion) { setLoading(false); return; }
    if (!user) {
      nav(`/login?next=${encodeURIComponent(token)}`, { replace: true });
      return;
    }
    setLoading(true);
    api(`/equipos/por-token/${token}`)
      .then(setEquipo)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, ready, user, esInstruccion, nav]);

  const preguntas = equipo?.preguntas ?? [];
  const total = preguntas.length;
  const pregunta = preguntas[idx];

  const valor = pregunta ? respuestas[pregunta.id] : undefined;
  const puedeAvanzar = useMemo(() => {
    if (!pregunta) return false;
    if (!pregunta.obligatoria) return true;
    if (pregunta.tipo_dato === 'BOOLEAN') return typeof valor === 'boolean';
    if (pregunta.tipo_dato === 'INT') return valor !== undefined && valor !== '' && !Number.isNaN(Number(valor));
    if (pregunta.tipo_dato === 'STRING') return typeof valor === 'string' && valor.trim() !== '';
    return false;
  }, [pregunta, valor]);

  function setValor(v) {
    if (!pregunta) return;
    setRespuestas(r => ({ ...r, [pregunta.id]: v }));
  }

  function siguiente() {
    if (idx + 1 < total) setIdx(idx + 1);
    else enviar();
  }

  function agregarImagenes(files, origen) {
    const nuevos = Array.from(files).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      origen,
      uploadedUrl: null,
    }));
    setAdjuntos(arr => [...arr, ...nuevos]);
  }

  function quitarAdjunto(i) {
    setAdjuntos(arr => {
      const a = arr[i];
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return arr.filter((_, k) => k !== i);
    });
  }

  async function subirImagenes() {
    const resultados = [];
    for (const a of adjuntos) {
      if (a.uploadedUrl) { resultados.push(a.uploadedUrl); continue; }
      const fd = new FormData();
      fd.append('fotos', a.file);
      const r = await api('/registros/uploads', { method: 'POST', body: fd, isForm: true });
      resultados.push(r.url);
    }
    return resultados;
  }

  async function enviar() {
    setEnviando(true);
    try {
      const urls = await subirImagenes();
      await api('/registros', {
        method: 'POST',
        body: {
          equipo_id: equipo.id,
          preguntas: preguntas.map(p => {
            const v = respuestas[p.id];
            if (p.tipo_dato === 'BOOLEAN') return { pregunta_id: p.id, valor_boolean: v ?? null };
            if (p.tipo_dato === 'INT')      return { pregunta_id: p.id, valor_numero: v !== undefined ? Number(v) : null };
            return { pregunta_id: p.id, valor_texto: v ?? null };
          }),
          imagenes: urls,
        },
      });
      setConfirmado(true);
      // Sección 7.8.1 / 12: logout automático tras confirmar.
      setTimeout(async () => {
        await logout();
        nav('/login', { replace: true });
      }, 2200);
    } catch (e) {
      setErr(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-jg-texto/70">Cargando formulario…</div>;

  // Pantalla de instrucción para Técnico sin QR escaneado.
  if (esInstruccion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-jg-fondoSuave">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-jg-fondoSuave text-jg-primario mx-auto grid place-content-center mb-3">
            <Camera size={28} />
          </div>
          <h1 className="text-lg font-semibold text-jg-primario mb-1">Escaneá el QR de la máquina</h1>
          <p className="text-sm text-jg-texto/70">Para iniciar el control diario necesitás escanear el código QR pegado en la máquina.</p>
          <div className="mt-4"><Button variant="secondary" onClick={() => { logout().then(() => nav('/login', { replace: true })); }}>Cerrar sesión</Button></div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-jg-error mb-2">No se pudo abrir el formulario</h1>
          <p className="text-sm text-jg-texto/70 mb-4">{err}</p>
          <Button onClick={() => nav('/login', { replace: true })}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  if (confirmado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-jg-fondoSuave">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
          <CheckCircle2 size={56} className="text-jg-exito mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-jg-primario mb-1">Información Actualizada</h1>
          <p className="text-sm text-jg-texto/70">Cerrando sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jg-fondoSuave flex flex-col">
      {/* Header mobile del wizard */}
      <div className="bg-jg-primario text-white px-4 py-3 flex items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">{equipo.nombre}</div>
          <div className="text-xs opacity-80">{equipo.tipo_maquina}</div>
        </div>
        <div className="text-xs">Paso {idx + 1} de {total}</div>
      </div>

      <div className="h-1 bg-white">
        <div className="h-full bg-jg-secundario transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <div className="flex-1 flex items-start justify-center p-4">
        <div className="bg-white rounded-lg shadow p-5 w-full max-w-lg">
          <div className="text-xs text-jg-texto/60 mb-1">Pregunta {idx + 1} / {total}</div>
          <h2 className="text-lg font-semibold mb-4">{pregunta.texto}</h2>

          {pregunta.tipo_dato === 'BOOLEAN' && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setValor(true)}
                className={`btn-tap rounded-lg py-4 text-lg font-semibold border-2 transition
                  ${valor === true  ? 'bg-jg-exito border-jg-exito text-white'  : 'bg-white border-gray-300 hover:border-jg-exito'}`}>
                <Check size={20} className="inline mr-1" /> Sí
              </button>
              <button onClick={() => setValor(false)}
                className={`btn-tap rounded-lg py-4 text-lg font-semibold border-2 transition
                  ${valor === false ? 'bg-jg-error border-jg-error text-white' : 'bg-white border-gray-300 hover:border-jg-error'}`}>
                <X size={20} className="inline mr-1" /> No
              </button>
            </div>
          )}

          {pregunta.tipo_dato === 'INT' && (
            <input type="number" inputMode="numeric" autoFocus
              value={valor ?? ''}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border-2 rounded-lg px-3 py-3 text-lg outline-none focus:border-jg-secundario" />
          )}

          {pregunta.tipo_dato === 'STRING' && (
            <input type="text" autoFocus
              value={valor ?? ''}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border-2 rounded-lg px-3 py-3 text-lg outline-none focus:border-jg-secundario" />
          )}

          {/* Adjuntar imágenes en cualquier paso (sección 7.8 / 10). */}
          <div className="mt-5">
            <div className="text-xs text-jg-texto/60 mb-1">Adjuntar imágenes</div>
            <div className="flex flex-wrap gap-2">
              {adjuntos.map((a, i) => (
                <div key={i} className="relative w-20 h-20 rounded overflow-hidden border">
                  <img src={a.preview} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => quitarAdjunto(i)} className="absolute top-0 right-0 bg-black/60 text-white p-0.5">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded border-2 border-dashed border-jg-secundario grid place-content-center text-jg-secundario cursor-pointer hover:bg-jg-fondoSuave">
                <Camera size={20} />
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.length && agregarImagenes(e.target.files, 'CAMARA')} />
              </label>
              <label className="w-20 h-20 rounded border-2 border-dashed border-jg-secundario grid place-content-center text-jg-secundario cursor-pointer hover:bg-jg-fondoSuave">
                <ImagePlus size={20} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files?.length && agregarImagenes(e.target.files, 'GALERIA')} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t p-3 flex justify-between gap-2">
        <Button variant="secondary" onClick={() => nav('/login', { replace: true })}>
          <ArrowLeft size={16} /> Cancelar
        </Button>
        <Button onClick={siguiente} disabled={!puedeAvanzar || enviando}>
          {enviando ? 'Enviando…' : idx + 1 === total ? 'Finalizar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
