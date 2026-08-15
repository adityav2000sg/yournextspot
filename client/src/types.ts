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

export interface SpotPhoto {
  id: string;
  imageUrl: string;
  caption: string | null;
  visibility: "public" | "private";
  status: "pending" | "approved" | "rejected";
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
  coverImageUrl: string | null;
  saved?: boolean;
  reviewCount: number;
  avgScore: number | null;
  communityTier: Tier | null;
  reviews?: Review[];
  photos?: SpotPhoto[];
}

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
}

export interface VisitEntry {
  id: string;
  spotId: string;
  visitDate: string;
  rating: number;
  note: string | null;
  favoriteItem: string | null;
  companion: string | null;
  wouldReturn: boolean;
  createdAt: string;
  updatedAt: string;
  spot?: Pick<Spot, "id" | "slug" | "name" | "area" | "cuisine" | "price">;
}

export interface LockerSummary {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  visitedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LockerItem {
  id: string;
  createdAt: string;
  spot: Spot;
  visits: VisitEntry[];
}

export interface LockerDetail extends LockerSummary {
  items: LockerItem[];
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
