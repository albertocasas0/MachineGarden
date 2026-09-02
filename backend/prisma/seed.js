// Seed - App Jardín Ground
// Carga todos los datos semilla según secciones 6 y 17 del documento:
//  - 1 admin inicial (Alberto Casas / 'celestial' hasheada)
//  - 6 TipoMaquina
//  - 6 Form (uno por TipoMaquina) con sus preguntas (orden exacto)
//  - 24 Equipos distribuidos en los 6 TipoMaquina
//  - Personal de prueba con rol Técnico (sección 14, ver ⚠ sección 16 sobre
//    la columna 'Empleado' del Excel del cliente)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// Hasheamos la contraseña 'celestial' NUNCA en texto plano (sección 8).
const HASH_CELESTIAL = bcrypt.hashSync('celestial', 10);

// Genera un qr_token aleatorio (sección 9: no exponer IDs secuenciales).
const newToken = () => crypto.randomBytes(16).toString('hex');

async function main() {
  console.log('� Iniciando seed...');

  // ---- 6.1 Personal ----
  // Admin semilla (sección 6.1). Username = nombre+apellido normalizado.
  const admin = await prisma.personal.upsert({
    where: { username: 'alberto-casas' },
    update: {},
    create: {
      nombre: 'Alberto',
      apellido: 'Casas',
      username: 'alberto-casas',
      rol: 'Administrador',
      contrasenaHash: HASH_CELESTIAL,
      activo: true,
    },
  });
  console.log(`  ✓ Admin: ${admin.nombre} ${admin.apellido} (${admin.rol})`);

  // Personal de prueba (sección 14), todos con rol Técnico por defecto.
  const TECNICOS = [
    { nombre: 'Patricio', apellido: 'Crespo' },
    { nombre: 'Ruben',    apellido: 'Osorio' },
    { nombre: 'Wilfrido', apellido: 'Vega' },
    { nombre: 'Andres',   apellido: 'Britez' },
    { nombre: 'Osvaldo',  apellido: 'Cruz' },
    { nombre: 'Joseph',   apellido: 'Riera' },
    { nombre: 'Aguirre',  apellido: 'Alejandro' },
  ];
  for (const t of TECNICOS) {
    const username = `${t.nombre}-${t.apellido}`.toLowerCase();
    await prisma.personal.upsert({
      where: { username },
      update: {},
      create: {
        nombre: t.nombre,
        apellido: t.apellido,
        username,
        rol: 'Tecnico',
        contrasenaHash: HASH_CELESTIAL, // mismo seed password; el admin lo cambia
        activo: true,
      },
    });
  }
  console.log(`  ✓ ${TECNICOS.length} técnicos de prueba`);

  // ---- 6.2 TipoMaquina + 6.3 Form + Preguntas (sección 17) ----
  const TIPOS_Y_PREGUNTAS = [
    {
      nombre: 'Tractores',
      preguntas: [
        { orden: 1, texto: '¿Enciende correctamente?',                tipoDato: 'BOOLEAN' },
        { orden: 2, texto: '¿La presión de neumáticos es correcta?',   tipoDato: 'BOOLEAN' },
        { orden: 3, texto: '¿La medida de aceite es correcta?',       tipoDato: 'BOOLEAN' },
        { orden: 4, texto: '¿La dirección funciona de manera correcta?', tipoDato: 'BOOLEAN' },
        { orden: 5, texto: '¿Ha verificado la altura de corte?',      tipoDato: 'BOOLEAN' },
        { orden: 6, texto: '¿Ha verificado el tanque de nafta?',       tipoDato: 'BOOLEAN' },
        { orden: 7, texto: '¿La limpieza de la máquina es correcta?', tipoDato: 'BOOLEAN' },
        { orden: 8, texto: 'Cantidad de horas de uso hasta el momento', tipoDato: 'INT' },
      ],
      equipos: ['Tractor 740', 'Tractor 750', 'Tractor 350', 'Tractor H'],
    },
    {
      nombre: 'Bordeadoras',
      preguntas: [
        { orden: 1, texto: '¿La máquina enciende correctamente?',     tipoDato: 'BOOLEAN' },
        { orden: 2, texto: '¿Ha verificado el tanque de nafta?',       tipoDato: 'BOOLEAN' },
        { orden: 3, texto: '¿La limpieza de la máquina es correcta?', tipoDato: 'BOOLEAN' },
      ],
      equipos: ['Bordeadora 1', 'Bordeadora 2', 'Bordeadora 3', 'Bordeadora 4', 'Bordeadora 5'],
    },
    {
      nombre: 'Cuatro ruedas toritos',
      preguntas: [
        { orden: 1, texto: '¿Enciende correctamente?',                tipoDato: 'BOOLEAN' },
        { orden: 2, texto: '¿Verificó la altura de corte?',           tipoDato: 'BOOLEAN' },
        { orden: 3, texto: '¿La limpieza de la máquina es correcta?', tipoDato: 'BOOLEAN' },
        { orden: 4, texto: '¿Ha verificado el tanque de nafta?',       tipoDato: 'BOOLEAN' },
      ],
      equipos: ['Toro 1', 'Toro 2', 'Toro 3'],
    },
    {
      nombre: 'Sopladora',
      preguntas: [
        { orden: 1, texto: '¿La máquina enciende correctamente?',     tipoDato: 'BOOLEAN' },
        { orden: 2, texto: '¿Ha verificado el tanque de nafta?',       tipoDato: 'BOOLEAN' },
        { orden: 3, texto: '¿La limpieza de la máquina es correcta?', tipoDato: 'BOOLEAN' },
      ],
      equipos: ['Sopladora 1', 'Sopladora 2', 'Sopladora 3', 'Sopladora 4', 'Sopladora 5', 'Sopladora 6'],
    },
    {
      nombre: 'Moto cierra',
      preguntas: [
        { orden: 1, texto: '¿Enciende correctamente?',                tipoDato: 'BOOLEAN' },
        { orden: 2, texto: '¿Ha verificado el aceite de cadena?',      tipoDato: 'BOOLEAN' },
        { orden: 3, texto: '¿La limpieza de la máquina es correcta?', tipoDato: 'BOOLEAN' },
        { orden: 4, texto: '¿Ha verificado el tanque de nafta?',       tipoDato: 'BOOLEAN' },
      ],
      equipos: ['Motocierra 1', 'Motocierra 2', 'Motocierra 3'],
    },
    {
      nombre: 'Corta Cetos',
      preguntas: [
        { orden: 1, texto: '¿Enciende correctamente?',                tipoDato: 'BOOLEAN' },
        { orden: 2, texto: '¿La limpieza de la máquina es correcta?', tipoDato: 'BOOLEAN' },
        { orden: 3, texto: '¿Ha verificado el tanque de nafta?',       tipoDato: 'BOOLEAN' },
      ],
      equipos: ['Corta cetos 1', 'Corta cetos 2', 'Corta cetos 3'],
    },
  ];

  for (const def of TIPOS_Y_PREGUNTAS) {
    const tipo = await prisma.tipoMaquina.upsert({
      where: { nombre: def.nombre },
      update: {},
      create: { nombre: def.nombre, activo: true },
    });

    // Form 1 a 1 con TipoMaquina. Nombre autogenerado igual al tipo.
    const form = await prisma.form.upsert({
      where: { tipoMaquinaId: tipo.id },
      update: { nombre: tipo.nombre },
      create: { tipoMaquinaId: tipo.id, nombre: tipo.nombre, activo: true },
    });

    // Preguntas: si ya existen, no las duplicamos; si no, las creamos.
    for (const p of def.preguntas) {
      const existe = await prisma.pregunta.findFirst({
        where: { formId: form.id, orden: p.orden },
      });
      if (!existe) {
        await prisma.pregunta.create({
          data: { ...p, formId: form.id, obligatoria: true },
        });
      }
    }

    // Equipos. Si ya existe el nombre, no duplicamos; le asignamos su token.
    for (const nombreEquipo of def.equipos) {
      const existe = await prisma.equipo.findFirst({ where: { nombre: nombreEquipo } });
      if (!existe) {
        await prisma.equipo.create({
          data: {
            nombre: nombreEquipo,
            formId: form.id,
            qrToken: newToken(),
            activo: true,
          },
        });
      }
    }
    console.log(`  ✓ TipoMaquina "${def.nombre}" → ${def.preguntas.length} preguntas, ${def.equipos.length} equipos`);
  }

  console.log('✅ Seed completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
