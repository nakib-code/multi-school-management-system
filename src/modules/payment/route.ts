import { Router } from "express";

import { getPlatformPaymentMethodsController } from "./controller.js";

const router = Router();

router.get("/payments/methods", getPlatformPaymentMethodsController);

export const paymentRoutes = router;
