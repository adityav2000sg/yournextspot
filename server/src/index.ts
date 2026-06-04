import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { env, hasClaude, hasEmail } from "./env.js";
import { spotsRouter } from "./routes/spots.js";
import { authRouter } from "./routes/auth.js";
import { conciergeRouter } from "./routes/concierge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: env.clientOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  })
);

// ---- API ----
const api = express.Router();
api.get("/health", (_req, res) =>
  res.json({ ok: true, claude: hasClaude, email: hasEmail })
);
api.use("/auth", authRouter);
api.use("/concierge", conciergeRouter);
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
