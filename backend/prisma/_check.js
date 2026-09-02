import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const counts = {
  personal:       await prisma.personal.count(),
  tipoMaquina:    await prisma.tipoMaquina.count(),
  form:           await prisma.form.count(),
  pregunta:       await prisma.pregunta.count(),
  equipo:         await prisma.equipo.count(),
};
console.log('Conteos:', counts);

const sample = await prisma.equipo.findFirst({
  include: { form: { include: { tipoMaquina: true, preguntas: { orderBy: { orden: 'asc' } } } } },
});
console.log('Ejemplo de Equipo:', JSON.stringify({
  nombre: sample.nombre,
  qr_token_len: sample.qrToken.length,
  form: sample.form.nombre,
  tipo: sample.form.tipoMaquina.nombre,
  preguntas: sample.form.preguntas.map(p => ({ orden: p.orden, texto: p.texto, tipo: p.tipoDato })),
}, null, 2));

await prisma.$disconnect();
