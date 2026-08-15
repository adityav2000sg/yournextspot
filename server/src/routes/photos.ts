import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { AuthPayload } from "../lib/auth.js";
import { requireAuth } from "../lib/auth.js";
import { env } from "../env.js";
import { prisma } from "../prisma.js";

export const photosRouter = Router();

const uploadSchema = z.object({
  imageBase64: z.string().min(32).max(5_600_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  caption: z.string().trim().max(180).optional().nullable(),
  visibility: z.enum(["public", "private"]).default("private"),
});

const updateSchema = z.object({
  caption: z.string().trim().max(180).optional().nullable(),
  visibility: z.enum(["public", "private"]).optional(),
});

function auth(req: Parameters<typeof requireAuth>[0]) {
  return (req as typeof req & { auth: AuthPayload }).auth;
}

function validImageBytes(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function extension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function serializePhoto(photo: {
  id: string;
  imageUrl: string;
  caption: string | null;
  visibility: "public" | "private";
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  userId: string | null;
}, userId: string) {
  return {
    id: photo.id,
    imageUrl: photo.imageUrl,
    caption: photo.caption,
    visibility: photo.visibility,
    status: photo.status,
    createdAt: photo.createdAt.toISOString(),
    mine: photo.userId === userId,
  };
}

photosRouter.post("/spots/:slug/photos", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a JPG, PNG, or WebP image under 4 MB." });

  const spot = await prisma.spot.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const buffer = Buffer.from(parsed.data.imageBase64, "base64");
  if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024 || !validImageBytes(buffer, parsed.data.mimeType)) {
    return res.status(400).json({ error: "That image could not be verified. Use a JPG, PNG, or WebP under 4 MB." });
  }

  await fs.mkdir(env.uploadDir, { recursive: true });
  const filename = `${randomUUID()}.${extension(parsed.data.mimeType)}`;
  await fs.writeFile(path.join(env.uploadDir, filename), buffer, { flag: "wx" });
  const mediaBase = env.publicMediaBase || `${req.protocol}://${req.get("host")}`;
  const photo = await prisma.spotPhoto.create({
    data: {
      spotId: spot.id,
      userId,
      imageUrl: `${mediaBase}/media/${filename}`,
      caption: parsed.data.caption || null,
      visibility: parsed.data.visibility,
      // Family beta uploads are immediately visible. The status field supports a later moderation queue.
      status: "approved",
    },
  });

  res.status(201).json({ photo: serializePhoto(photo, userId) });
});

photosRouter.patch("/photos/:photoId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid photo settings." });
  const existing = await prisma.spotPhoto.findFirst({ where: { id: req.params.photoId, userId } });
  if (!existing) return res.status(404).json({ error: "Photo not found." });
  const photo = await prisma.spotPhoto.update({
    where: { id: existing.id },
    data: {
      caption: parsed.data.caption === undefined ? undefined : parsed.data.caption || null,
      visibility: parsed.data.visibility,
    },
  });
  res.json({ photo: serializePhoto(photo, userId) });
});

photosRouter.delete("/photos/:photoId", requireAuth, async (req, res) => {
  const { userId } = auth(req);
  const photo = await prisma.spotPhoto.findFirst({ where: { id: req.params.photoId, userId } });
  if (!photo) return res.status(404).json({ error: "Photo not found." });
  await prisma.spotPhoto.delete({ where: { id: photo.id } });

  const marker = "/media/";
  const markerIndex = photo.imageUrl.lastIndexOf(marker);
  if (markerIndex !== -1) {
    const filename = path.basename(photo.imageUrl.slice(markerIndex + marker.length));
    await fs.unlink(path.join(env.uploadDir, filename)).catch(() => undefined);
  }
  res.status(204).end();
});
