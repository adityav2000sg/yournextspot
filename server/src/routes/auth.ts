import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { sendOtpEmail } from "../lib/email.js";
import { env, hasEmail } from "../env.js";
import { clearToken, issueToken, readToken } from "../lib/auth.js";
import { ensureDefaultLockers } from "../lib/lockers.js";
import fs from "node:fs/promises";
import path from "node:path";

export const authRouter = Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function allowed(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= maximum) return false;
  current.count += 1;
  return true;
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const emailSchema = z.object({ email: z.string().email() });

authRouter.post("/request-otp", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email." });
  }
  if (env.isProd && !hasEmail) {
    return res.status(503).json({
      error: "Email sign-in is temporarily unavailable.",
    });
  }
  const email = parsed.data.email.toLowerCase();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!allowed(`otp-email:${email}`, 5, 60 * 60 * 1000) || !allowed(`otp-ip:${ip}`, 20, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many code requests. Try again later." });
  }
  const code = genCode();
  const codeHash = await bcrypt.hash(code, 10);

  // Invalidate previous unconsumed codes for this email.
  await prisma.otpCode.updateMany({
    where: { email, consumed: false },
    data: { consumed: true },
  });
  await prisma.otpCode.create({
    data: { email, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  const { delivered } = await sendOtpEmail(email, code);
  res.json({
    delivered,
    // Local development can surface the code; production never returns it.
    devCode: !env.isProd && !hasEmail ? code : undefined,
  });
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).nullable().optional(),
});

authRouter.post("/verify-otp", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter the 6-digit code." });
  }
  const email = parsed.data.email.toLowerCase();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (!allowed(`verify-email:${email}`, 8, 15 * 60 * 1000) || !allowed(`verify-ip:${ip}`, 30, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many attempts. Request a new code later." });
  }

  const record = await prisma.otpCode.findFirst({
    where: { email, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) {
    return res.status(400).json({ error: "Code expired. Request a new one." });
  }
  const ok = await bcrypt.compare(parsed.data.code, record.codeHash);
  if (!ok) {
    return res.status(400).json({ error: "Incorrect code." });
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumed: true },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, displayName: email.split("@")[0] },
  });
  await ensureDefaultLockers(user.id);

  issueToken(res, { userId: user.id, email: user.email });
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

authRouter.get("/me", async (req, res) => {
  const auth = readToken(req);
  if (!auth) return res.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return res.json({ user: null });
  await ensureDefaultLockers(user.id);
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

authRouter.post("/logout", (_req, res) => {
  clearToken(res);
  res.status(204).end();
});

authRouter.patch("/me", async (req, res) => {
  const auth = readToken(req);
  if (!auth) return res.status(401).json({ error: "Not signed in." });
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid profile name." });
  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: { displayName: parsed.data.displayName || null },
  });
  res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
});

authRouter.delete("/account", async (req, res) => {
  const auth = readToken(req);
  if (!auth) return res.status(401).json({ error: "Not signed in." });
  const photos = await prisma.spotPhoto.findMany({
    where: { userId: auth.userId },
    select: { imageUrl: true },
  });
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { userId: auth.userId } }),
    prisma.spotPhoto.deleteMany({ where: { userId: auth.userId } }),
    prisma.user.delete({ where: { id: auth.userId } }),
  ]);
  await Promise.all(photos.map(async ({ imageUrl }) => {
    const fileName = path.basename(new URL(imageUrl, "http://local").pathname);
    try {
      await fs.unlink(path.join(env.uploadDir, fileName));
    } catch {
      // Missing files should not prevent account deletion.
    }
  }));
  clearToken(res);
  res.status(204).end();
});
