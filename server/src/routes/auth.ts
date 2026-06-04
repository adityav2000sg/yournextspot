import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { sendOtpEmail } from "../lib/email.js";
import { hasEmail } from "../env.js";
import { clearToken, issueToken, readToken } from "../lib/auth.js";

export const authRouter = Router();

const OTP_TTL_MS = 10 * 60 * 1000;

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const emailSchema = z.object({ email: z.string().email() });

authRouter.post("/request-otp", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email." });
  }
  const email = parsed.data.email.toLowerCase();
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
    // In dev (no email provider) we surface the code so login still works.
    devCode: hasEmail ? undefined : code,
  });
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

authRouter.post("/verify-otp", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter the 6-digit code." });
  }
  const email = parsed.data.email.toLowerCase();

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
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

authRouter.post("/logout", (_req, res) => {
  clearToken(res);
  res.status(204).end();
});
