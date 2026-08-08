import jwt, { SignOptions } from "jsonwebtoken";

/**
 * ============================================
 * JWT HELPERS
 * ============================================
 *
 * Centralized helpers for signing and verifying JSON Web Tokens.
 * JWT_SECRET and JWT_EXPIRES_IN must be defined in your .env file.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not defined in .env file. Please set a strong secret."
  );
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Sign a new JWT for an authenticated user
 */
export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
};

/**
 * Verify a JWT and return its decoded payload.
 * Throws if the token is invalid or expired.
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
};
