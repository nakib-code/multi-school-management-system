import { Router } from "express";

import {
  paymentCancelController,
  paymentFailController,
  paymentIpnController,
  paymentSuccessController,
} from "./controller.js";

const router = Router();

// ----------------------------------------------------
// SSLCommerz callbacks
// ----------------------------------------------------

router.post(
  "/payments/admission/success",
  paymentSuccessController,
);

router.post(
  "/payments/admission/fail",
  paymentFailController,
);

router.post(
  "/payments/admission/cancel",
  paymentCancelController,
);

router.post(
  "/payments/admission/ipn",
  paymentIpnController,
);

export const paymentRoutes = router;