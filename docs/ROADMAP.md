# YourNextSpot: family beta to App Store

## Where the product is now

The product has the core loop: browse or search a Singapore catalogue, get a focused recommendation, open a place, save it, sign in by email code, keep private visit notes, publish a member review, and add a public or private photo.

The current catalogue is still a prototype dataset:

- 145 places, not 300.
- 145 places have no curated cover image.
- 19 have no usable coordinates.
- 35 have no area and only a generic Singapore address.
- 64 have no guide tier.
- 67 are explicitly marked as needing review.
- One duplicate name needs a human identity check.

The application now refuses to turn those gaps into fake certainty. Empty community ratings remain empty, unverified hours are labelled, and member photos default to private.

## Gate 1 — a dependable 200-person family beta

This is the next launch, before thinking about the App Store.

### Infrastructure

- Deploy the Express API and Postgres database, apply all migrations, and connect the live frontend.
- Put the web client and API behind one first-party origin or a carefully tested proxy so session cookies work reliably across Safari and privacy-focused browsers.
- Configure Resend with a verified sending domain and production email templates.
- Mount durable media storage. A Railway Volume is enough for the first beta; object storage plus an image CDN is the better long-term home.
- Add automated database and media backups, then perform a real restore drill.
- Add error monitoring, structured server logs, uptime checks, and alerts.

### Membership and operations

- Add an invite allow-list or invite codes before opening the beta to all 200 people.
- Add admin roles and a small operations screen for users, places, reviews, photos, reports, and catalogue corrections.
- Replace the in-memory OTP limiter with a shared Redis-backed limiter before running multiple server instances.
- Add session management, sign-out-all-devices, and an audit trail for sensitive admin actions.
- Test account deletion against database records and stored media.

### Trust and safety

- Add a pre-publication text/image filter, report buttons on every public review and photo, a moderation queue, response targets, and the ability for members to block another member.
- Add clear community guidelines and a support workflow.
- Keep public and private contributions visually distinct everywhere.
- Add virus/image validation and server-side image processing; the current browser resize is useful but cannot be the only protection.

### Quality gates

- Automated tests for OTP, permissions, private-photo access, reviews, saves, account deletion, and migration behavior.
- Browser tests for the primary guest/member journeys on iPhone Safari, Android Chrome, and desktop.
- Accessibility checks for keyboard use, focus containment, contrast, zoom, reduced motion, and screen-reader labels.
- Load test the API and photo path with the expected beta concurrency.

Estimated solo build effort after the backend is connected: roughly 10–15 focused development days, plus beta feedback time.

## Gate 2 — something genuinely impressive

The difference between “working family database” and “people love using it” is mostly catalogue quality, contribution energy, and the repeat-use loop.

### Catalogue quality

Add these fields to every place: stable provider/place ID, source URL, official website, reservation URL, verified address, coordinates, opening hours, last verified date, closure state, and photo attribution/license metadata.

Build a correction queue rather than editing JSON forever. Every imported field should record where it came from and when it was checked. Flag stale records automatically.

### Photos without 300 manual screenshots

Do not build the catalogue by screenshotting random web images. That creates copyright, attribution, expiry, quality, and maintenance problems.

Use a mixed programme:

1. Launch the top 25–40 places with properly licensed or restaurant-provided covers.
2. Let members fill the long tail with original visit photos; ask for a photo naturally after a private visit or public review.
3. Give owners or admins a verified-cover workflow.
4. If using Google Places photos, fetch them under the current Google policy, retain required attribution and Google Maps source links, and do not treat the photo resource as a permanent asset. Google permits storing the stable place ID, while much other Places content is subject to caching restrictions.
5. Add duplicate detection, orientation correction, thumbnail variants, basic quality checks, and moderation before a public upload becomes a cover candidate.

### Repeat-use product

- A lightweight activity feed from people the member knows, not a noisy global social network.
- Profiles with useful taste signals: favourite areas, cuisines, reliable reviewers, and recent public contributions.
- Better group planning: shareable shortlists, voting, “pick for this group,” and a final decision state.
- Stronger search using verified opening hours, distance, dietary needs, atmosphere, group size, and reservation availability.
- Taste-aware recommendations based on real saves, visits, and reviews, with a clear explanation of why a place was chosen.
- Thoughtful notifications only for invited lists, replies, saved-place updates, or a plan that needs a decision.

Estimated solo build effort: roughly another 25–45 focused development days, with catalogue work continuing in parallel.

## Gate 3 — App Store

First prove the family beta as a polished mobile web product. Then choose the client strategy:

- **Fastest:** a Capacitor-style native shell around the existing React app. Reuses more code, but it must still feel native and provide more than a repackaged website.
- **Best long-term iPhone product:** an Expo/React Native client backed by the existing API. More work, but a better base for camera capture, push notifications, location, deep links, share sheets, and native navigation.

The recommended path is the native client after the family beta demonstrates repeat use. Keep the API, data model, moderation system, and product rules; replace the presentation layer gradually.

Before App Review, the app needs:

- Complete user-generated-content protection: filtering, reporting, timely moderation, blocking abusive users, and published contact information.
- In-app account deletion that removes associated data. The project has the first version of this, but it still needs production verification.
- A complete privacy policy, App Store privacy disclosures, support URL, community rules, age rating, screenshots, app icon, metadata, and a reviewer account/instructions.
- A native-feeling, durable use case. Apple’s minimum-functionality rule is a real risk for a thin web wrapper.
- Production security review, crash reporting, analytics consent choices, backup/restore proof, and an incident-response plan.
- TestFlight testing across real devices and poor-network/offline states.

Estimated effort after the impressive web beta: about 15–30 focused development days for a serious first native release, depending on shell versus React Native and how many native features ship in version one.

## Recommended order

1. Connect and harden the production backend.
2. Invite 10 trusted testers, fix the whole contribution loop, then widen to 50 and 200.
3. Clean the top 40 places and use member contributions to grow coverage.
4. Build moderation/admin operations before public growth.
5. Measure four things: successful decisions, saved places, recorded visits, and useful public contributions.
6. Start the native app only after those loops work repeatedly on mobile web.

## External policy references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Privacy](https://developer.apple.com/help/app-store-connect/reference/app-privacy/)
- [Google Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Place Photos](https://developers.google.com/maps/documentation/places/web-service/place-photos)
