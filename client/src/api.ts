import type {
  Spot,
  Me,
  Review,
  Category,
  Tier,
  ConciergeResponse,
} from "./types";

const BASE = "/api";

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

export const api = {
  spots(q: SpotQuery = {}): Promise<Spot[]> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, String(v));
    });
    const qs = params.toString();
    return http<Spot[]>(`/spots${qs ? `?${qs}` : ""}`);
  },

  spot(slug: string): Promise<Spot> {
    return http<Spot>(`/spots/${slug}`);
  },

  areas(): Promise<string[]> {
    return http<string[]>(`/areas`);
  },

  random(q: SpotQuery = {}): Promise<Spot> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, String(v));
    });
    const qs = params.toString();
    return http<Spot>(`/random${qs ? `?${qs}` : ""}`);
  },

  concierge(prompt: string): Promise<ConciergeResponse> {
    return http<ConciergeResponse>(`/concierge`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
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
};
