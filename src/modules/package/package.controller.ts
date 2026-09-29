import type { Request, Response } from "express";

import { packageService } from "./package.service.js";
import {
  createPackageSchema,
  packageIdSchema,
  updatePackageSchema,
} from "./package.validation.js";

const createPackage = async (req: Request, res: Response) => {
  const payload = createPackageSchema.parse(req.body);

  const result = await packageService.createPackage(payload);

  res.status(201).json({
    success: true,
    message: "Package created successfully",
    data: result,
  });
};

const getAllPackages = async (req: Request, res: Response) => {
  const result = await packageService.getAllPackages();

  res.status(200).json({
    success: true,
    message: "Packages retrieved successfully",
    data: result,
  });
};

const getPackageById = async (req: Request, res: Response) => {
  const { id } = packageIdSchema.parse(req.params);

  const result = await packageService.getPackageById(id);

  res.status(200).json({
    success: true,
    message: "Package retrieved successfully",
    data: result,
  });
};

const updatePackage = async (req: Request, res: Response) => {
  const { id } = packageIdSchema.parse(req.params);

  const payload = updatePackageSchema.parse(req.body);

  const result = await packageService.updatePackage(id, payload);

  res.status(200).json({
    success: true,
    message: "Package updated successfully",
    data: result,
  });
};

const updatePackageStatus = async (req: Request, res: Response) => {
  const { id } = packageIdSchema.parse(req.params);

  const isActiveSchema = updatePackageSchema.pick({
    isActive: true,
  });

  const { isActive } = isActiveSchema.parse(req.body);

  if (isActive === undefined) {
    throw new Error("isActive is required");
  }

  const result = await packageService.updatePackageStatus(
    id,
    isActive,
  );

  res.status(200).json({
    success: true,
    message: `Package ${isActive ? "activated" : "deactivated"} successfully`,
    data: result,
  });
};

export const packageController = {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  updatePackageStatus,
};