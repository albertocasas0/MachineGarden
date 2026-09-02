import express from 'express';
import cors from 'cors';
import path from 'node:path';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import maquinasRoutes from './routes/maquinas.js';
import formsRoutes from './routes/forms.js';
import equiposRoutes from './routes/equipos.js';
import registrosRoutes from './routes/registros.js';
import reportesRoutes from './routes/reportes.js';
import personalRoutes from './routes/personal.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servimos uploads como estáticos (sección 10: storage / bucket; en v1 disco local).
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Jardín Ground API' }));
app.use('/api/auth', authRoutes);
app.use('/api/maquinas', maquinasRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/registros', registrosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/personal', personalRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🌿 Jardín Ground API escuchando en http://localhost:${PORT}`);
});
