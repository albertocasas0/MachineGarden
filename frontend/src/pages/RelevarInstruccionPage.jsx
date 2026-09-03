import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Button from '../components/Button.jsx';
import { QrCode, Camera, X } from 'lucide-react';
import { useUI } from '../contexts/UIContext.jsx';

export default function RelevarInstruccionPage() {
  const nav = useNavigate();
  const { showToast } = useUI();
  const [scanning, setScanning] = useState(false);

  // Inicia el scanner cuando el usuario hace clic en el botón
  const startScan = () => {
    setScanning(true);
    // Usamos un timeout pequeño para asegurarnos que el DOM esté listo
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      });

      scanner.render((decodedText) => {
        // Decodificado exitoso
        console.log('QR Scanned:', decodedText);
        scanner.clear();
        setScanning(false);

        // El texto decodificado debe ser la URL completa: https://.../relevar/token
        // Extraemos el token del final de la URL
        const parts = decodedText.split('/');
        const token = parts[parts.length - 1];

        if (token) {
          showToast('Equipo detectando, iniciando formulario...', 'success');
          nav(`/relevar/${token}`, { replace: true });
        } else {
          showToast('QR no válido.', 'error');
        }
      }, (error) => {
        // Errores de escaneo continuos (se ignoran para no saturar la UI)
      });
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-jg-fondoSuave text-center">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-jg-primario/10 text-jg-primario flex items-center justify-center mb-6">
          <QrCode size={40} />
        </div>

        <h1 className="text-2xl font-bold text-jg-primario mb-4">¡Hola, Técnico!</h1>
        <p className="text-jg-texto/70 mb-8">
          Para comenzar el relevamiento diario, por favor escanea el código QR pegado en la máquina.
        </p>

        {!scanning ? (
          <Button
            variant="primary"
            className="w-full py-4 text-lg flex items-center justify-center gap-2"
            onClick={startScan}
          >
            <Camera size={20} /> Abrir Escáner
          </Button>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div id="reader" className="w-full overflow-hidden rounded-lg border-2 border-jg-primario"></div>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setScanning(false)}
            >
              <X size={18} className="inline mr-1" /> Cancelar
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 text-xs text-jg-texto/50">
        Jardín Ground • Control de Maquinaria v1.0
      </div>
    </div>
  );
}
