import express from "express";
import cors from "cors";

import routes from "./routes";

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
      : "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Prisma Express Starter API",
  });
});

// API Routes
app.use("/api/v1", routes);

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// Global error handler - catches anything thrown/passed to next() in routes
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: express.NextFunction
  ) => {
    console.error(err);

    // Known Prisma error codes
    if (err.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: `Duplicate value for field: ${
          err.meta?.target?.join(", ") || "unknown"
        }`,
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    if (err.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid reference: related record does not exist",
      });
    }

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
);

export default app;