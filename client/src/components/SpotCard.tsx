import { useState } from "react";
import { Link } from "react-router-dom";
import type { Spot } from "../types";
import { CATEGORY_META, tierMeta } from "../lib/tiers";
import TierCrest from "./TierCrest";
import SaveSpotButton from "./SaveSpotButton";
import { evaluateTimeFit, getSingaporeTimeContext } from "../lib/timeContext";

interface Props {
  spot: Spot;
  reason?: string;
  highlight?: boolean;
  onSignIn: () => void;
}

export default function SpotCard({ spot, reason, highlight, onSignIn }: Props) {
  const [saved, setSaved] = useState(Boolean(spot.saved));
  const category = CATEGORY_META[spot.category];
  const tier = spot.communityTier ?? spot.ownerTier;
  const tierStyle = tierMeta(tier);
  const communityScore = spot.reviewCount > 0 ? spot.avgScore : null;
  const timeFit = evaluateTimeFit(spot, getSingaporeTimeContext());

  return (
    <article className={`place-card ${highlight ? "is-highlighted" : ""}`}>
      <Link to={`/spot/${spot.slug}`} className="place-card-media" aria-label={`Open ${spot.name}`}>
        {spot.coverImageUrl ? (
          <img src={spot.coverImageUrl} alt="" loading="lazy" />
        ) : (
          <div
            className="place-card-placeholder"
            style={tierStyle ? { background: `linear-gradient(145deg, ${tierStyle.from}24, transparent 55%), linear-gradient(320deg, ${tierStyle.to}20, #101722 65%)` } : undefined}
          >
            <span aria-hidden>{category.glyph}</span>
            <small>{spot.area ?? "Singapore"}</small>
          </div>
        )}
        <span className="place-card-type">{category.glyph} {category.label}</span>
        {communityScore != null ? (
          <span className="place-card-score"><strong>{communityScore.toFixed(1)}</strong><small>{spot.reviewCount} review{spot.reviewCount === 1 ? "" : "s"}</small></span>
        ) : (
          <span className="place-card-score is-new"><strong>New</strong><small>no reviews</small></span>
        )}
      </Link>

      <div className="place-card-body">
        <div className="min-w-0">
          <p className="eyebrow">{[spot.cuisine, spot.price].filter(Boolean).join(" · ") || category.label}</p>
          <Link to={`/spot/${spot.slug}`} className="place-card-title">{spot.name}</Link>
          <p className="place-card-location">{spot.area ?? "Location needs checking"}</p>
        </div>

        <div className="place-card-signals">
          {tier && <TierCrest tier={tier} size="sm" />}
          <span className={`time-signal ${timeFit.signal}`}>{timeFit.label === "Good now" ? "Fits this time" : timeFit.label}</span>
          {spot.needsReview && <span className="needs-check">Details need checking</span>}
        </div>

        <p className="place-card-reason">
          {reason || (spot.reviewCount > 0 ? "Rated by people in the shared atlas." : "No public verdict yet—be the first after you go.")}
        </p>

        <div className="place-card-actions">
          <Link to={`/spot/${spot.slug}`} className="btn-primary flex-1">Open place</Link>
          <SaveSpotButton slug={spot.slug} saved={saved} compact onSignIn={onSignIn} onChange={setSaved} />
        </div>
      </div>
    </article>
  );
}
