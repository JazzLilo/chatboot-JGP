import { Router } from 'express';
import { getSolicitudes } from '../controllers/solicitudes.controller.js';

const router = Router();

router.get('/', getSolicitudes)

export default router;