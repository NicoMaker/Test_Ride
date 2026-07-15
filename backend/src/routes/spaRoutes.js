// Router SPA: serve index.html per tutte le route che non iniziano con /api.
import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "../../../frontend", "index.html"));
  } else {
    next();
  }
});

export default router;
