import { Router } from 'express';
import { requireAuth, requirePermiso } from '../middlewares/auth.js';
import * as eq from '../controllers/equipoController.js';
import * as qr from '../controllers/qrController.js';

const router = Router();

// Lectura del equipo por token: no requiere auth, pero el WIZARD ya valida
// sesión cuando el front lo invoca (sección 7.8). Endpoint público para resolver.
router.get('/por-token/:token', eq.porToken);

// Resto requiere login + permiso ABM Equipo.
router.use(requireAuth, requirePermiso('abm-equipo'));

router.get('/',                   eq.listar);
router.post('/',                  eq.crear);
router.put('/:id',                eq.editar);
router.delete('/:id',             eq.eliminar);
router.post('/:id/regenerar-qr',  eq.regenerarQr);
router.get('/:id/qr',             qr.generarQr);
router.get('/:id/qr-link',        qr.qrLink);

export default router;
