import { prisma } from '../utils/prisma.js';
import path from 'node:path';
import fs from 'node:fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// POST /api/registros   crea Registro + Respuestas en una transacción.
// Body: { equipo_id, preguntas: [{pregunta_id, valor_boolean?, valor_texto?, valor_numero?}], imagenes?: [urls] }
// Reglas: requiere sesión (cualquier rol logueado), sección 7.8.
export async function crear(req, res) {
  const { equipo_id, preguntas, imagenes } = req.body || {};
  if (!equipo_id) return res.status(400).json({ error: 'Falta equipo_id.' });
  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    return res.status(400).json({ error: 'Sin respuestas.' });
  }

  const equipo = await prisma.equipo.findUnique({ where: { id: Number(equipo_id) } });
  if (!equipo || !equipo.activo) return res.status(404).json({ error: 'Equipo no disponible.' });

  // Validamos que cada pregunta pertenezca al Form del equipo.
  const form = await prisma.form.findUnique({
    where: { id: equipo.formId },
    include: { preguntas: true },
  });
  const idsValidos = new Set(form.preguntas.map(p => p.id));
  for (const r of preguntas) {
    if (!idsValidos.has(Number(r.pregunta_id))) {
      return res.status(400).json({ error: `Pregunta ${r.pregunta_id} no pertenece al equipo.` });
    }
  }

  // Creamos el Registro y todas sus Respuestas en una transacción (sección 8: integridad).
  const registro = await prisma.$transaction(async (tx) => {
    const reg = await tx.registro.create({
      data: {
        equipoId: equipo.id,
        personalId: req.user.id,
      },
    });
    await tx.respuesta.createMany({
      data: preguntas.map(r => ({
        registroId: reg.id,
        preguntaId: Number(r.pregunta_id),
        valorBoolean: r.valor_boolean ?? null,
        valorTexto:   r.valor_texto ?? null,
        valorNumero:  r.valor_numero ?? null,
      })),
    });
    if (Array.isArray(imagenes) && imagenes.length > 0) {
      await tx.imagenAdjunta.createMany({
        data: imagenes.map(url => ({
          registroId: reg.id,
          url,
          origen: 'GALERIA', // el front etiqueta CAMARA/GALERIA, simplificamos acá
        })),
      });
    }
    return reg;
  });

  res.status(201).json({ id: registro.id, fecha_hora: registro.fechaHora });
}

// DELETE /api/registros/:id   acción de la columna 'Acción' en Reportes (sección 7.7).
export async function eliminar(req, res) {
  const id = Number(req.params.id);
  const reg = await prisma.registro.findUnique({ where: { id } });
  if (!reg) return res.status(404).json({ error: 'No encontrado.' });
  await prisma.$transaction([
    prisma.imagenAdjunta.deleteMany({ where: { registroId: id } }),
    prisma.respuesta.deleteMany({   where: { registroId: id } }),
    prisma.registro.delete({ where: { id } }),
  ]);
  res.json({ ok: true });
}
export async function obtener(req, res) {
  const id = Number(req.params.id);
  const reg = await prisma.registro.findUnique({
    where: { id },
    include: {
      equipo: { include: { form: { include: { tipoMaquina: true } } } },
      personal: { select: { id: true, nombre: true, apellido: true } },
      respuestas: { include: { pregunta: true } },
      imagenes: true,
    },
  });
  if (!reg) return res.status(404).json({ error: 'No encontrado.' });
  res.json(reg);
}

// POST /api/uploads   recibe una imagen y devuelve la URL pública.
// Sección 10: almacenamiento en disco local (suficiente para v1; ver ⚠ sección 13).
export async function uploadImagen(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo.' });
  // URL pública servida por express.static('/uploads').
  const url = `/uploads/${path.basename(req.file.path)}`;
  res.status(201).json({ url });
}
