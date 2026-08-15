import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import type { Spot } from "../types";
import { CATEGORY_META, tierMeta } from "../lib/tiers";
import { scoreOf } from "../lib/decision";

interface Props {
  spots: Spot[];
  height?: string;
  immersive?: boolean;
}

function pin(spot: Spot): L.DivIcon {
  const meta = tierMeta(spot.ownerTier ?? spot.communityTier);
  const category = CATEGORY_META[spot.category];
  const color = meta?.to ?? "#8b8fa7";
  const glow = meta ? `0 0 22px ${color}` : "0 0 16px rgba(139,143,167,.45)";
  return L.divIcon({
    className: "spot-map-marker",
    html: `<span style="
      --pin:${color};
      display:grid;width:34px;height:34px;place-items:center;border-radius:999px;
      background:linear-gradient(145deg, rgba(255,255,255,.96), rgba(231,233,243,.86));
      color:#020410;border:2px solid rgba(2,4,16,.92);box-shadow:${glow}, 0 16px 32px -18px rgba(0,0,0,.95);
      font-size:15px;line-height:1;
    ">${category.glyph}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function clusterPin(count: number): L.DivIcon {
  return L.divIcon({
    className: "spot-map-marker spot-map-cluster",
    html: `<span aria-label="${count} places">${count}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

const SG_CENTER: [number, number] = [1.3036, 103.8318];

function FitToSpots({ spots }: { spots: Spot[] }) {
  const map = useMap();
  const located = useMemo(
    () => spots.filter((s) => s.lat != null && s.lng != null),
    [spots]
  );

  useEffect(() => {
    if (located.length === 0) {
      map.setView(SG_CENTER, 12);
      return;
    }
    const bounds = L.latLngBounds(located.map((spot) => [spot.lat!, spot.lng!]));
    map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: 15 });
  }, [located, map]);

  return null;
}

function ClusteredMarkers({ spots }: { spots: Spot[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = useMemo(() => {
    const located = spots.filter((spot) => spot.lat != null && spot.lng != null);
    const cell = zoom <= 11 ? 0.045 : zoom <= 12 ? 0.026 : zoom <= 13 ? 0.014 : zoom <= 14 ? 0.007 : 0;
    if (cell === 0) return located.map((spot) => ({ key: spot.id, lat: spot.lat!, lng: spot.lng!, spots: [spot] }));
    const buckets = new Map<string, Spot[]>();
    for (const spot of located) {
      const key = `${Math.round(spot.lat! / cell)}:${Math.round(spot.lng! / cell)}`;
      buckets.set(key, [...(buckets.get(key) ?? []), spot]);
    }
    return [...buckets.entries()].map(([key, grouped]) => ({
      key,
      lat: grouped.reduce((sum, spot) => sum + spot.lat!, 0) / grouped.length,
      lng: grouped.reduce((sum, spot) => sum + spot.lng!, 0) / grouped.length,
      spots: grouped,
    }));
  }, [spots, zoom]);

  return <>
    {groups.map((group) => {
      if (group.spots.length > 1) {
        return (
          <Marker
            key={group.key}
            position={[group.lat, group.lng]}
            icon={clusterPin(group.spots.length)}
            eventHandlers={{ click: () => map.flyTo([group.lat, group.lng], Math.min(17, zoom + 2), { animate: true }) }}
          />
        );
      }
      const spot = group.spots[0];
      return (
        <Marker key={spot.id} position={[spot.lat!, spot.lng!]} icon={pin(spot)}>
          <Popup closeButton className="spot-map-popup">
            <div className="map-hover-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow text-aqua">{CATEGORY_META[spot.category].label}</p>
                  <strong className="mt-1 block font-display text-xl font-normal text-mist-100">{spot.name}</strong>
                </div>
                {spot.reviewCount > 0 && (
                  <span className="rounded-full border border-gilt/25 bg-gilt/10 px-2.5 py-1 font-mono text-xs text-gilt">
                    {scoreOf(spot)?.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-mist-400">{[spot.cuisine, spot.area, spot.price].filter(Boolean).join(" · ") || "Singapore"}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to={`/spot/${spot.slug}`} className="btn-primary min-h-[38px] px-3 py-2 text-xs">Details</Link>
                {spot.googleMapsUrl ? (
                  <a href={spot.googleMapsUrl} target="_blank" rel="noreferrer" className="btn-secondary min-h-[38px] px-3 py-2 text-xs">Maps</a>
                ) : (
                  <Link to={`/spot/${spot.slug}`} className="btn-secondary min-h-[38px] px-3 py-2 text-xs">Open</Link>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      );
    })}
  </>;
}

export default function SpotMap({ spots, height = "100%", immersive = false }: Props) {
  const located = useMemo(
    () => spots.filter((s) => s.lat != null && s.lng != null),
    [spots]
  );

  return (
    <MapContainer
      center={SG_CENTER}
      zoom={12}
      scrollWheelZoom
      style={{ height, width: "100%", borderRadius: immersive ? "1.75rem" : "1rem" }}
      attributionControl
      className={immersive ? "spot-map spot-map-immersive" : "spot-map"}
    >
      <FitToSpots spots={spots} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <ClusteredMarkers spots={located} />
    </MapContainer>
  );
}
