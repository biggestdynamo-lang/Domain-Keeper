import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, metricsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const app: Express = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function incrementRequestCount(req: Request, _res: Response, next: NextFunction) {
  if (!req.path.startsWith("/internal")) {
    const today = new Date().toISOString().split("T")[0];
    db.execute(
      sql`INSERT INTO metrics (date, request_count, updated_at)
          VALUES (${today}, 1, NOW())
          ON CONFLICT (date) DO UPDATE
          SET request_count = metrics.request_count + 1,
              updated_at = NOW()`
    ).catch((err) => {
      logger.warn({ err }, "Failed to increment request count");
    });
  }
  next();
}

app.use("/api", incrementRequestCount);
app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(
    __dirname,
    "../../freeable-domains/dist/public",
  );

  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });

    logger.info({ frontendDist }, "Serving frontend static files");
  } else {
    logger.warn(
      { frontendDist },
      "Frontend dist not found — static serving skipped",
    );
  }
}

export default app;
