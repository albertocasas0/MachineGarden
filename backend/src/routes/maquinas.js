import { Router } from 'express';
import { requireAuth, requirePermiso } from '../middlewares/auth.js';
import * as ctl from '../controllers/maquinaController.js';

const router = Router();
router.use(requireAuth, requirePermiso('abm-maquina'));
router.get('/tipos', ctl.listarTiposLigeros);
router.get('/',    ctl.listar);
router.post('/',   ctl.crear);
router.put('/:id', ctl.editar);
router.delete('/:id', ctl.eliminar);

export default router;
