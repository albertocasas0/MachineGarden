import { Router } from 'express';
import { requireAuth, requirePermiso } from '../middlewares/auth.js';
import * as ctl from '../controllers/personalController.js';

const router = Router();
router.use(requireAuth, requirePermiso('abm-personal'));
router.get('/',    ctl.listar);
router.post('/',   ctl.crear);
router.put('/:id', ctl.editar);
router.delete('/:id', ctl.eliminar);

export default router;
