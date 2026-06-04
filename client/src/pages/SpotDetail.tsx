import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { Review, Spot } from "../types";
import { CATEGORY_META, tierMeta } from "../lib/tiers";
import { useAuth } from "../lib/auth";
import TierCrest from "../components/TierCrest";
import SpotMap from "../components/SpotMap";
import ReviewForm from "../components/ReviewForm";
import ShareCard from "../components/ShareCard";
import SaveSpotButton from "../components/SaveSpotButton";

interface Props {
  onSignIn: () => void;
}

export default function SpotDetail({ onSignIn }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    api
      .spot(slug)
      .then(setSpot)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  function onReviewAdded(review: Review) {
    setSpot((prev) =>
      prev
        ? {
            ...prev,
            reviews: [review, ...(prev.reviews ?? [])],
            reviewCount: prev.reviewCount + 1,
          }
        : prev
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20">
        <div className="h-64 animate-pulse rounded-3xl bg-ink-700/50" />
      </main>
    );
  }

  if (notFound || !spot) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-32 text-center">
        <p className="font-display text-2xl text-mist-100">Spot not found.</p>
        <Link to="/" className="btn-ghost mt-4">
          ← back to the atlas
        </Link>
      </main>
    );
  }

  const cat = CATEGORY_META[spot.category];
  const tier = spot.ownerTier ?? spot.communityTier;
  const score = spot.ownerScore ?? spot.avgScore;
  const reviews = spot.reviews ?? [];

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
      <Link to="/" className="btn-ghost mb-6 text-sm">
        ← the atlas
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl glass p-7 sm:p-10">
        {tierMeta(tier) && (
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl opacity-30"
            style={{
              background: `radial-gradient(circle, ${tierMeta(tier)!.to}, transparent 70%)`,
            }}
            aria-hidden
          />
        )}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-mist-400">
          <span aria-hidden>{cat.glyph}</span>
          <span>{spot.cuisine ?? cat.label}</span>
          {spot.wishlist && <span className="text-orchid">· on the to-try list</span>}
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl text-mist-100 sm:text-5xl">
            {spot.name}
          </h1>
          {score != null && (
            <div className="text-right">
              <div className="font-mono text-4xl leading-none text-mist-100">
                {score.toFixed(1)}
                <span className="text-lg text-mist-400">/10</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-mist-400">
                Worth-It Score
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TierCrest tier={tier} size="lg" />
          {spot.price && (
            <span className="chip bg-ink-600 text-mist-300">{spot.price}</span>
          )}
          {spot.area && (
            <span className="chip bg-ink-600 text-mist-300">{spot.area}</span>
          )}
        </div>

        {spot.ownerVerdict && (
          <p className="mt-6 font-display text-2xl leading-snug text-mist-100">
            “{spot.ownerVerdict}”
          </p>
        )}

        {spot.address && (
          <p className="mt-4 text-sm text-mist-300">{spot.address}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <SaveSpotButton
            slug={spot.slug}
            saved={spot.saved}
            onSignIn={onSignIn}
            onChange={(saved) => setSpot((prev) => (prev ? { ...prev, saved } : prev))}
          />
          {spot.googleMapsUrl && (
            <a
              href={spot.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn bg-mist-100 text-ink-900 hover:bg-white"
            >
              Open in Google Maps ↗
            </a>
          )}
          <button
            onClick={() => setSharing(true)}
            className="btn bg-white/10 text-mist-100 hover:bg-white/15"
          >
            Share card ✨
          </button>
        </div>
      </section>

      {/* Map */}
      {spot.lat != null && spot.lng != null && (
        <section className="mt-6 h-72 overflow-hidden rounded-3xl glass">
          <SpotMap spots={[spot]} />
        </section>
      )}

      {/* Reviews */}
      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-4 font-display text-2xl text-mist-100">
            Reviews{" "}
            <span className="text-mist-400">({spot.reviewCount})</span>
          </h2>
          {reviews.length === 0 ? (
            <p className="rounded-2xl glass p-6 text-mist-400">
              No reviews yet. Be the first to leave a verdict.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl glass p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-mist-100">
                        {r.authorName}
                      </span>
                      {r.mine && (
                        <span className="chip bg-orchid/20 text-orchid">you</span>
                      )}
                    </div>
                    <span className="font-mono text-mist-100">
                      {r.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-mist-300">“{r.verdict}”</p>
                  <div className="mt-3 flex items-center gap-2">
                    <TierCrest tier={r.tier} size="sm" />
                    <span
                      className={`chip ${
                        r.wouldReturn
                          ? "bg-aqua/15 text-aqua"
                          : "bg-ember/15 text-ember"
                      }`}
                    >
                      {r.wouldReturn ? "would return" : "one and done"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {user ? (
            <ReviewForm slug={spot.slug} onAdded={onReviewAdded} />
          ) : (
            <div className="rounded-2xl glass p-6 text-center">
              <p className="font-display text-xl text-mist-100">
                Got an opinion?
              </p>
              <p className="mt-2 text-sm text-mist-400">
                Sign in with your email to add your verdict to the atlas.
              </p>
              <button
                onClick={onSignIn}
                className="btn mt-4 w-full bg-mist-100 text-ink-900 hover:bg-white"
              >
                Sign in to review
              </button>
            </div>
          )}
        </div>
      </section>

      {sharing && <ShareCard spot={spot} onClose={() => setSharing(false)} />}
    </main>
  );
}
