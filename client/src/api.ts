import type {
  Spot,
  Me,
  Review,
  LockerDetail,
  LockerSummary,
  VisitEntry,
  Category,
  Tier,
  ConciergeResponse,
  SpotPhoto,
} from "./types";
import {
  filterStaticSpots,
  staticAreas,
  staticConcierge,
  staticRandom,
  staticSpot,
} from "./lib/staticCatalog";

const CONFIGURED_BASE = String(import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/$/, "");
const BASE = CONFIGURED_BASE || "/api";

export const apiStatus = {
  configured: import.meta.env.DEV || Boolean(CONFIGURED_BASE),
};

function backendUnavailable<T>(): Promise<T> {
  return Promise.reject(
    new Error("Member sign-in is not connected on this deployment yet.")
  );
}

function responseDeadline(milliseconds: number) {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(milliseconds)
    : undefined;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface SpotQuery {
  category?: Category | "all";
  tier?: Tier | "all";
  area?: string | "all";
  price?: string | "all";
  search?: string;
  visited?: "all" | "reviewed" | "wishlist";
}

export interface SaveToLockersBody {
  lockerIds?: string[];
  newLockerName?: string;
  newLockerDescription?: string;
}

export interface VisitBody {
  visitDate: string;
  rating: number;
  note?: string | null;
  favoriteItem?: string | null;
  companion?: string | null;
  wouldReturn: boolean;
}

export const api = {
  spots(q: SpotQuery = {}): Promise<Spot[]> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, String(v));
    });
    const qs = params.toString();
    if (!apiStatus.configured) return Promise.resolve(filterStaticSpots(q));
    return http<Spot[]>(`/spots${qs ? `?${qs}` : ""}`).catch(() => filterStaticSpots(q));
  },

  spot(slug: string): Promise<Spot> {
    if (!apiStatus.configured) return Promise.resolve(staticSpot(slug));
    return http<Spot>(`/spots/${slug}`).catch(() => staticSpot(slug));
  },

  areas(): Promise<string[]> {
    if (!apiStatus.configured) return Promise.resolve(staticAreas());
    return http<string[]>(`/areas`).catch(() => staticAreas());
  },

  random(q: SpotQuery = {}): Promise<Spot> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, String(v));
    });
    const qs = params.toString();
    if (!apiStatus.configured) return Promise.resolve(staticRandom(q));
    return http<Spot>(`/random${qs ? `?${qs}` : ""}`).catch(() => staticRandom(q));
  },

  concierge(prompt: string, excludeSlugs: string[] = []): Promise<ConciergeResponse> {
    if (!apiStatus.configured) return Promise.resolve(staticConcierge(prompt, excludeSlugs));
    return http<ConciergeResponse>(`/concierge`, {
      method: "POST",
      body: JSON.stringify({ prompt, excludeSlugs }),
      signal: responseDeadline(4_800),
    }).catch(() => staticConcierge(prompt, excludeSlugs));
  },

  // ---- auth ----
  me(): Promise<{ user: Me | null }> {
    if (!apiStatus.configured) return Promise.resolve({ user: null });
    return http<{ user: Me | null }>(`/auth/me`);
  },
  requestOtp(email: string): Promise<{ delivered: boolean; devCode?: string }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/auth/request-otp`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  verifyOtp(email: string, code: string): Promise<{ user: Me }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/auth/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },
  logout(): Promise<void> {
    if (!apiStatus.configured) return Promise.resolve();
    return http(`/auth/logout`, { method: "POST" });
  },
  updateMe(body: { displayName?: string | null }): Promise<{ user: Me }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/auth/me`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  deleteAccount(): Promise<void> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/auth/account`, { method: "DELETE" });
  },

  // ---- reviews ----
  addReview(
    slug: string,
    body: { score: number; tier: Tier; verdict: string; wouldReturn: boolean }
  ): Promise<Review> {
    if (!apiStatus.configured) return backendUnavailable();
    return http<Review>(`/spots/${slug}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  saveSpot(slug: string): Promise<{ saved: boolean }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/spots/${slug}/save`, { method: "POST" });
  },

  unsaveSpot(slug: string): Promise<{ saved: boolean }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/spots/${slug}/save`, { method: "DELETE" });
  },

  lockers(): Promise<{ lockers: LockerSummary[] }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/lockers`);
  },

  locker(id: string): Promise<{ locker: LockerDetail }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/lockers/${id}`);
  },

  createLocker(body: { name: string; description?: string | null }): Promise<{ locker: LockerSummary }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/lockers`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateLocker(id: string, body: { name: string; description?: string | null }): Promise<{ locker: LockerSummary }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/lockers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deleteLocker(id: string): Promise<void> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/lockers/${id}`, { method: "DELETE" });
  },

  saveToLockers(slug: string, body: SaveToLockersBody): Promise<{ saved: boolean; lockerIds: string[] }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/spots/${slug}/save-to-lockers`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  removeFromLocker(lockerId: string, slug: string): Promise<void> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/lockers/${lockerId}/spots/${slug}`, { method: "DELETE" });
  },

  visits(slug: string): Promise<{ visits: VisitEntry[] }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/spots/${slug}/visits`);
  },

  allVisits(): Promise<{ visits: VisitEntry[] }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/visits`);
  },

  addVisit(slug: string, body: VisitBody): Promise<{ visit: VisitEntry }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/spots/${slug}/visits`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateVisit(id: string, body: VisitBody): Promise<{ visit: VisitEntry }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/visits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deleteVisit(id: string): Promise<void> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/visits/${id}`, { method: "DELETE" });
  },

  uploadPhoto(
    slug: string,
    body: { imageBase64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; caption?: string | null; visibility: "public" | "private" }
  ): Promise<{ photo: SpotPhoto }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/spots/${slug}/photos`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updatePhoto(id: string, body: { caption?: string | null; visibility?: "public" | "private" }): Promise<{ photo: SpotPhoto }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/photos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deletePhoto(id: string): Promise<void> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/photos/${id}`, { method: "DELETE" });
  },

  reportContent(body: {
    targetType: "review" | "photo" | "spot";
    targetId: string;
    reason: "inappropriate" | "spam" | "misleading" | "copyright" | "other";
    details?: string | null;
  }): Promise<{ received: boolean }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/reports`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  blockUser(userId: string): Promise<{ blocked: boolean }> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/blocks/${userId}`, { method: "POST" });
  },

  unblockUser(userId: string): Promise<void> {
    if (!apiStatus.configured) return backendUnavailable();
    return http(`/blocks/${userId}`, { method: "DELETE" });
  },
};
