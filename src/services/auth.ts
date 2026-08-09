import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { authenticate } from "../middlewares/auth";

// Initialize Express router for authentication routes
const router = Router();

// Number of salt rounds used by bcrypt when hashing passwords
const SALT_ROUNDS = 10;

/**
 * ============================================
 * AUTH ROUTES - Registration, Login, Current User
 * ============================================
 *
 * This router handles:
 * - User registration with hashed passwords
 * - Login with JWT issuance
 * - Fetching the currently authenticated user's profile
 */

/**
 * POST /auth/register
 *
 * Register a new user account (always created as CUSTOMER for security -
 * ADMIN accounts should be promoted manually or by another admin).
 *
 * Expected Request Body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "plainTextPassword123"
 * }
 *
 * Returns: Created user (without password) and a JWT token
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Enforce a minimum password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check for existing user with the same email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Hash the password before storing it - never store plain text passwords
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user - role is always CUSTOMER on self-registration
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    // Issue a JWT for the newly registered user
    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Strip the password out of the response
    const { password: _password, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
});

/**
 * POST /auth/login
 *
 * Authenticate a user with email and password.
 *
 * Expected Request Body:
 * {
 *   "email": "john@example.com",
 *   "password": "plainTextPassword123"
 * }
 *
 * Returns: User (without password) and a JWT token
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Use a generic message so we don't leak whether the email exists
    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare plain text password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Issue a JWT for the authenticated user
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Strip the password out of the response
    const { password: _password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
});

/**
 * GET /auth/me
 *
 * Retrieve the profile of the currently authenticated user.
 * Requires: Authorization: Bearer <token>
 *
 * Returns: Current user's profile (without password)
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Current user fetched successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching current user",
      error: error.message,
    });
  }
});

// Export router to be used in main application
export default router;
