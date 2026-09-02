import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';

import LoginPage from './pages/LoginPage.jsx';
import InicioPage from './pages/InicioPage.jsx';
import MaquinasPage from './pages/MaquinasPage.jsx';
import FormsPage from './pages/FormsPage.jsx';
import EquiposPage from './pages/EquiposPage.jsx';
import PersonalPage from './pages/PersonalPage.jsx';
import ReportesPage from './pages/ReportesPage.jsx';
import RelevarPage from './pages/RelevarPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Login y wizard de carga son las únicas rutas accesibles sin sesión. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/relevar/:token" element={<RelevarPage />} />

      {/* Resto requiere sesión. */}
      <Route path="/inicio"   element={<RequireAuth roles={['Supervisor', 'Administrador']}><InicioPage /></RequireAuth>} />
      <Route path="/maquinas" element={<RequireAuth roles={['Supervisor', 'Administrador']}><MaquinasPage /></RequireAuth>} />
      <Route path="/forms"    element={<RequireAuth roles={['Supervisor', 'Administrador']}><FormsPage /></RequireAuth>} />
      <Route path="/equipos"  element={<RequireAuth roles={['Supervisor', 'Administrador']}><EquiposPage /></RequireAuth>} />
      <Route path="/personal" element={<RequireAuth roles={['Supervisor', 'Administrador']}><PersonalPage /></RequireAuth>} />
      <Route path="/reportes" element={<RequireAuth roles={['Supervisor', 'Administrador']}><ReportesPage /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
