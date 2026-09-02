import { prisma } from '../utils/prisma.js';

// GET /api/maquinas/tipos   listado liviano para selectores (Form).
export async function listarTiposLigeros(_req, res) {
  const tipos = await prisma.tipoMaquina.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true },
  });
  res.json(tipos);
}

// GET /api/maquinas?q=  Buscador dispara en lupa/Enter, no por tecla (sección 7.3).
export async function listar(req, res) {
  const q = (req.query.q || '').toString().trim();
  const where = { activo: true };
  if (q) where.nombre = { contains: q };
  const tipos = await prisma.tipoMaquina.findMany({
    where,
    orderBy: { nombre: 'asc' },
    include: {
      _count: { select: { forms: true } },
    },
  });
  // Incluimos flag "tieneEquipos" para advertencia al eliminar (sección 7.3).
  const ids = tipos.map(t => t.id);
  const counts = await prisma.equipo.groupBy({
    by: ['formId'],
    _count: { _all: true },
    where: { activo: true },
  });
  const formsPorTipo = new Map();
  for (const c of counts) formsPorTipo.set(c.formId, c._count._all);
  const forms = await prisma.form.findMany({
    where: { tipoMaquinaId: { in: ids } },
    select: { id: true, tipoMaquinaId: true },
  });
  const equiposPorTipo = new Map();
  for (const f of forms) {
    equiposPorTipo.set(f.tipoMaquinaId, formsPorTipo.get(f.id) || 0);
  }
  res.json(tipos.map(t => ({
    id: t.id,
    nombre: t.nombre,
    fecha_creacion: t.fechaCreacion,
    cantidad_equipos: equiposPorTipo.get(t.id) || 0,
  })));
}

// POST /api/maquinas
export async function crear(req, res) {
  const nombre = (req.body?.nombre || '').toString().trim();
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });

  const existe = await prisma.tipoMaquina.findUnique({ where: { nombre } });
  if (existe) return res.status(409).json({ error: 'Ya existe un tipo de máquina con ese nombre.' });

  const tipo = await prisma.tipoMaquina.create({ data: { nombre } });

  // Crear Form 1 a 1 asociado (sección 6.3) para mantener invariante.
  await prisma.form.create({
    data: { tipoMaquinaId: tipo.id, nombre: tipo.nombre },
  });

  res.status(201).json({ id: tipo.id, nombre: tipo.nombre });
}

// PUT /api/maquinas/:id
export async function editar(req, res) {
  const id = Number(req.params.id);
  const nombre = (req.body?.nombre || '').toString().trim();
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });

  const tipo = await prisma.tipoMaquina.findUnique({ where: { id } });
  if (!tipo || !tipo.activo) return res.status(404).json({ error: 'No encontrado.' });

  const colision = await prisma.tipoMaquina.findFirst({
    where: { nombre, NOT: { id } },
  });
  if (colision) return res.status(409).json({ error: 'Ya existe un tipo de máquina con ese nombre.' });

  await prisma.tipoMaquina.update({ where: { id }, data: { nombre } });
  // Cascada al Form asociado (sección 7.3).
  await prisma.form.updateMany({
    where: { tipoMaquinaId: id },
    data: { nombre },
  });
  res.json({ id, nombre });
}

// DELETE /api/maquinas/:id  → baja lógica (sección 6.7).
export async function eliminar(req, res) {
  const id = Number(req.params.id);
  const tipo = await prisma.tipoMaquina.findUnique({ where: { id } });
  if (!tipo || !tipo.activo) return res.status(404).json({ error: 'No encontrado.' });

  await prisma.tipoMaquina.update({ where: { id }, data: { activo: false } });
  res.json({ ok: true });
}
