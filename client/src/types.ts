export type Category = "restaurant" | "coffee" | "bar";

export type Tier =
  | "everyday_delight"
  | "thoughtful_treat"
  | "memorable_occasion"
  | "landmark_celebration"
  | "crown_jewel";

export interface Review {
  id: string;
  authorName: string;
  score: number;
  tier: Tier;
  verdict: string;
  wouldReturn: boolean;
  isSeed: boolean;
  createdAt: string;
  mine?: boolean;
}

export interface Spot {
  id: string;
  slug: string;
  name: string;
  category: Category;
  cuisine: string | null;
  price: string | null;
  address: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string | null;
  ownerTier: Tier | null;
  ownerScore: number | null;
  ownerVerdict: string | null;
  notes: string | null;
  wishlist: boolean;
  needsReview: boolean;
  saved?: boolean;
  reviewCount: number;
  avgScore: number | null;
  communityTier: Tier | null;
  reviews?: Review[];
}

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
}

export interface ConciergePick {
  slug: string;
  reason: string;
}

export interface ConciergeResponse {
  mood: string;
  picks: ConciergePick[];
  spots: Spot[];
  source: "claude" | "local" | "clarification";
  suggestions?: string[];
}
