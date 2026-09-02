import { prisma } from '../utils/prisma.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from 'docx';

// GET /api/reportes?equipo_id=&q=
// Devuelve los registros agrupados por TipoMaquina con columnas dinámicas por Form.
// (Sección 7.7: cada grupo tiene su propia tabla.)
export async function listar(req, res) {
  const q = (req.query.q || '').toString().trim();
  const equipoId = req.query.equipo_id ? Number(req.query.equipo_id) : null;

  const registros = await prisma.registro.findMany({
    orderBy: { fechaHora: 'desc' },
    include: {
      equipo: { include: { form: { include: { tipoMaquina: true, preguntas: { orderBy: { orden: 'asc' } } } } } },
      personal: { select: { id: true, nombre: true, apellido: true } },
      respuestas: true,
      imagenes: true,
    },
  });

  // Filtros: por equipo puntual o por nombre (equipo / personal) — sección 7.7.
  const filtrados = registros.filter(r => {
    if (equipoId && r.equipoId !== equipoId) return false;
    if (q) {
      const hay = `${r.equipo.nombre} ${r.personal.nombre} ${r.personal.apellido}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Agrupamos por tipo de máquina.
  const grupos = new Map();
  for (const r of filtrados) {
    const tm = r.equipo.form.tipoMaquina;
    if (!grupos.has(tm.id)) {
      grupos.set(tm.id, {
        tipo_maquina_id: tm.id,
        tipo_maquina: tm.nombre,
        columnas: r.equipo.form.preguntas.map(p => ({ id: p.id, texto: p.texto, tipo_dato: p.tipoDato, orden: p.orden })),
        registros: [],
      });
    }
    grupos.get(tm.id).registros.push({
      id: r.id,
      fecha_hora: r.fechaHora,
      equipo: { id: r.equipo.id, nombre: r.equipo.nombre },
      personal: `${r.personal.nombre} ${r.personal.apellido}`,
      respuestas: r.respuestas,
      imagenes: r.imagenes.map(i => ({ url: i.url, origen: i.origen })),
    });
  }

  res.json(Array.from(grupos.values()));
}

// Helpers de formato (sección 6.5 / Nota 1).
function fmtFecha(d) {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
function respuestaValor(r, pregunta) {
  if (pregunta.tipoDato === 'BOOLEAN') return r.valorBoolean === true ? 'Sí' : r.valorBoolean === false ? 'No' : '-';
  if (pregunta.tipoDato === 'INT')      return r.valorNumero != null ? String(r.valorNumero) : '-';
  return r.valorTexto ?? '-';
}

// GET /api/reportes/export/pdf
export async function exportPdf(req, res) {
  const data = await fetchAgrupado(req);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-jardin-ground.pdf"');
  doc.pipe(res);

  doc.fontSize(18).fillColor('#2F5233').text('Jardín Ground — Reporte de Relevamientos', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#3A3A3A').text(`Generado: ${fmtFecha(new Date())}`);
  doc.moveDown();

  for (const g of data) {
    if (g.registros.length === 0) continue;
    doc.fontSize(14).fillColor('#2F5233').text(g.tipo_maquina);
    doc.moveDown(0.3);

    // Construimos la tabla manualmente con pdfkit.
    const cols = ['Fecha', 'Equipo', 'Personal', ...g.columnas.map(c => c.texto), 'Imgs'];
    const widths = cols.map(() => 80);
    const startX = 30, pageW = doc.page.width - 60;
    const colW = pageW / cols.length;

    // Header
    let y = doc.y;
    doc.fontSize(9).fillColor('#fff');
    doc.rect(startX, y, pageW, 18).fill('#4C7A3F');
    cols.forEach((c, i) => doc.fillColor('#fff').text(c, startX + i * colW + 4, y + 5, { width: colW - 8, ellipsis: true }));
    y += 18;

    // Filas
    doc.fillColor('#3A3A3A');
    for (const r of g.registros) {
      const fila = [
        fmtFecha(r.fecha_hora),
        r.equipo.nombre,
        r.personal,
        ...g.columnas.map(c => respuestaValor(r.respuestas.find(x => x.preguntaId === c.id) || {}, c)),
        r.imagenes.length ? String(r.imagenes.length) : '-',
      ];
      const rowH = 16;
      if (y + rowH > doc.page.height - 40) { doc.addPage(); y = 40; }
      doc.rect(startX, y, pageW, rowH).fill('#fff');
      fila.forEach((v, i) => doc.fillColor('#3A3A3A').fontSize(8).text(String(v), startX + i * colW + 4, y + 4, { width: colW - 8, ellipsis: true }));
      doc.rect(startX, y, pageW, rowH).stroke('#E8F0E3');
      y += rowH;
    }
    doc.y = y + 12;
  }

  doc.end();
}

// GET /api/reportes/export/xlsx
export async function exportXlsx(req, res) {
  const data = await fetchAgrupado(req);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jardín Ground';

  if (data.length === 0 || data.every(g => g.registros.length === 0)) {
    // Hoja vacía con aviso.
    const ws = wb.addWorksheet('Sin datos');
    ws.addRow(['No hay registros para los filtros aplicados.']);
  }

  // Una hoja por TipoMaquina (sección 7.7.1).
  for (const g of data) {
    if (g.registros.length === 0) continue;
    const ws = wb.addWorksheet(g.tipo_maquina.substring(0, 28));
    const header = ['Fecha', 'Equipo', 'Personal', ...g.columnas.map(c => c.texto), 'Imágenes'];
    ws.addRow(header);
    ws.getRow(1).eachCell(c => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5233' } };
    });
    for (const r of g.registros) {
      ws.addRow([
        fmtFecha(r.fecha_hora),
        r.equipo.nombre,
        r.personal,
        ...g.columnas.map(c => respuestaValor(r.respuestas.find(x => x.preguntaId === c.id) || {}, c)),
        r.imagenes.map(i => i.url).join(', '),
      ]);
    }
    ws.columns.forEach(col => { col.width = 22; });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-jardin-ground.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}

// GET /api/reportes/export/docx
export async function exportDocx(req, res) {
  const data = await fetchAgrupado(req);
  const children = [
    new Paragraph({ children: [new TextRun({ text: 'Jardín Ground — Reporte de Relevamientos', bold: true, size: 32, color: '2F5233' })] }),
    new Paragraph({ children: [new TextRun({ text: `Generado: ${fmtFecha(new Date())}`, size: 20 })] }),
  ];

  for (const g of data) {
    if (g.registros.length === 0) continue;
    children.push(new Paragraph({ children: [new TextRun({ text: g.tipo_maquina, bold: true, size: 26, color: '4C7A3F' })] }));
    const header = ['Fecha', 'Equipo', 'Personal', ...g.columnas.map(c => c.texto)];
    const filas = g.registros.map(r => [
      fmtFecha(r.fecha_hora),
      r.equipo.nombre,
      r.personal,
      ...g.columnas.map(c => respuestaValor(r.respuestas.find(x => x.preguntaId === c.id) || {}, c)),
    ]);
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: header.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })) }),
        ...filas.map(fila => new TableRow({ children: fila.map(v => new TableCell({ children: [new Paragraph(String(v))] })) })),
      ],
    }));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buf = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-jardin-ground.docx"');
  res.send(buf);
}

// Helper compartido: lee registros aplicando los mismos filtros que listar().
async function fetchAgrupado(req) {
  const q = (req.query.q || '').toString().trim();
  const equipoId = req.query.equipo_id ? Number(req.query.equipo_id) : null;
  const registros = await prisma.registro.findMany({
    orderBy: { fechaHora: 'desc' },
    include: {
      equipo: { include: { form: { include: { tipoMaquina: true, preguntas: { orderBy: { orden: 'asc' } } } } } },
      personal: { select: { nombre: true, apellido: true } },
      respuestas: true,
      imagenes: true,
    },
  });
  const filtrados = registros.filter(r => {
    if (equipoId && r.equipoId !== equipoId) return false;
    if (q) {
      const hay = `${r.equipo.nombre} ${r.personal.nombre} ${r.personal.apellido}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const grupos = new Map();
  for (const r of filtrados) {
    const tm = r.equipo.form.tipoMaquina;
    if (!grupos.has(tm.id)) {
      grupos.set(tm.id, {
        tipo_maquina_id: tm.id, tipo_maquina: tm.nombre,
        columnas: r.equipo.form.preguntas.map(p => ({ id: p.id, texto: p.texto, tipo_dato: p.tipoDato })),
        registros: [],
      });
    }
    grupos.get(tm.id).registros.push({
      id: r.id,
      fecha_hora: r.fechaHora,
      equipo: { id: r.equipo.id, nombre: r.equipo.nombre },
      personal: `${r.personal.nombre} ${r.personal.apellido}`,
      respuestas: r.respuestas,
      imagenes: r.imagenes,
    });
  }
  return Array.from(grupos.values());
}
