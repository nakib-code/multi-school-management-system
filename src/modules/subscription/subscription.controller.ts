import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import { subscriptionService } from "./subscription.service.js";
import {
	createSubscriptionSchema,
	schoolIdSchema,
	selectPackageSchema,
	subscriptionIdSchema,
	updateSubscriptionSchema,
	updateSubscriptionStatusSchema,
} from "./subscription.validation.js";

const createSubscription = async (req: Request, res: Response) => {
	const payload = createSubscriptionSchema.parse(req.body);

	const result = await subscriptionService.createSubscription(payload);

	res.status(201).json({
		success: true,
		message: "Subscription created successfully",
		data: result,
	});
};

const getAllSubscriptions = async (_req: Request, res: Response) => {
	const result = await subscriptionService.getAllSubscriptions();

	res.status(200).json({
		success: true,
		message: "Subscriptions retrieved successfully",
		data: result,
	});
};

const getSubscriptionById = async (req: Request, res: Response) => {
	const { id } = subscriptionIdSchema.parse(req.params);

	const result = await subscriptionService.getSubscriptionById(id);

	res.status(200).json({
		success: true,
		message: "Subscription retrieved successfully",
		data: result,
	});
};

const getSchoolSubscriptions = async (req: Request, res: Response) => {
	const { schoolId } = schoolIdSchema.parse(req.params);

	const result = await subscriptionService.getSchoolSubscriptions(schoolId);

	res.status(200).json({
		success: true,
		message: "School subscriptions retrieved successfully",
		data: result,
	});
};

/**
 * Admin - Select subscription package
 */
const selectPackageForAdmin = async (req: AuthRequest, res: Response) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Authentication required",
		});
	}

	if (req.user.schoolId === undefined) {
		return res.status(403).json({
			success: false,
			message: "You are not associated with any school",
		});
	}

	const payload = selectPackageSchema.parse(req.body);

	const result = await subscriptionService.selectPackageForAdmin(
		req.user.schoolId,
		payload,
	);

	return res.status(201).json({
		success: true,
		message: "Package selected successfully",
		data: result,
	});
};

/**
 * Get current subscription of logged-in Admin's school.
 */
const getMySubscription = async (req: AuthRequest, res: Response) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			message: "Authentication required",
		});
	}

	if (req.user.schoolId === undefined) {
		return res.status(403).json({
			success: false,
			message: "You are not associated with any school",
		});
	}

	const result = await subscriptionService.getMySubscription(req.user.schoolId);

	return res.status(200).json({
		success: true,
		message: "Current subscription retrieved successfully",
		data: result,
	});
};

const updateSubscription = async (req: Request, res: Response) => {
	const { id } = subscriptionIdSchema.parse(req.params);

	const payload = updateSubscriptionSchema.parse(req.body);

	const result = await subscriptionService.updateSubscription(id, payload);

	res.status(200).json({
		success: true,
		message: "Subscription updated successfully",
		data: result,
	});
};

const updateSubscriptionStatus = async (req: Request, res: Response) => {
	const { id } = subscriptionIdSchema.parse(req.params);

	const payload = updateSubscriptionStatusSchema.parse(req.body);

	const result = await subscriptionService.updateSubscriptionStatus(
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
	selectPackageForAdmin,
	getMySubscription,
	updateSubscription,
	updateSubscriptionStatus,
};
