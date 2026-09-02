import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUI } from '../contexts/UIContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function DashboardLayout({ children, title, actions }) {
  const { user } = useAuth();
  const { setSidebarOpen } = useUI();

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center px-4 sticky top-0 z-20">
          <button className="lg:hidden p-2 mr-2" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-jg-texto/60">Jardín Ground</div>
            <h1 className="font-semibold text-jg-texto truncate">{title}</h1>
          </div>
          <div className="hidden sm:block text-right text-sm">
            <div className="font-medium">{user?.nombre} {user?.apellido}</div>
            <div className="text-xs text-jg-texto/60">{user?.rol}</div>
          </div>
          <div className="flex items-center gap-2 ml-2">{actions}</div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
