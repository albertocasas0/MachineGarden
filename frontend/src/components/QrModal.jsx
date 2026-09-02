import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Share2, RefreshCw, QrCode as QrIcon } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { api } from '../services/api.js';
import { useUI } from '../contexts/UIContext.jsx';

// Modal de QR (sección 9): generar, descargar PNG, imprimir, compartir y regenerar.
export default function QrModal({ equipo, onClose, onRegenerado }) {
  const [qrUrl, setQrUrl] = useState('');
  const [pngUrl, setPngUrl] = useState('');
  const [pngBlob, setPngBlob] = useState(null);
  const canvasRef = useRef(null);
  const { showToast } = useUI();

  // Pedimos la URL codificada al backend (que ya la conoce desde APP_BASE_URL).
  // Luego dibujamos el QR en un canvas para descarga/impresión local sin red.
  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const { url } = await api(`/equipos/${equipo.id}/qr-link`);
        if (cancel) return;
        setQrUrl(url);
        // Dibuja en el canvas. Si falla (canvas nulo, etc.) seguimos: los
        // botones de Descargar/Imprimir/Compartir pueden usar la URL del
        // backend como fallback para que el modal nunca quede "muerto".
        try {
          await QRCode.toCanvas(canvasRef.current, url, { width: 320, margin: 2 });
        } catch (_) { /* canvas falló, no bloquea el resto */ }
        if (cancel) return;
        // Genera el blob local para descarga/imprimir/compartir.
        let blob = null;
        try { blob = await QRCode.toBlob(url, { type: 'png', width: 512, margin: 2 }); }
        catch (_) { /* idem */ }
        if (cancel) return;
        if (blob) {
          setPngBlob(blob);
          setPngUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        } else {
          // Fallback: pedimos el PNG al backend (sección 9).
          try {
            const token = localStorage.getItem('jg_token') || '';
            const r = await fetch(`/api/equipos/${equipo.id}/qr?format=png`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (r.ok) {
              const b = await r.blob();
              if (cancel) return;
              setPngBlob(b);
              setPngUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b); });
            }
          } catch (_) { /* sin fallback, los botones quedan deshabilitados */ }
        }
      } catch (e) {
        showToast(e.message || 'No se pudo generar el QR.', 'error');
      }
    }
    if (equipo) load();
    return () => { cancel = true; };
  }, [equipo]);

  async function descargar() {
    if (!pngBlob) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `qr-${equipo.nombre.replace(/\s+/g, '_')}.png`;
    a.click();
  }

  function imprimir() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR ${equipo.nombre}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:20px}
      img{width:320px;height:320px}.nom{font-size:22px;margin-top:14px;font-weight:600}</style></head>
      <body><img src="${pngUrl}"><div class="nom">${equipo.nombre}</div>
      <script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
  }

  async function compartir() {
    try {
      const file = new File([pngBlob], `qr-${equipo.nombre}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `QR ${equipo.nombre}`, text: qrUrl, files: [file] });
      } else {
        await navigator.clipboard.writeText(qrUrl);
        showToast('Link copiado al portapapeles.', 'success');
      }
    } catch (e) {
      // El usuario canceló o el navegador no soporta. No es error.
    }
  }

  async function regenerar() {
    if (!confirm('¿Regenerar el QR? El QR físico viejo dejará de funcionar.')) return;
    try {
      const { qr_token } = await api(`/equipos/${equipo.id}/regenerar-qr`, { method: 'POST' });
      showToast('QR regenerado.', 'success');
      onRegenerado?.({ ...equipo, qr_token });
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  return (
    <Modal open={!!equipo} onClose={onClose} title={<> <QrIcon size={18} className="inline" /> QR · {equipo?.nombre}</>}>
      <div className="flex flex-col items-center">
        <canvas ref={canvasRef} className="border bg-white" />
        <div className="mt-3 text-sm text-jg-texto/70 break-all max-w-sm text-center">{qrUrl}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <Button variant="secondary" onClick={descargar} disabled={!pngBlob}><Download size={16} /> Descargar</Button>
        <Button variant="secondary" onClick={imprimir}  disabled={!pngBlob}><Printer size={16} /> Imprimir</Button>
        <Button variant="secondary" onClick={compartir} disabled={!pngBlob}><Share2 size={16} /> Compartir</Button>
        <Button variant="warn"     onClick={regenerar}><RefreshCw size={16} /> Regenerar</Button>
      </div>
    </Modal>
  );
}
