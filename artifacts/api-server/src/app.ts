import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from "express";
import { createWebsiteAccessGate } from "./lib/websiteAccess";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));

const websiteAccess = createWebsiteAccessGate();
app.use("/api", websiteAccess.router, websiteAccess.requireAccess, router);
app.use((error: Error & { code?: string; status?: number; issues?: Array<{ code: string; path: Array<string | number> }> }, req: Request, res: Response, _next: NextFunction) => {
  // Record actionable technical context without logging report bodies, cookies or signed URLs.
  req.log.error({
    errorType: error.name,
    code: error.code,
    validationIssues: error.name === "ZodError" && Array.isArray(error.issues)
      ? error.issues.map(issue => ({ code: issue.code, path: issue.path })) : undefined,
  }, "SafeMap request failed");
  const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 503;
  res.status(status).json({
    error: status === 503 ? (req.method === "POST" && req.path === "/api/safemap/reports"
      ? "Report could not be saved. Please try again." : "Unable to load reports.") : "Invalid request.",
  });
});

export default app;
