import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authenticate } from "../middlewares/auth";

// Initialize Express router for review-related routes
const router = Router();

/**
 * ============================================
 * REVIEW ROUTES - Product Review Management
 * ============================================
 *
 * Reviews let authenticated users rate and comment on products they've
 * used. A user may leave at most one review per product.
 *
 * Review statuses: PENDING, APPROVED, REJECTED
 *
 * This router handles:
 * - Creating a review (authenticated users)
 * - Retrieving reviews for a product (public)
 * - Updating a review (owner only)
 * - Moderating a review's status (ADMIN only)
 * - Deleting a review (owner or ADMIN - soft delete)
 */

/**
 * POST /reviews
 *
 * Create a new review for a product
 * Requires: Authorization: Bearer <token>
 *
 * Expected Request Body:
 * {
 *   "productId": "product-uuid",
 *   "rating": 5, // 1-5
 *   "comment": "Great product!" // Optional
 * }
 *
 * Returns: Created review
 */
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, rating, comment } = req.body;

    // Validate required fields
    if (!productId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: "productId and rating are required",
      });
    }

    // Validate rating range
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // Verify product exists and is not deleted
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Prevent duplicate reviews from the same user for the same product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message:
          "You have already reviewed this product. Update your existing review instead.",
      });
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, title: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating review",
      error: error.message,
    });
  }
});

/**
 * GET /reviews
 *
 * Retrieve reviews with optional filtering and pagination (public)
 *
 * Query Parameters:
 * - productId: Filter by product (optional)
 * - userId: Filter by reviewer (optional)
 * - status: Filter by review status (PENDING, APPROVED, REJECTED - defaults to APPROVED)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - includeDeleted: Include soft-deleted reviews (default: false)
 *
 * Returns: Paginated list of reviews
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId as string | undefined;
    const userId = req.query.userId as string | undefined;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const includeDeleted = req.query.includeDeleted === "true";

    const skip = (page - 1) * limit;

    const whereCondition: any = {
      isDeleted: includeDeleted ? undefined : false,
      // Public list only shows approved reviews unless an explicit status is requested
      status: status ? status.toUpperCase() : "APPROVED",
    };

    if (productId) whereCondition.productId = productId;
    if (userId) whereCondition.userId = userId;

    const reviews = await prisma.review.findMany({
      where: whereCondition,
      include: {
        user: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalCount = await prisma.review.count({ where: whereCondition });

    res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: reviews,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalReviews: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
      error: error.message,
    });
  }
});

/**
 * GET /reviews/:id
 *
 * Retrieve a specific review by ID (public)
 *
 * Path Parameters:
 * - id: Review ID (UUID)
 *
 * Returns: Single review object
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, title: true },
        },
      },
    });

    if (!review || review.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Review fetched successfully",
      data: review,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching review",
      error: error.message,
    });
  }
});

/**
 * PATCH /reviews/:id
 *
 * Update a review's rating/comment (owner only) or its moderation status
 * (ADMIN only)
 * Requires: Authorization: Bearer <token>
 *
 * Path Parameters:
 * - id: Review ID (UUID)
 *
 * Expected Request Body (all fields optional):
 * {
 *   "rating": 4,
 *   "comment": "Updated thoughts",
 *   "status": "APPROVED" // ADMIN only
 * }
 *
 * Returns: Updated review
 */
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { rating, comment, status } = req.body;

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review || review.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.userId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reviews",
      });
    }

    const updateData: Record<string, any> = {};

    // Only the owner (not an admin editing someone else's review) can
    // change the rating/comment content
    if (rating !== undefined) {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Only the review author can change the rating",
        });
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be an integer between 1 and 5",
        });
      }
      updateData.rating = rating;
    }

    if (comment !== undefined) {
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Only the review author can change the comment",
        });
      }
      updateData.comment = comment;
    }

    // Only admins can moderate a review's status
    if (status !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only admins can change a review's status",
        });
      }
      const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
      if (!validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
      }
      updateData.status = status.toUpperCase();
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: updatedReview,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating review",
      error: error.message,
    });
  }
});

/**
 * DELETE /reviews/:id
 *
 * Delete a review (soft delete). Allowed for the review's author or an
 * ADMIN. Permanent deletion is restricted to ADMIN.
 * Requires: Authorization: Bearer <token>
 *
 * Path Parameters:
 * - id: Review ID (UUID)
 *
 * Query Parameters:
 * - permanent: boolean (ADMIN only, default: false)
 *
 * Returns: Success message
 */
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const permanent = req.query.permanent === "true";

    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.userId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews",
      });
    }

    if (permanent) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only admins can permanently delete reviews",
        });
      }

      await prisma.review.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: "Review permanently deleted",
      });
    }

    const deletedReview = await prisma.review.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      data: {
        id: deletedReview.id,
        message: "Review marked as deleted",
      },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting review",
      error: error.message,
    });
  }
});

// Export router to be used in main application
export default router;
