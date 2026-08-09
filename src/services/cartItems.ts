import prisma from "../lib/prisma";
import { Router, Request, Response } from "express";
import { authenticate, authorizeSelfOrAdmin } from "../middlewares/auth";

// Initialize Express router for cart item-related routes
const router = Router();

// All cart routes require an authenticated user
router.use(authenticate);

/**
 * ============================================
 * CART ITEMS ROUTES - Shopping Cart Management
 * ============================================
 *
 * Cart items represent products that the authenticated user has added to
 * their shopping cart. Each user can have multiple cart items, but only
 * one of each product. Every route below requires a valid Bearer token,
 * and users can only ever manage their own cart (unless they are ADMIN).
 */

/**
 * POST /cart-items
 *
 * Add a product to the authenticated user's cart (or update quantity if
 * already in cart)
 *
 * Expected Request Body:
 * {
 *   "productId": "product-uuid",
 *   "quantity": 2 // Optional, defaults to 1
 * }
 *
 * Returns: Created or updated cart item
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // Cart items always belong to the authenticated user
    const userId = req.user!.id;
    const { productId, quantity = 1 } = req.body;

    // Validate required fields
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Validate quantity is positive
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // Verify product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product is deleted
    if (product.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Product is no longer available",
      });
    }

    // Check if product has sufficient stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}`,
      });
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    let cartItem;

    if (existingCartItem) {
      // Update existing cart item quantity
      const newQuantity = existingCartItem.quantity + quantity;

      // Check if new quantity exceeds stock
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Available: ${product.stock}, Already in cart: ${existingCartItem.quantity}`,
        });
      }

      cartItem = await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: true,
        },
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
        },
        include: {
          product: true,
        },
      });
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: existingCartItem ? "Cart item updated" : "Item added to cart",
      data: cartItem,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error adding item to cart",
      error: error.message,
    });
  }
});

/**
 * GET /cart-items
 *
 * Retrieve the authenticated user's cart items (ADMIN can pass a userId
 * query param to inspect any user's cart)
 *
 * Query Parameters:
 * - userId: Filter by a specific user (ADMIN only, optional)
 *
 * Returns: Array of cart items with product details
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const requestedUserId = req.query.userId as string | undefined;

    // Non-admins can only ever see their own cart
    let userId = req.user!.id;
    if (requestedUserId && req.user!.role === "ADMIN") {
      userId = requestedUserId;
    }

    // Fetch cart items from database
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate total cart value
    const totalCartValue = cartItems.reduce((sum: number, item: any) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    // Return success response
    res.status(200).json({
      success: true,
      message: "Cart items fetched successfully",
      data: cartItems,
      totalCartValue: parseFloat(totalCartValue.toFixed(2)),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching cart items",
      error: error.message,
    });
  }
});

/**
 * GET /cart-items/user/:userId
 *
 * Retrieve a specific user's cart with summary (self or ADMIN)
 *
 * Path Parameters:
 * - userId: User ID (UUID)
 *
 * Returns: Array of user's cart items with cart summary (total items, total price)
 */
router.get(
  "/user/:userId",
  authorizeSelfOrAdmin((req) => req.params.userId as string),
  async (req: Request, res: Response) => {
    try {
      // Extract user ID from URL parameters and cast to string
      const userId = req.params.userId as string;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Fetch user's cart items
      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calculate cart summary
      const cartSummary = cartItems.reduce(
        (summary: any, item: any) => {
          return {
            totalItems: summary.totalItems + item.quantity,
            totalPrice:
              summary.totalPrice + item.product.price * item.quantity,
            itemCount: summary.itemCount + 1, // Number of different products
          };
        },
        { totalItems: 0, totalPrice: 0, itemCount: 0 }
      );

      // Return success response with cart details
      res.status(200).json({
        success: true,
        message: "User cart fetched successfully",
        user,
        data: cartItems,
        summary: {
          itemCount: cartSummary.itemCount,
          totalQuantity: cartSummary.totalItems,
          totalPrice: parseFloat(cartSummary.totalPrice.toFixed(2)),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching user cart",
        error: error.message,
      });
    }
  }
);

/**
 * PATCH /cart-items/:id
 *
 * Update quantity of a cart item (owner or ADMIN)
 *
 * Path Parameters:
 * - id: Cart Item ID (UUID)
 *
 * Expected Request Body:
 * {
 *   "quantity": 5
 * }
 *
 * Returns: Updated cart item
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    // Extract cart item ID from URL parameters and cast to string
    const id = req.params.id as string;
    // Extract new quantity from request body
    const { quantity } = req.body;

    // Validate quantity
    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // Find cart item and its product
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Only the owner or an admin may modify this cart item
    if (req.user!.role !== "ADMIN" && cartItem.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "You can only modify items in your own cart",
      });
    }

    // Check if product has sufficient stock
    if (quantity > cartItem.product.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${cartItem.product.stock}`,
      });
    }

    // Update cart item quantity
    const updatedCartItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: true,
      },
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: updatedCartItem,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message,
    });
  }
});

/**
 * DELETE /cart-items/:id
 *
 * Remove a product from the user's cart (owner or ADMIN)
 *
 * Path Parameters:
 * - id: Cart Item ID (UUID)
 *
 * Returns: Success message
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    // Extract cart item ID from URL parameters and cast to string
    const id = req.params.id as string;

    const cartItem = await prisma.cartItem.findUnique({ where: { id } });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Only the owner or an admin may remove this cart item
    if (req.user!.role !== "ADMIN" && cartItem.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "You can only remove items from your own cart",
      });
    }

    // Delete cart item from database
    await prisma.cartItem.delete({
      where: { id },
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message,
    });
  }
});

/**
 * DELETE /cart-items/user/:userId
 *
 * Clear entire cart for a user (self or ADMIN)
 *
 * Path Parameters:
 * - userId: User ID (UUID)
 *
 * Returns: Success message with number of items removed
 */
router.delete(
  "/user/:userId",
  authorizeSelfOrAdmin((req) => req.params.userId as string),
  async (req: Request, res: Response) => {
    try {
      // Extract user ID from URL parameters and cast to string
      const userId = req.params.userId as string;

      // Delete all cart items for the user
      const result = await prisma.cartItem.deleteMany({
        where: { userId },
      });

      // Return success response with count of deleted items
      res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        data: {
          itemsRemoved: result.count,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error clearing cart",
        error: error.message,
      });
    }
  }
);

// Export router to be used in main application
export default router;
