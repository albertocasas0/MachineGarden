import QRCode from 'qrcode';
import { prisma } from '../utils/prisma.js';

// GET /api/equipos/:id/qr?format=png|svg&download=1
// Devuelve el PNG/SVG del QR listo para imprimir/pegar.
export async function generarQr(req, res) {
  const id = Number(req.params.id);
  const format = (req.query.format || 'png').toString();
  const eq = await prisma.equipo.findUnique({
    where: { id },
    include: { form: { include: { tipoMaquina: true } } },
  });
  if (!eq || !eq.activo) return res.status(404).json({ error: 'No encontrado.' });

  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const url = `${base}/relevar/${eq.qrToken}`;

  if (format === 'svg') {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2, width: 320 });
    res.setHeader('Content-Type', 'image/svg+xml');
    if (req.query.download) {
      res.setHeader('Content-Disposition',
        `attachment; filename="qr-${eq.nombre.replace(/\s+/g, '_')}.svg"`);
    }
    return res.send(svg);
  }

  // PNG por defecto. Usamos res.end() para enviar el buffer binario sin interferencias de Express.
  const buf = await QRCode.toBuffer(url, { type: 'png', margin: 2, width: 512 });
  res.setHeader('Content-Type', 'image/png');
  if (req.query.download) {
    res.setHeader('Content-Disposition',
      `attachment; filename="qr-${eq.nombre.replace(/\s+/g, '_')}.png"`);
  }
  return res.end(buf);
}

// GET /api/equipos/:id/qr-link   devuelve la URL codificada en el QR.
export async function qrLink(req, res) {
  const id = Number(req.params.id);
  const eq = await prisma.equipo.findUnique({ where: { id } });
  if (!eq || !eq.activo) return res.status(404).json({ error: 'No encontrado.' });
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  res.json({ url: `${base}/relevar/${eq.qrToken}`, qr_token: eq.qrToken });
}
