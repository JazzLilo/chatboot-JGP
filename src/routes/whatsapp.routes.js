import {  Router } from 'express';
import { saveMessage } from '../controllers/whatsapp.controller.js';

const router = Router();

router.post('/message', saveMessage)

export default router;