import { Router } from "express";
import auth from "../services/auth";
import users from "../services/users";
import products from "../services/products";
import categories from "../services/categories";
import cartItems from "../services/cartItems";
import orders from "../services/orders";
import reviews from "../services/reviews";

/**
 * ============================================
 * MAIN API ROUTER - Route Registration
 * ============================================
 * 
 * This file serves as the central hub for registering all API routes.
 * Each service handles its own CRUD operations for a specific resource.
 * 
 * Available endpoints:
 * - /users - User management (create, read, update, delete)
 * - /products - Product management with filtering and pagination
 * - /categories - Product category management
 * - /cart-items - Shopping cart management
 * - /orders - Order management and history
 */

// Initialize the main API router
const router = Router();

/**
 * Auth Routes
 * Handles registration, login, and current-user lookup
 *
 * Endpoints:
 * POST   /auth/register      - Register a new account
 * POST   /auth/login         - Log in and receive a JWT
 * GET    /auth/me            - Get the authenticated user's profile
 */
router.use("/auth", auth);

/**
 * User Routes
 * Handles all user-related operations
 * 
 * Endpoints:
 * POST   /users              - Create new user
 * GET    /users              - List all users
 * GET    /users/:id          - Get specific user
 * PATCH  /users/:id          - Update user
 * DELETE /users/:id          - Delete user
 */
router.use("/users", users);

/**
 * Product Routes
 * Handles all product-related operations
 * 
 * Endpoints:
 * POST   /products           - Create new product
 * GET    /products           - List products with filters and pagination
 * GET    /products/:id       - Get specific product
 * PATCH  /products/:id       - Update product
 * DELETE /products/:id       - Delete product
 */
router.use("/products", products);

/**
 * Category Routes
 * Handles product category management
 * 
 * Endpoints:
 * POST   /categories         - Create new category
 * GET    /categories         - List all categories
 * GET    /categories/:id     - Get category with products
 * PATCH  /categories/:id     - Update category
 * DELETE /categories/:id     - Delete category
 */
router.use("/categories", categories);

/**
 * Cart Items Routes
 * Handles shopping cart operations
 * 
 * Endpoints:
 * POST   /cart-items             - Add item to cart
 * GET    /cart-items             - List all cart items
 * GET    /cart-items/user/:userId - Get specific user's cart
 * PATCH  /cart-items/:id         - Update item quantity
 * DELETE /cart-items/:id         - Remove item from cart
 * DELETE /cart-items/user/:userId - Clear entire user cart
 */
router.use("/cart-items", cartItems);

/**
 * Order Routes
 * Handles order management and history
 * 
 * Endpoints:
 * POST   /orders                 - Create new order
 * GET    /orders                 - List all orders
 * GET    /orders/:id             - Get order details
 * GET    /orders/user/:userId    - Get user's orders
 * PATCH  /orders/:id             - Update order status
 * DELETE /orders/:id             - Cancel/delete order
 */
router.use("/orders", orders);

/**
 * Review Routes
 * Handles product review submission and moderation
 *
 * Endpoints:
 * POST   /reviews            - Create a review (authenticated)
 * GET    /reviews            - List reviews with filters
 * GET    /reviews/:id        - Get a specific review
 * PATCH  /reviews/:id        - Update a review (owner) or moderate it (admin)
 * DELETE /reviews/:id        - Delete a review (soft delete)
 */
router.use("/reviews", reviews);

// Export router to be used in main application
export default router;
