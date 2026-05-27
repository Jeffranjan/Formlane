import express, { type Request, type Response, type NextFunction } from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";

export const app = express();

// Trust the first proxy so req.ip reflects the real client IP (used for rate-limit hashing)
app.set("trust proxy", 1);

const openApiOptions = {
  title: "Formlane API",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
};

let _cachedOpenApiDocument: ReturnType<typeof generateOpenApiDocument> | null = null;

function getOpenApiDocument() {
  if (env.NODE_ENV === "development") {
    // Regenerate on every request in dev so schema changes are reflected immediately
    try {
      return generateOpenApiDocument(serverRouter, openApiOptions);
    } catch (e) {
      logger.warn("OpenAPI generation failed: " + (e as Error).message);
      return { openapi: "3.0.0", info: openApiOptions, paths: {} };
    }
  }
  if (!_cachedOpenApiDocument) {
    try {
      _cachedOpenApiDocument = generateOpenApiDocument(serverRouter, openApiOptions);
    } catch (e) {
      logger.warn("OpenAPI generation failed: " + (e as Error).message);
      _cachedOpenApiDocument = { openapi: "3.0.0", info: openApiOptions, paths: {} } as ReturnType<typeof generateOpenApiDocument>;
    }
  }
  return _cachedOpenApiDocument;
}

// Build the allowed origins list from env — always include localhost for dev,
// plus any production frontend URL set via ALLOWED_ORIGINS (comma-separated).
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()) : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json());

// Parse cookies before any route handler
app.use(cookieParser());

// Correlation-id middleware: propagate or generate a UUID per request
app.use((req: Request, res: Response, next: NextFunction) => {
  const existing = req.headers["x-correlation-id"];
  const correlationId = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
  req.headers["x-correlation-id"] = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
});

app.get("/", (req, res) => {
  return res.json({ message: "Formlane is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Formlane server is healthy", healthy: true });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(getOpenApiDocument());
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

// Global error handler — must be registered AFTER all routes (4-argument signature)
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const correlationId = req.headers["x-correlation-id"] as string | undefined;
  const statusCode = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode
    ?? 500;
  const code = (err as { code?: string })?.code;
  const stack = (err as { stack?: string })?.stack;

  logger.error({
    correlationId,
    method: req.method,
    path: req.path,
    statusCode,
    code,
    stack,
  });

  res.status(statusCode).json({
    error: (err as { message?: string })?.message ?? "Internal Server Error",
  });
});

export default app;
