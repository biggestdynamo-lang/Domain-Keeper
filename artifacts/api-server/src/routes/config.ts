import { Router } from "express";
import { cloudflareEnabled } from "../lib/cloudflare";

const router = Router();

router.get("/config", (_req, res) => {
  res.json({ cloudflareEnabled });
});

export default router;
