// One-time enrichment: fill accurate lat/lng for every spot via OpenStreetMap
// Nominatim, then write the coordinates back into data/spots.seed.json so the
// seed is fully self-contained (no geocoding at runtime).
//
// Usage: node scripts/geocode.mjs
// Respectful of Nominatim usage policy: 1 request/sec, descriptive User-Agent.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "../data/spots.seed.json");
const UA = "YourNextSpot/1.0 (personal project; geocoding seed data)";
const SLEEP_MS = 1100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanSegment(seg) {
  return seg
    .replace(/#\S+/g, "") // unit numbers e.g. #01-04
    .replace(/\bLevel\s*[\dA-Z-]+\b/gi, "")
    .replace(/\bTower\s*\d+\b/gi, "")
    .replace(/\bL\d+\b/g, "")
    .replace(/\bSands SkyPark\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Singapore addresses read "<no. street>, <building/landmark>, Singapore <postal>".
// Building/landmark names geocode far more reliably than full addresses, so we
// extract the most useful query candidates from the raw address.
function addressCandidates(addr) {
  if (!addr) return { street: null, landmark: null };
  const segs = addr
    .split(",")
    .map(cleanSegment)
    .filter(Boolean)
    .filter((s) => !/^singapore(\s*\d{5,6})?$/i.test(s))
    .map((s) => s.replace(/\bSingapore\s*\d{5,6}\b/gi, "").trim())
    .filter(Boolean);

  let street = null;
  const landmarks = [];
  for (const s of segs) {
    if (/^\d/.test(s) && street === null) street = s;
    else if (!/^\d/.test(s)) landmarks.push(s);
  }
  // The building name is the landmark closest to the postal code (last one).
  const landmark = landmarks.length ? landmarks[landmarks.length - 1] : null;
  return { street, landmark };
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=sg&q=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const { lat, lon } = data[0];
  return { lat: Number(lat), lng: Number(lon) };
}

async function locate(spot) {
  const { street, landmark } = addressCandidates(spot.address);
  const attempts = [];
  if (landmark) attempts.push(`${landmark}, Singapore`);
  if (street) attempts.push(`${street}, Singapore`);
  attempts.push(`${spot.name}${spot.area ? `, ${spot.area}` : ""}, Singapore`);
  attempts.push(`${spot.name}, Singapore`);

  for (const q of [...new Set(attempts)]) {
    try {
      const hit = await geocode(q);
      await sleep(SLEEP_MS);
      if (hit) return { ...hit, via: q };
    } catch (e) {
      console.warn(`  ! ${spot.name}: ${e.message}`);
      await sleep(SLEEP_MS);
    }
  }
  return null;
}

async function main() {
  const db = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const spots = db.spots;
  let located = 0;
  let missed = 0;

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    if (typeof spot.lat === "number" && typeof spot.lng === "number") {
      located++;
      continue; // already done (resumable)
    }
    process.stdout.write(`[${i + 1}/${spots.length}] ${spot.name} … `);
    const hit = await locate(spot);
    if (hit) {
      spot.lat = Math.round(hit.lat * 1e6) / 1e6;
      spot.lng = Math.round(hit.lng * 1e6) / 1e6;
      located++;
      console.log(`✓ ${spot.lat}, ${spot.lng}  (${hit.via})`);
    } else {
      missed++;
      console.log("✗ not found");
    }
    // Persist incrementally so a crash/interrupt keeps progress.
    fs.writeFileSync(DATA, JSON.stringify(db, null, 2) + "\n");
  }

  console.log(`\nDone. Located ${located}, missed ${missed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
