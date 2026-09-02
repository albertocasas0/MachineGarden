import { rolPuede, ROLES } from './src/utils/enums.js';

// Matriz de permisos (sección 4). Lo que debe dar:
const matriz = [
  // [rol, accion, esperado]
  [ROLES.TECNICO,       'login',                   true],
  [ROLES.TECNICO,       'carga-qr',                true],
  [ROLES.TECNICO,       'abm-maquina',             false],
  [ROLES.TECNICO,       'abm-form',                false],
  [ROLES.TECNICO,       'abm-equipo',              false],
  [ROLES.TECNICO,       'ver-reportes',            false],
  [ROLES.TECNICO,       'abm-personal',            false],

  [ROLES.SUPERVISOR,    'login',                   true],
  [ROLES.SUPERVISOR,    'abm-maquina',             true],
  [ROLES.SUPERVISOR,    'abm-form',                true],
  [ROLES.SUPERVISOR,    'abm-equipo',              true],
  [ROLES.SUPERVISOR,    'ver-reportes',            true],
  [ROLES.SUPERVISOR,    'abm-personal',            false], // solo Administrador

  [ROLES.ADMINISTRADOR, 'login',                   true],
  [ROLES.ADMINISTRADOR, 'abm-maquina',             true],
  [ROLES.ADMINISTRADOR, 'abm-form',                true],
  [ROLES.ADMINISTRADOR, 'abm-equipo',              true],
  [ROLES.ADMINISTRADOR, 'ver-reportes',            true],
  [ROLES.ADMINISTRADOR, 'abm-personal',            true],
];

let ok = 0, fail = 0;
for (const [rol, acc, esp] of matriz) {
  const got = rolPuede(rol, acc);
  if (got === esp) { ok++; }
  else { fail++; console.log(`  ✗ ${rol} / ${acc} esperaba ${esp} dio ${got}`); }
}
console.log(`Matriz: ${ok} OK, ${fail} fallaron de ${matriz.length} casos.`);
