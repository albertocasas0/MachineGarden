import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Button from '../components/Button.jsx';

// Sección 7.1: si llegó con ?next=<qr_token>, redirige al wizard.
export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const next = params.get('next'); // qr_token

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const data = await login({ username, password, next });
      if (data.next_equipo) {
        // Acceso originado por QR (sección 5.2).
        nav(`/relevar/${data.next_equipo.qr_token}`, { replace: true });
      } else if (data.user.rol === 'Tecnico') {
        // Técnico: pantalla de instrucción, no dashboard.
        nav('/relevar/instruccion', { replace: true });
      } else {
        nav('/inicio', { replace: true });
      }
    } catch (e) {
      // Sección 7.1: mensaje inline, sin especificar cuál campo falló.
      setErr('Credenciales inválidas.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-jg-fondoSuave">
      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-lg bg-jg-primario text-white grid place-content-center font-bold text-xl">JG</div>
          <h1 className="text-xl font-semibold text-jg-primario">Jardín Ground</h1>
          {next && <p className="text-xs text-jg-secundario">Iniciá sesión para completar el relevamiento</p>}
        </div>

        <label className="block text-sm font-medium mb-1">Usuario</label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3 outline-none focus:border-jg-secundario"
          required
        />

        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <div className="flex items-stretch border rounded mb-2 focus-within:border-jg-secundario">
          <input
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-3 py-2 outline-none rounded-l"
            required
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="px-3 text-jg-texto/60 hover:text-jg-texto">
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {err && <div className="text-sm text-jg-error bg-red-50 border border-red-200 rounded p-2 mb-3">{err}</div>}

        <Button type="submit" variant="primary" className="w-full justify-center" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </div>
  );
}
