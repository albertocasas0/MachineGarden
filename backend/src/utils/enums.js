// Constantes de valores controlados. SQLite no soporta enums nativos en
// Prisma, así que los definimos acá y los validamos al recibir input.

export const ROLES = Object.freeze({
  TECNICO: 'Tecnico',
  SUPERVISOR: 'Supervisor',
  ADMINISTRADOR: 'Administrador',
});

export const ROLES_VALIDOS = Object.values(ROLES);

// Reglas de la sección 4 (matriz de permisos).
// Devuelve true si el rol tiene permiso para la acción.
export function rolPuede(rol, accion) {
  // 'login' y 'escanear-qr' los puede hacer cualquier rol logueado.
  if (accion === 'login' || accion === 'carga-qr') return true;

  if (accion === 'abm-personal') {
    // ABM de Personal: EXCLUSIVO Administrador (sección 4 y 15).
    return rol === ROLES.ADMINISTRADOR;
  }
  // ABM de Máquina / Form / Equipo + Reportes: solo Supervisor y Administrador.
  if (
    accion === 'abm-maquina' ||
    accion === 'abm-form' ||
    accion === 'abm-equipo' ||
    accion === 'ver-reportes'
  ) {
    return rol === ROLES.SUPERVISOR || rol === ROLES.ADMINISTRADOR;
  }
  return false;
}
