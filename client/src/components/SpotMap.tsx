import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import type { Spot } from "../types";
import { tierMeta } from "../lib/tiers";

interface Props {
  spots: Spot[];
  height?: string;
}

function pin(spot: Spot): L.DivIcon {
  const meta = tierMeta(spot.ownerTier ?? spot.communityTier);
  const color = meta?.to ?? "#8b8fa7";
  const glow = meta ? `0 0 14px ${color}` : "none";
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid #020410;box-shadow:${glow};
    "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const SG_CENTER: [number, number] = [1.3036, 103.8318];

export default function SpotMap({ spots, height = "100%" }: Props) {
  const located = useMemo(
    () => spots.filter((s) => s.lat != null && s.lng != null),
    [spots]
  );

  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      scrollWheelZoom
      style={{ height, width: "100%", borderRadius: "1rem" }}
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {located.map((spot) => (
        <Marker key={spot.id} position={[spot.lat!, spot.lng!]} icon={pin(spot)}>
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong style={{ fontSize: 14 }}>{spot.name}</strong>
              <div style={{ fontSize: 12, color: "#8b8fa7", marginTop: 2 }}>
                {[spot.cuisine, spot.area].filter(Boolean).join(" · ")}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                <Link to={`/spot/${spot.slug}`} style={{ color: "#b48cff" }}>
                  details
                </Link>
                {spot.googleMapsUrl && (
                  <a
                    href={spot.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#52d1c7" }}
                  >
                    maps ↗
                  </a>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
