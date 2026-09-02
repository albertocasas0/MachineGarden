import { Router } from 'express';
import { requireAuth, requirePermiso } from '../middlewares/auth.js';
import * as ctl from '../controllers/reporteController.js';

const router = Router();

router.use(requireAuth, requirePermiso('ver-reportes'));

router.get('/',                       ctl.listar);
router.get('/export/pdf',             ctl.exportPdf);
router.get('/export/xlsx',            ctl.exportXlsx);
router.get('/export/docx',            ctl.exportDocx);

export default router;
