import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

// Guardia: redirige a /login si no hay sesión.
// Si se pasan roles permitidos, filtra.
export default function RequireAuth({ children, roles }) {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) return <div className="p-6 text-center text-jg-texto/60">Cargando…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/inicio" replace />;
  return children;
}
