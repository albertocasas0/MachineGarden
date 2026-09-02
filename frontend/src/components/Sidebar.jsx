import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Tractor, ClipboardList, Truck, Users, FileText, LogOut, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUI } from '../contexts/UIContext.jsx';

// Sección 5.1: orden fijo. Solo visible para Supervisor/Administrador (sección 4).
const ITEMS = [
  { to: '/inicio',    label: 'Inicio',     Icon: Home },
  { to: '/maquinas',  label: 'Máquina',    Icon: Tractor },
  { to: '/forms',     label: 'Form',       Icon: ClipboardList },
  { to: '/equipos',   label: 'Equipo',     Icon: Truck },
  { to: '/personal',  label: 'Personal',   Icon: Users },
  { to: '/reportes',  label: 'Reportes',   Icon: FileText },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const nav = useNavigate();

  const onLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const baseCls = 'flex items-center gap-3 px-4 py-3 rounded text-sm transition';
  const linkCls = ({ isActive }) =>
    `${baseCls} ${isActive ? 'bg-jg-fondoSuave text-jg-primario font-semibold' : 'text-jg-texto hover:bg-jg-fondoSuave/60'}`;

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-40
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b">
          <div className="flex items-center gap-2">
            {/* Fallback de texto 'Jardín Ground' según sección 2.1 (logo pendiente). */}
            <div className="w-8 h-8 rounded bg-jg-primario text-white grid place-content-center font-bold">JG</div>
            <span className="font-semibold text-jg-primario">Jardín Ground</span>
          </div>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ITEMS.filter(i => !i.soloAdmin || user?.rol === 'Administrador').map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={linkCls} onClick={() => setSidebarOpen(false)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t">
          <button onClick={onLogout} className={`${baseCls} w-full text-left text-jg-error hover:bg-red-50`}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
