import { Router } from 'express';
import { requireAuth, requirePermiso } from '../middlewares/auth.js';
import * as ctl from '../controllers/formController.js';

const router = Router();
router.use(requireAuth, requirePermiso('abm-form'));
router.get('/',     ctl.listar);
router.get('/:id',  ctl.obtener);
router.post('/',    ctl.crear);
router.put('/:id',  ctl.editar);
router.delete('/:id', ctl.eliminar);

export default router;
