import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, ClipboardList, Truck, Users, FileText, QrCode } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

// Sección 7.2: cards de acceso a cada módulo.
const CARDS = [
  { to: '/relevar/instruccion', label: 'Scanner', Icon: QrCode,       desc: 'Escanear QR de máquina.' },
  { to: '/maquinas', label: 'Máquina',    Icon: Tractor,       desc: 'Tipos de máquina (categorías).' },
  { to: '/forms',    label: 'Form',       Icon: ClipboardList, desc: 'Plantillas de preguntas.' },
  { to: '/equipos',  label: 'Equipo',     Icon: Truck,         desc: 'Máquinas físicas + QR.' },
  { to: '/personal', label: 'Personal',   Icon: Users,         desc: 'Usuarios del sistema.' },
  { to: '/reportes', label: 'Reportes',   Icon: FileText,      desc: 'Historial y exportación.' },
];

export default function InicioPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <DashboardLayout title="Inicio">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.filter(c => !c.soloAdmin || user?.rol === 'Administrador').map(({ to, label, Icon, desc }) => (
          <button
            key={to}
            onClick={() => nav(to)}
            className="bg-white rounded-lg shadow p-5 text-left hover:shadow-md transition group"
          >
            <div className="w-12 h-12 rounded bg-jg-fondoSuave text-jg-primario grid place-content-center mb-3 group-hover:bg-jg-secundario group-hover:text-white transition">
              <Icon size={22} />
            </div>
            <div className="font-semibold text-jg-texto">{label}</div>
            <div className="text-xs text-jg-texto/60 mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </DashboardLayout>
  );
}
