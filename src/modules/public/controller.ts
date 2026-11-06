// src/modules/public/controller.ts
import { Request, Response } from "express";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../utils/appError.js";
import * as PublicService from "./service.js";

/* ---------- Helpers ---------- */
const parseSchoolId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "Invalid school ID");
  }
  return id;
};

const parsePagination = (page: unknown, limit: unknown) => {
  const p = page === undefined ? 1 : Number(page);
  const l = limit === undefined ? 10 : Number(limit);

  if (!Number.isInteger(p) || p < 1) {
    throw new AppError(400, "Invalid page number");
  }
  if (!Number.isInteger(l) || l < 1 || l > 100) {
    throw new AppError(400, "Invalid limit (1-100)");
  }
  return { page: p, limit: l };
};

const parseId = (value: unknown, label = "ID"): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return id;
};

/* ---------- Controllers ---------- */

export const resolveSchool = async (req: Request, res: Response) => {
  const identifier = String(req.query.identifier || "").trim();

  if (!identifier) {
    throw new AppError(400, "Identifier is required");
  }

  const school = await PublicService.resolveSchoolService(identifier);

  if (!school) {
    throw new AppError(404, "School not found");
  }

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "School resolved successfully",
    data: school,
  });
};

export const getPageContent = async (req: Request, res: Response) => {
  const schoolId = parseSchoolId(req.params.schoolId);
  const slug = String(req.params.slug || "").trim();

  if (!slug) {
    throw new AppError(400, "Slug is required");
  }

  const content = await PublicService.getPageContentService(schoolId, slug);

  if (!content) {
    throw new AppError(404, "Page content not found");
  }

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page content fetched successfully",
    data: content,
  });
};

export const getNotices = async (req: Request, res: Response) => {
  const schoolId = parseSchoolId(req.params.schoolId);
  const { page, limit } = parsePagination(req.query.page, req.query.limit);

  const { notices, meta } = await PublicService.getNoticesService(
    schoolId,
    page,
    limit
  );

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notices fetched successfully",
    data: notices,
    meta,
  });
};

export const getNoticeById = async (req: Request, res: Response) => {
  const schoolId = parseSchoolId(req.params.schoolId);
  const id = parseId(req.params.id, "notice ID");

  const notice = await PublicService.getNoticeByIdService(schoolId, id);

  if (!notice) {
    throw new AppError(404, "Notice not found");
  }

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notice fetched successfully",
    data: notice,
  });
};

export const getGallery = async (req: Request, res: Response) => {
  const schoolId = parseSchoolId(req.params.schoolId);

  const images = await PublicService.getGalleryService(schoolId);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Gallery fetched successfully",
    data: images,
  });
};

export const submitContact = async (req: Request, res: Response) => {
  const schoolId = parseSchoolId(req.params.schoolId);

  const { name, email, phone, subject, message } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError(400, "Name is required");
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new AppError(400, "Valid email is required");
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new AppError(400, "Message is required");
  }

  const created = await PublicService.submitContactService(
    schoolId,
    {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? String(phone).trim() : undefined,
      subject: subject ? String(subject).trim() : undefined,
      message: message.trim(),
    },
    req.ip,
    req.headers["user-agent"]
  );

  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Message sent successfully",
    data: created,
  });
};

export const getStats = async (req: Request, res: Response) => {
  const schoolId = parseSchoolId(req.params.schoolId);

  const stats = await PublicService.getSchoolStatsService(schoolId);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stats fetched successfully",
    data: stats,
  });
};