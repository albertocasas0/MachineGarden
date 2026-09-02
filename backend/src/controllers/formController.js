import { prisma } from '../utils/prisma.js';

// GET /api/forms?q=
export async function listar(req, res) {
  const q = (req.query.q || '').toString().trim();
  const where = { activo: true };
  if (q) where.nombre = { contains: q };

  const forms = await prisma.form.findMany({
    where,
    orderBy: { nombre: 'asc' },
    include: {
      tipoMaquina: { select: { id: true, nombre: true } },
      preguntas: { orderBy: { orden: 'asc' } },
    },
  });
  res.json(forms.map(f => ({
    id: f.id,
    nombre: f.nombre,
    tipo_maquina_id: f.tipoMaquinaId,
    tipo_maquina: f.tipoMaquina.nombre,
    preguntas: f.preguntas.map(p => ({
      id: p.id,
      texto: p.texto,
      tipo_dato: p.tipoDato,
      orden: p.orden,
      obligatoria: p.obligatoria,
    })),
  })));
}

// GET /api/forms/:id
export async function obtener(req, res) {
  const id = Number(req.params.id);
  const f = await prisma.form.findUnique({
    where: { id },
    include: {
      tipoMaquina: true,
      preguntas: { orderBy: { orden: 'asc' } },
    },
  });
  if (!f || !f.activo) return res.status(404).json({ error: 'No encontrado.' });
  res.json({
    id: f.id,
    nombre: f.nombre,
    tipo_maquina_id: f.tipoMaquinaId,
    tipo_maquina: f.tipoMaquina.nombre,
    preguntas: f.preguntas.map(p => ({
      id: p.id,
      texto: p.texto,
      tipo_dato: p.tipoDato,
      orden: p.orden,
      obligatoria: p.obligatoria,
    })),
  });
}

// POST /api/forms   crea form + preguntas (reemplazo total al guardar).
// Body: { tipo_maquina_id, preguntas: [{texto, tipo_dato, obligatoria}] }
export async function crear(req, res) {
  const tipoMaquinaId = Number(req.body?.tipo_maquina_id);
  const preguntas = Array.isArray(req.body?.preguntas) ? req.body.preguntas : [];
  if (!tipoMaquinaId) return res.status(400).json({ error: 'Falta tipo_maquina_id.' });
  if (preguntas.length === 0) return res.status(400).json({ error: 'Debe incluir al menos una pregunta.' });

  const tipo = await prisma.tipoMaquina.findUnique({ where: { id: tipoMaquinaId } });
  if (!tipo || !tipo.activo) return res.status(404).json({ error: 'Tipo de máquina no encontrado.' });

  const existe = await prisma.form.findUnique({ where: { tipoMaquinaId } });
  if (existe) return res.status(409).json({ error: 'Ya existe un formulario para ese tipo de máquina.' });

  let tiposValidados;
  try { tiposValidados = preguntas.map(p => validarTipo(p.tipo_dato)); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  const form = await prisma.form.create({
    data: {
      tipoMaquinaId,
      nombre: tipo.nombre,
      preguntas: { create: preguntas.map((p, i) => ({
        texto: String(p.texto || '').trim(),
        tipoDato: tiposValidados[i],
        orden: i + 1,
        obligatoria: p.obligatoria !== false,
      })) },
    },
    include: { preguntas: true },
  });
  res.status(201).json({ id: form.id, nombre: form.nombre });
}

// PUT /api/forms/:id   reemplazo total de preguntas.
export async function editar(req, res) {
  const id = Number(req.params.id);
  const preguntas = Array.isArray(req.body?.preguntas) ? req.body.preguntas : [];
  if (preguntas.length === 0) return res.status(400).json({ error: 'Debe incluir al menos una pregunta.' });

  const form = await prisma.form.findUnique({ where: { id } });
  if (!form || !form.activo) return res.status(404).json({ error: 'No encontrado.' });

  let tiposValidados;
  try { tiposValidados = preguntas.map(p => validarTipo(p.tipo_dato)); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  await prisma.$transaction(async (tx) => {
    // Para preservar el historial, no borramos Respuestas ni Preguntas existentes.
    // En lugar de borrar todo, actualizamos las existentes y creamos las nuevas.
    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      const orden = i + 1;

      // Buscamos si ya existe una pregunta en esta posición
      const existe = await tx.pregunta.findFirst({
        where: { formId: id, orden }
      });

      if (existe) {
        await tx.pregunta.update({
          where: { id: existe.id },
          data: {
            texto: String(p.texto || '').trim(),
            tipoDato: tiposValidados[i],
            obligatoria: p.obligatoria !== false,
          }
        });
      } else {
        await tx.pregunta.create({
          data: {
            formId: id,
            texto: String(p.texto || '').trim(),
            tipoDato: tiposValidados[i],
            orden,
            obligatoria: p.obligatoria !== false,
          }
        });
      }
    }
    // Borramos preguntas que hayan quedado fuera del nuevo set (orden > max)
    const maxOrden = preguntas.length;
    await tx.pregunta.deleteMany({
      where: { formId: id, orden: { gt: maxOrden } }
    });
  });
  res.json({ ok: true });
}

// DELETE /api/forms/:id  → baja lógica (no elimina Respuestas históricas).
export async function eliminar(req, res) {
  const id = Number(req.params.id);
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form || !form.activo) return res.status(404).json({ error: 'No encontrado.' });
  await prisma.form.update({ where: { id }, data: { activo: false } });
  res.json({ ok: true });
}

function validarTipo(t) {
  const up = String(t || '').toUpperCase();
  if (up !== 'BOOLEAN' && up !== 'STRING' && up !== 'INT') {
    throw new Error(`tipo_dato inválido: ${t}`);
  }
  return up;
}
