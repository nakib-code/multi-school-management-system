import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import AppError from "../utils/appError.js";

export const validateRequest = (schema: ZodType) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
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

    if (result.data && typeof result.data === "object") {
      const parsed = result.data as {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }

      if (parsed.query !== undefined) {
        req.query = parsed.query as Request["query"];
      }

      if (parsed.params !== undefined) {
        req.params = parsed.params as Request["params"];
      }
    }

    next();
  };
};
