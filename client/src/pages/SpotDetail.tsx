import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { Review, Spot } from "../types";
import { CATEGORY_META, scoreToTier } from "../lib/tiers";
import { useAuth } from "../lib/auth";
import TierCrest from "../components/TierCrest";
import SpotMap from "../components/SpotMap";
import ShareCard from "../components/ShareCard";
import SaveSpotButton from "../components/SaveSpotButton";
import VisitEntryPanel from "../components/VisitEntryPanel";
import ReviewForm from "../components/ReviewForm";
import PhotoGallery from "../components/PhotoGallery";
import ReportButton from "../components/ReportButton";
import BlockButton from "../components/BlockButton";
import {
  chipClass,
  chooseAlternativeDetails,
  chooseAlternatives,
  decisionBrief,
  fitChips,
  queryForSimilarPull,
  scoreOf,
} from "../lib/decision";
import { useSingaporeClock } from "../components/LiveStatus";

interface Props {
  onSignIn: () => void;
}

export default function SpotDetail({ onSignIn }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [nearby, setNearby] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sharing, setSharing] = useState(false);
  const timeContext = useSingaporeClock();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    api.spot(slug).then(setSpot).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!spot) return;
    api.spots({ category: spot.category, area: spot.area ?? "all" })
      .then((spots) => setNearby(chooseAlternatives(spot, spots, 3)))
      .catch(() => setNearby([]));
  }, [spot?.id]);

  const detail = useMemo(() => (spot ? decisionBrief(spot, timeContext) : null), [spot, timeContext]);
  const nearbyDetails = useMemo(
    () => (spot ? chooseAlternativeDetails(spot, nearby, {}, 3, timeContext) : []),
    [spot, nearby, timeContext]
  );

  function saveReview(review: Review) {
    setSpot((current) => {
      if (!current) return current;
      const previous = current.reviews ?? [];
      const reviews = previous.some((item) => item.id === review.id || item.mine)
        ? previous.map((item) => (item.id === review.id || item.mine ? review : item))
        : [review, ...previous];
      const avgScore = Math.round((reviews.reduce((sum, item) => sum + item.score, 0) / reviews.length) * 10) / 10;
      return { ...current, reviews, reviewCount: reviews.length, avgScore, communityTier: scoreToTier(avgScore) };
    });
  }

  function hideBlockedMember(userId: string) {
    setSpot((current) => {
      if (!current) return current;
      const reviews = (current.reviews ?? []).filter((review) => review.authorId !== userId);
      const avgScore = reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length) * 10) / 10
        : null;
      return {
        ...current,
        reviews,
        photos: (current.photos ?? []).filter((photo) => photo.authorId !== userId),
        reviewCount: reviews.length,
        avgScore,
        communityTier: avgScore == null ? null : scoreToTier(avgScore),
      };
    });
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-5 py-20"><div className="h-80 animate-pulse rounded-3xl bg-white/[0.04]" /></main>;
  }

  if (notFound || !spot || !detail) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-32 text-center">
        <p className="font-display text-3xl text-mist-100">That place is not in the atlas.</p>
        <Link to="/#atlas" className="btn-secondary mt-5">Back to the atlas</Link>
      </main>
    );
  }

  const cat = CATEGORY_META[spot.category];
  const tier = spot.communityTier ?? spot.ownerTier;
  const score = scoreOf(spot);
  const reviews = spot.reviews ?? [];
  const mine = reviews.find((review) => review.mine);
  const chips = fitChips(spot, {}, timeContext);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-5 sm:pt-12">
      <Link to="/#atlas" className="inline-flex items-center gap-2 text-sm text-mist-400 hover:text-mist-100">← Back to the atlas</Link>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-white/10 bg-ink-800/70 p-5 sm:p-8">
          <p className="eyebrow">{cat.glyph} {cat.label} · {spot.area ?? "Singapore"}</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <h1 className="break-words font-display text-5xl leading-[0.95] tracking-tight text-mist-100 sm:text-7xl">{spot.name}</h1>
              <p className="mt-3 text-mist-400">{[spot.cuisine, spot.price].filter(Boolean).join(" · ")}</p>
            </div>
            {score != null && (
              <div className="rounded-2xl border border-gilt/25 bg-gilt/10 px-4 py-3 text-right">
                <strong className="font-mono text-3xl text-gilt">{score.toFixed(1)}</strong>
                <span className="block text-xs text-mist-400">from {spot.reviewCount} member review{spot.reviewCount === 1 ? "" : "s"}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tier && <TierCrest tier={tier} size="lg" />}
            {chips.map((chip) => <span key={`${chip.tone}-${chip.label}`} className={`decision-chip ${chipClass(chip.tone)}`}>{chip.label}</span>)}
          </div>

          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            <div className="bg-ink-800 p-4 sm:p-5">
              <p className="eyebrow">Why it fits</p>
              <p className="mt-2 leading-7 text-mist-200">{detail.whyGo}</p>
            </div>
            <div className="bg-ink-800 p-4 sm:p-5">
              <p className="eyebrow">Reality check</p>
              <p className="mt-2 text-sm leading-6 text-mist-300">{detail.caveat}</p>
            </div>
            <div className="bg-ink-800 p-4 sm:p-5">
              <p className="eyebrow">Best for</p>
              <p className="mt-2 text-sm leading-6 text-mist-300">{detail.bestFor}</p>
            </div>
            <div className="bg-ink-800 p-4 sm:p-5">
              <p className="eyebrow">Before you leave</p>
              <p className="mt-2 text-sm leading-6 text-mist-300">Hours are not verified yet. Check the live listing before you go.</p>
            </div>
          </div>

          {spot.address && <p className="mt-5 text-sm leading-6 text-mist-300">{spot.address}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {spot.googleMapsUrl && <a href={spot.googleMapsUrl} target="_blank" rel="noreferrer" className="btn-primary">Open in Maps</a>}
            <SaveSpotButton slug={spot.slug} saved={spot.saved} onSignIn={onSignIn} onChange={(saved) => setSpot((current) => current ? { ...current, saved } : current)} />
            <button type="button" onClick={() => setSharing(true)} className="btn-secondary">Share</button>
            <Link to={queryForSimilarPull(spot)} className="btn-secondary">Find something similar</Link>
            <Link to="/contact" className="btn-secondary">Correct this listing</Link>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="eyebrow">Your side of the story</p>
            <h2 className="mt-2 font-display text-2xl text-mist-100">Public review or private memory?</h2>
            <p className="mt-3 text-sm leading-6 text-mist-400">A review helps everyone decide. A food-log entry is visible only to you. You can do either—or both.</p>
            <a href="#contribute" className="btn-primary mt-4 w-full">Add yours</a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="eyebrow">Nearby alternatives</p>
            <div className="mt-4 grid gap-2">
              {nearbyDetails.length > 0 ? nearbyDetails.map(({ spot: alternative, reason }) => (
                <Link key={alternative.id} to={`/spot/${alternative.slug}`} className="alternative-row">
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-mist-100">{alternative.name}</strong>
                    <small className="mt-1 block truncate text-mist-400">{reason}</small>
                  </span>
                  <span aria-hidden>→</span>
                </Link>
              )) : <p className="text-sm leading-6 text-mist-400">No close alternatives found.</p>}
            </div>
          </div>
        </aside>
      </section>

      <PhotoGallery
        slug={spot.slug}
        coverImageUrl={spot.coverImageUrl}
        photos={spot.photos ?? []}
        signedIn={Boolean(user)}
        onSignIn={onSignIn}
        onChange={(photos) => setSpot((current) => current ? { ...current, photos } : current)}
        onBlocked={hideBlockedMember}
      />

      {spot.lat != null && spot.lng != null && (
        <section className="mt-5 h-80 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-2">
          <SpotMap spots={[spot, ...nearby.filter((item) => item.lat != null && item.lng != null)]} />
        </section>
      )}

      <section id="contribute" className="mt-10 scroll-mt-28">
        <div>
          <p className="eyebrow">People who went</p>
          <h2 className="mt-1 font-display text-4xl text-mist-100">Reviews <span className="text-mist-500">{reviews.length}</span></h2>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-7 text-mist-400">No public reviews yet. The first one should come from someone who genuinely went.</div>
            ) : (
              <ul className="grid gap-3">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div><strong className="text-mist-100">{review.authorName}</strong>{review.mine && <span className="ml-2 text-xs text-aqua">you</span>}</div>
                      <span className="font-mono text-gilt">{review.score.toFixed(1)}</span>
                    </div>
                    <p className="mt-3 leading-7 text-mist-200">{review.verdict}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <TierCrest tier={review.tier} size="sm" />
                      <span className={`decision-chip ${review.wouldReturn ? "border-aqua/25 bg-aqua/10 text-aqua" : "border-ember/25 bg-ember/10 text-ember"}`}>
                        {review.wouldReturn ? "would return" : "one and done"}
                      </span>
                      {!review.mine && (
                        <span className="ml-auto flex items-center gap-3">
                          <ReportButton targetType="review" targetId={review.id} signedIn={Boolean(user)} onSignIn={onSignIn} />
                          {user && review.authorId && <BlockButton userId={review.authorId} onBlocked={hideBlockedMember} />}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid content-start gap-4">
            {user ? (
              <>
                <ReviewForm slug={spot.slug} existingReview={mine} onAdded={saveReview} />
                <VisitEntryPanel slug={spot.slug} />
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <p className="eyebrow">Members</p>
                <h3 className="mt-2 font-display text-2xl text-mist-100">Add a review or keep a private food log.</h3>
                <p className="mt-3 text-sm leading-6 text-mist-400">Sign in by email code. No password, and nothing is posted without you choosing to post it.</p>
                <button type="button" onClick={onSignIn} className="btn-primary mt-5 w-full">Sign in to contribute</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {sharing && <ShareCard spot={spot} onClose={() => setSharing(false)} />}
    </main>
  );
}
