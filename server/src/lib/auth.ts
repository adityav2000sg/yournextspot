import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";

const COOKIE_NAME = "yns_token";

export type AuthPayload = { userId: string; email: string };

export function issueToken(res: Response, payload: AuthPayload) {
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "30d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    // Netlify and Railway use different sites in production. SameSite=None keeps
    // credentialed requests working there and in the Capacitor iOS shell.
    sameSite: env.isProd ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearToken(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
  });
}

export function readToken(req: Request): AuthPayload | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return null;
  try {
    return jwt.verify(raw, env.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = readToken(req);
  if (!auth) return res.status(401).json({ error: "Not signed in." });
  (req as Request & { auth: AuthPayload }).auth = auth;
  next();
}
