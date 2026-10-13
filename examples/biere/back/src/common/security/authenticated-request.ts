import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  currentUserId?: number;
}
