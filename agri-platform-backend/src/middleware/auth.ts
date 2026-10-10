import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request interface to include authenticated user payload
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    phone_number: string;
  };
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ status: "error", message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "fallback_secret";
    const decoded = jwt.verify(token, secret) as {
      id: number;
      role: string;
      phone_number: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ status: "error", message: "Invalid or expired token." });
  }
};

// Middleware to check specific user roles (e.g., equipment owner only)
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message:
          "Access forbidden: You do not have the required permissions for this action.",
      });
    }
    next();
  };
};
