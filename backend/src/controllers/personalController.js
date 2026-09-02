import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { ROLES_VALIDOS, ROLES } from '../utils/enums.js';

// GET /api/personal?q=
// Solo Administrador (ruta con requirePermiso('abm-personal')).
export async function listar(req, res) {
  const q = (req.query.q || '').toString().trim();
  const where = {};
  if (q) {
    where.OR = [
      { nombre:   { contains: q } },
      { apellido: { contains: q } },
      { username: { contains: q } },
    ];
  }
  const items = await prisma.personal.findMany({ where, orderBy: [{ activo: 'desc' }, { apellido: 'asc' }, { nombre: 'asc' }] });
  res.json(items.map(strip));
}

function strip(p) {
  return { id: p.id, nombre: p.nombre, apellido: p.apellido, username: p.username, rol: p.rol, activo: p.activo, fecha_creacion: p.fechaCreacion };
}

function normUsername(nombre, apellido) {
  return `${nombre} ${apellido}`.trim().toLowerCase().replace(/\s+/g, '');
}

// POST /api/personal
export async function crear(req, res) {
  const nombre   = (req.body?.nombre || '').toString().trim();
  const apellido = (req.body?.apellido || '').toString().trim();
  const rol      = (req.body?.rol || '').toString();
  const password = (req.body?.password || '').toString();

  if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son obligatorios.' });
  if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });

  const username = normUsername(nombre, apellido);
  const existe = await prisma.personal.findUnique({ where: { username } });
  if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese nombre y apellido.' });

  const hash = bcrypt.hashSync(password, 10);
  const p = await prisma.personal.create({
    data: { nombre, apellido, username, rol, contrasenaHash: hash, activo: true },
  });
  res.status(201).json(strip(p));
}

// PUT /api/personal/:id
// password opcional: si llega vacía, no se modifica (sección 7.6).
export async function editar(req, res) {
  const id = Number(req.params.id);
  const p = await prisma.personal.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: 'No encontrado.' });

  const data = {};
  if (req.body?.nombre)   data.nombre   = String(req.body.nombre).trim();
  if (req.body?.apellido) data.apellido = String(req.body.apellido).trim();
  if (req.body?.rol) {
    if (!ROLES_VALIDOS.includes(req.body.rol)) return res.status(400).json({ error: 'Rol inválido.' });
    data.rol = req.body.rol;
  }

  // Recalcular username si cambió nombre o apellido.
  if (data.nombre || data.apellido) {
    const nuevoNombre   = data.nombre   ?? p.nombre;
    const nuevoApellido = data.apellido ?? p.apellido;
    const nuevoUsername = normUsername(nuevoNombre, nuevoApellido);
    if (nuevoUsername !== p.username) {
      const dup = await prisma.personal.findFirst({ where: { username: nuevoUsername, NOT: { id } } });
      if (dup) return res.status(409).json({ error: 'Ya existe otro usuario con ese nombre y apellido.' });
      data.username = nuevoUsername;
    }
  }

  if (typeof req.body?.password === 'string' && req.body.password.length > 0) {
    if (req.body.password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
    data.contrasenaHash = bcrypt.hashSync(req.body.password, 10);
  }

  // No permitir que el único Administrador se cambie a sí mismo a otro rol o se desactive.
  if ((data.rol && data.rol !== ROLES.ADMINISTRADOR && p.rol === ROLES.ADMINISTRADOR) ||
      (req.body?.activo === false && p.rol === ROLES.ADMINISTRADOR)) {
    const otros = await prisma.personal.count({
      where: { rol: ROLES.ADMINISTRADOR, activo: true, NOT: { id } },
    });
    if (otros === 0) {
      return res.status(409).json({ error: 'Debe quedar al menos un Administrador activo.' });
    }
  }
  if (typeof req.body?.activo === 'boolean') data.activo = req.body.activo;

  const updated = await prisma.personal.update({ where: { id }, data });
  res.json(strip(updated));
}

// DELETE /api/personal/:id   baja lógica (sección 7.6).
export async function eliminar(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(409).json({ error: 'No podés eliminarte a vos mismo.' });
  const p = await prisma.personal.findUnique({ where: { id } });
  if (!p || !p.activo) return res.status(404).json({ error: 'No encontrado.' });

  if (p.rol === ROLES.ADMINISTRADOR) {
    const otros = await prisma.personal.count({
      where: { rol: ROLES.ADMINISTRADOR, activo: true, NOT: { id } },
    });
    if (otros === 0) return res.status(409).json({ error: 'Debe quedar al menos un Administrador activo.' });
  }
  await prisma.personal.update({ where: { id }, data: { activo: false } });
  res.json({ ok: true });
}
