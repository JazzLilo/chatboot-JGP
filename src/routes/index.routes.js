import { Router } from "express";
import solicitudesRoutes from "./solicitudes.routes.js";

const router = Router();

router.use('/solicitudes', solicitudesRoutes);

export default router;