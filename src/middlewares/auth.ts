import { NextFunction, Request, Response } from "express";
import prisma from "@/lib/prisma";
import { JwtPayload, verifyToken } from "@/lib/jwt";

/**
 * ============================================
 * AUTH MIDDLEWARES
 * ============================================
 *
 * authenticate        - verifies the JWT from the Authorization header
 *                        and attaches the decoded user to req.user
 * authorize(...roles) - restricts a route to specific user roles
 * authorizeSelfOrAdmin - allows access only to the resource owner or an ADMIN
 */

// Extend Express's Request type so req.user is typed everywhere
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies the Bearer token sent in the Authorization header.
 * Expected header format: "Authorization: Bearer <token>"
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Provide a Bearer token.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
      });
    }

    // Verify and decode the token
    const decoded = verifyToken(token);

    // Confirm the user still exists and hasn't been soft-deleted
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists or has been deactivated",
      });
    }

    // Attach a lightweight user object to the request for downstream handlers
    req.user = { id: user.id, email: user.email, role: user.role };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Restricts access to users whose role is included in the given list.
 * Usage: router.post("/", authenticate, authorize("ADMIN"), handler)
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

/**
 * Allows access only if the requester owns the resource (matched via the
 * provided resolver function) OR is an ADMIN.
 * Usage: router.patch("/:id", authenticate, authorizeSelfOrAdmin(req => req.params.id), handler)
 */
export const authorizeSelfOrAdmin = (
  getResourceUserId: (req: Request) => string | undefined
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const resourceUserId = getResourceUserId(req);

    if (req.user.role !== "ADMIN" && req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own resources",
      });
    }

    next();
  };
};
