import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import * as ctl from '../controllers/registroController.js';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Sección 10: aceptamos múltiples imágenes, tamaño máx 5MB.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.mimetype)) {
      return cb(new Error('Tipo de archivo no soportado.'));
    }
    cb(null, true);
  },
});

router.use(requireAuth);
router.post('/',        ctl.crear);
router.get('/:id',      ctl.obtener);
router.delete('/:id',   ctl.eliminar);
router.post('/uploads', upload.array('fotos', 10), ctl.uploadImagen);

export default router;
