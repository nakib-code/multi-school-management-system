import type { Request, Response } from "express";

import { subscriptionService } from "./subscription.service.js";

import {
  createSubscriptionSchema,
  schoolIdSchema,
  subscriptionIdSchema,
  updateSubscriptionSchema,
  updateSubscriptionStatusSchema,
} from "./subscription.validation.js";

const createSubscription = async (
  req: Request,
  res: Response,
) => {
  const payload =
    createSubscriptionSchema.parse(req.body);

  const result =
    await subscriptionService.createSubscription(
      payload,
    );

  res.status(201).json({
    success: true,
    message: "Subscription created successfully",
    data: result,
  });
};

const getAllSubscriptions = async (
  _req: Request,
  res: Response,
) => {
  const result =
    await subscriptionService.getAllSubscriptions();

  res.status(200).json({
    success: true,
    message: "Subscriptions retrieved successfully",
    data: result,
  });
};

const getSubscriptionById = async (
  req: Request,
  res: Response,
) => {
  const { id } =
    subscriptionIdSchema.parse(req.params);

  const result =
    await subscriptionService.getSubscriptionById(id);

  res.status(200).json({
    success: true,
    message: "Subscription retrieved successfully",
    data: result,
  });
};

const getSchoolSubscriptions = async (
  req: Request,
  res: Response,
) => {
  const { schoolId } =
    schoolIdSchema.parse(req.params);

  const result =
    await subscriptionService.getSchoolSubscriptions(
      schoolId,
    );

  res.status(200).json({
    success: true,
    message: "School subscriptions retrieved successfully",
    data: result,
  });
};

const updateSubscription = async (
  req: Request,
  res: Response,
) => {
  const { id } =
    subscriptionIdSchema.parse(req.params);

  const payload =
    updateSubscriptionSchema.parse(req.body);

  const result =
    await subscriptionService.updateSubscription(
      id,
      payload,
    );

  res.status(200).json({
    success: true,
    message: "Subscription updated successfully",
    data: result,
  });
};

const updateSubscriptionStatus = async (
  req: Request,
  res: Response,
) => {
  const { id } =
    subscriptionIdSchema.parse(req.params);

  const payload =
    updateSubscriptionStatusSchema.parse(req.body);

  const result =
    await subscriptionService.updateSubscriptionStatus(
      id,
      payload,
    );

  res.status(200).json({
    success: true,
    message: "Subscription status updated successfully",
    data: result,
  });
};

export const subscriptionController = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getSchoolSubscriptions,
  updateSubscription,
  updateSubscriptionStatus,
};