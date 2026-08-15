import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { env, hasClaude, hasEmail } from "./env.js";
import { prisma } from "./prisma.js";
import { readToken } from "./lib/auth.js";
import { spotsRouter } from "./routes/spots.js";
import { authRouter } from "./routes/auth.js";
import { conciergeRouter } from "./routes/concierge.js";
import { lockersRouter } from "./routes/lockers.js";
import { photosRouter } from "./routes/photos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "6mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: env.clientOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  })
);

fs.mkdirSync(env.uploadDir, { recursive: true });
app.get("/media/:fileName", async (req, res) => {
  const fileName = path.basename(req.params.fileName);
  if (fileName !== req.params.fileName || !/^[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(fileName)) {
    return res.status(404).end();
  }
  const photo = await prisma.spotPhoto.findFirst({
    where: { imageUrl: { endsWith: `/media/${fileName}` } },
  });
  if (!photo) return res.status(404).end();

  const auth = readToken(req);
  const isPublic = photo.visibility === "public" && photo.status === "approved";
  if (!isPublic && photo.userId !== auth?.userId) return res.status(404).end();

  res.setHeader("Cache-Control", isPublic && env.isProd ? "public, max-age=604800, immutable" : "private, no-store");
  res.sendFile(path.join(env.uploadDir, fileName));
});

// ---- API ----
const api = express.Router();
api.get("/health", (_req, res) =>
  res.json({ ok: true, claude: hasClaude, email: hasEmail })
);
api.use("/auth", authRouter);
api.use("/concierge", conciergeRouter);
api.use("/", photosRouter);
api.use("/", lockersRouter);
api.use("/", spotsRouter);
app.use("/api", api);

// ---- Static client (production) ----
// In the built image, client/dist sits next to server/dist.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(env.port, () => {
  console.log(`\n  YourNextSpot API ready on http://localhost:${env.port}`);
  console.log(`  Claude concierge: ${hasClaude ? "live" : "local fallback"}`);
  console.log(`  Email OTP: ${hasEmail ? "live (Resend)" : "console (dev)"}\n`);
});
