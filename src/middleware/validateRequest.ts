import { ZodType } from "zod";
import AppError from "../utils/appError.js";
import type { NextFunction, Request, Response } from "express";

export const validateRequest = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return next(new AppError(400, message));
    }

    next();
  };
};