import { Logger } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const logger = new Logger("HTTP");

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    logger.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });

  next();
}
