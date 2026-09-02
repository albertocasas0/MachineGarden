import { prisma } from '../utils/prisma.js';
import crypto from 'node:crypto';

const newToken = () => crypto.randomBytes(16).toString('hex');

// GET /api/equipos?q=&tipo=   Agrupado por TipoMaquina (sección 7.5).
export async function listar(req, res) {
  const q = (req.query.q || '').toString().trim();
  const equipos = await prisma.equipo.findMany({
    where: { activo: true },
    orderBy: [{ nombre: 'asc' }],
    include: { form: { include: { tipoMaquina: true } } },
  });
  const filtrados = q
    ? equipos.filter(e => e.nombre.toLowerCase().includes(q.toLowerCase()))
    : equipos;

  // Agrupamos por tipoMaquinaId manteniendo orden de aparición.
  const grupos = new Map();
  for (const e of filtrados) {
    const k = e.form.tipoMaquina.id;
    if (!grupos.has(k)) {
      grupos.set(k, {
        tipo_maquina_id: e.form.tipoMaquina.id,
        tipo_maquina: e.form.tipoMaquina.nombre,
        equipos: [],
      });
    }
    grupos.get(k).equipos.push({
      id: e.id,
      nombre: e.nombre,
      form_id: e.formId,
      qr_token: e.qrToken,
      activo: e.activo,
    });
  }
  res.json(Array.from(grupos.values()));
}

// GET /api/equipos/por-token/:token   Para resolver QR desde el flujo de carga.
// Si está dado de baja, devuelve 410 con mensaje (sección 9).
export async function porToken(req, res) {
  const { token } = req.params;
  const eq = await prisma.equipo.findUnique({
    where: { qrToken: token },
    include: {
      form: {
        include: {
          tipoMaquina: true,
          preguntas: { orderBy: { orden: 'asc' } },
        },
      },
    },
  });
  if (!eq) return res.status(404).json({ error: 'Equipo no encontrado.' });
  if (!eq.activo) return res.status(410).json({ error: 'Este equipo ya no está disponible.' });
  res.json({
    id: eq.id,
    nombre: eq.nombre,
    qr_token: eq.qrToken,
    tipo_maquina: eq.form.tipoMaquina.nombre,
    preguntas: eq.form.preguntas.map(p => ({
      id: p.id,
      texto: p.texto,
      tipo_dato: p.tipoDato,
      orden: p.orden,
      obligatoria: p.obligatoria,
    })),
  });
}

// POST /api/equipos   crea con token generado.
export async function crear(req, res) {
  const nombre = (req.body?.nombre || '').toString().trim();
  const formId = Number(req.body?.form_id);
  if (!nombre || !formId) return res.status(400).json({ error: 'Falta nombre o form_id.' });

  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form || !form.activo) return res.status(404).json({ error: 'Formulario no encontrado.' });

  const equipo = await prisma.equipo.create({
    data: { nombre, formId, qrToken: newToken() },
  });
  res.status(201).json({ id: equipo.id, nombre: equipo.nombre, qr_token: equipo.qrToken });
}

// PUT /api/equipos/:id
export async function editar(req, res) {
  const id = Number(req.params.id);
  const nombre = (req.body?.nombre || '').toString().trim();
  const formId = req.body?.form_id ? Number(req.body.form_id) : null;
  if (!nombre) return res.status(400).json({ error: 'Falta nombre.' });

  const eq = await prisma.equipo.findUnique({ where: { id } });
  if (!eq || !eq.activo) return res.status(404).json({ error: 'No encontrado.' });

  if (formId) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || !form.activo) return res.status(404).json({ error: 'Formulario no encontrado.' });
  }

  await prisma.equipo.update({
    where: { id },
    data: { nombre, ...(formId ? { formId } : {}) },
  });
  res.json({ ok: true });
}

// DELETE /api/equipos/:id   baja lógica.
export async function eliminar(req, res) {
  const id = Number(req.params.id);
  const eq = await prisma.equipo.findUnique({ where: { id } });
  if (!eq || !eq.activo) return res.status(404).json({ error: 'No encontrado.' });
  await prisma.equipo.update({ where: { id }, data: { activo: false } });
  res.json({ ok: true });
}

// POST /api/equipos/:id/regenerar-qr   invalida token anterior (sección 9).
export async function regenerarQr(req, res) {
  const id = Number(req.params.id);
  const eq = await prisma.equipo.findUnique({ where: { id } });
  if (!eq || !eq.activo) return res.status(404).json({ error: 'No encontrado.' });
  const qrToken = newToken();
  await prisma.equipo.update({ where: { id }, data: { qrToken } });
  res.json({ qr_token: qrToken });
}
