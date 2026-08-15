import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the repo-root .env (one level up from /server) and a local .env if present.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  isProd: process.env.NODE_ENV === "production",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  otpFromEmail: process.env.OTP_FROM_EMAIL ?? "YourNextSpot <onboarding@resend.dev>",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",

  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(__dirname, "../../uploads"),
  publicMediaBase: (process.env.PUBLIC_MEDIA_BASE ?? "").replace(/\/$/, ""),
};

export const hasEmail = Boolean(env.resendApiKey);
export const hasClaude = Boolean(env.anthropicApiKey);
