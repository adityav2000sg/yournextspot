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

const BASE = import.meta.env.VITE_API_BASE || "/api";

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
    return http<Spot[]>(`/spots${qs ? `?${qs}` : ""}`).catch(() => filterStaticSpots(q));
  },

  spot(slug: string): Promise<Spot> {
    return http<Spot>(`/spots/${slug}`).catch(() => staticSpot(slug));
  },

  areas(): Promise<string[]> {
    return http<string[]>(`/areas`).catch(() => staticAreas());
  },

  random(q: SpotQuery = {}): Promise<Spot> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, String(v));
    });
    const qs = params.toString();
    return http<Spot>(`/random${qs ? `?${qs}` : ""}`).catch(() => staticRandom(q));
  },

  concierge(prompt: string): Promise<ConciergeResponse> {
    return http<ConciergeResponse>(`/concierge`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }).catch(() => staticConcierge(prompt));
  },

  // ---- auth ----
  me(): Promise<{ user: Me | null }> {
    return http<{ user: Me | null }>(`/auth/me`);
  },
  requestOtp(email: string): Promise<{ delivered: boolean; devCode?: string }> {
    return http(`/auth/request-otp`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  verifyOtp(email: string, code: string): Promise<{ user: Me }> {
    return http(`/auth/verify-otp`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },
  logout(): Promise<void> {
    return http(`/auth/logout`, { method: "POST" });
  },
  updateMe(body: { displayName?: string | null }): Promise<{ user: Me }> {
    return http(`/auth/me`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  deleteAccount(): Promise<void> {
    return http(`/auth/account`, { method: "DELETE" });
  },

  // ---- reviews ----
  addReview(
    slug: string,
    body: { score: number; tier: Tier; verdict: string; wouldReturn: boolean }
  ): Promise<Review> {
    return http<Review>(`/spots/${slug}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  saveSpot(slug: string): Promise<{ saved: boolean }> {
    return http(`/spots/${slug}/save`, { method: "POST" });
  },

  unsaveSpot(slug: string): Promise<{ saved: boolean }> {
    return http(`/spots/${slug}/save`, { method: "DELETE" });
  },

  lockers(): Promise<{ lockers: LockerSummary[] }> {
    return http(`/lockers`);
  },

  locker(id: string): Promise<{ locker: LockerDetail }> {
    return http(`/lockers/${id}`);
  },

  createLocker(body: { name: string; description?: string | null }): Promise<{ locker: LockerSummary }> {
    return http(`/lockers`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateLocker(id: string, body: { name: string; description?: string | null }): Promise<{ locker: LockerSummary }> {
    return http(`/lockers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deleteLocker(id: string): Promise<void> {
    return http(`/lockers/${id}`, { method: "DELETE" });
  },

  saveToLockers(slug: string, body: SaveToLockersBody): Promise<{ saved: boolean; lockerIds: string[] }> {
    return http(`/spots/${slug}/save-to-lockers`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  removeFromLocker(lockerId: string, slug: string): Promise<void> {
    return http(`/lockers/${lockerId}/spots/${slug}`, { method: "DELETE" });
  },

  visits(slug: string): Promise<{ visits: VisitEntry[] }> {
    return http(`/spots/${slug}/visits`);
  },

  allVisits(): Promise<{ visits: VisitEntry[] }> {
    return http(`/visits`);
  },

  addVisit(slug: string, body: VisitBody): Promise<{ visit: VisitEntry }> {
    return http(`/spots/${slug}/visits`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateVisit(id: string, body: VisitBody): Promise<{ visit: VisitEntry }> {
    return http(`/visits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deleteVisit(id: string): Promise<void> {
    return http(`/visits/${id}`, { method: "DELETE" });
  },

  uploadPhoto(
    slug: string,
    body: { imageBase64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; caption?: string | null; visibility: "public" | "private" }
  ): Promise<{ photo: SpotPhoto }> {
    return http(`/spots/${slug}/photos`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updatePhoto(id: string, body: { caption?: string | null; visibility?: "public" | "private" }): Promise<{ photo: SpotPhoto }> {
    return http(`/photos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  deletePhoto(id: string): Promise<void> {
    return http(`/photos/${id}`, { method: "DELETE" });
  },
};
