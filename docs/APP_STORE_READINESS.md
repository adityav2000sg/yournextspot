# YourNextSpot App Store readiness

This repository now has the first native foundation: a Capacitor iOS project, native speech recognition, microphone permission copy, production app icons, an installable web manifest, an offline app shell, in-app account deletion, and persistent reporting for reviews and photos.

That is a strong starting point, not permission to submit yet. Work through these gates in order.

## 1. Family beta release gate

- Deploy Railway Postgres and the API, then apply every Prisma migration.
- Configure a long random `JWT_SECRET`, `NODE_ENV=production`, the exact Netlify and `capacitor://localhost` origins in `CLIENT_ORIGIN`, the Railway Volume path in `UPLOAD_DIR`, and the Railway service URL in `PUBLIC_MEDIA_BASE`.
- Verify the Resend domain and set `RESEND_API_KEY` and `OTP_FROM_EMAIL`.
- Point the client at the API and complete this real-device journey: request code, verify code, save a place, add a private visit, post/edit a review, upload a private photo, upload a public photo, report someone else's item, sign out/in, and delete the account.
- Confirm private photos cannot be fetched while signed out or from a different account.
- Back up Postgres and uploaded media, then perform one restore drill.

## 2. Trust-and-safety release gate

Apple requires apps with user-generated content to filter objectionable material, let users report it, support timely responses, let users block abusive users, and publish contact information.

Already present:

- Report controls on public member reviews and photos.
- A persistent `ContentReport` queue in Postgres.
- A member-facing block control that hides the blocked member's reviews and photos.
- Published support contact and community terms.
- In-app account deletion.

Required before App Review:

- An authenticated admin moderation screen for open reports, content removal, account suspension, and an audit trail.
- Pre-publication text and image safety checks.
- A Profile screen for reviewing and undoing account blocks.
- A written moderation response target and a monitored support inbox.
- Server-side image decoding, metadata stripping, malware checks, thumbnails, and durable object storage.

## 3. Native product release gate

- Test speech permission allowed, denied, and later revoked on real iPhones.
- Replace cross-site cookie assumptions with a production-tested native session strategy if WKWebView testing exposes cookie loss.
- Add native camera/photo-picker behavior, deep links, share sheet integration, haptics, connectivity feedback, and push notifications only where they improve the core decision loop.
- Keep voice optional: no microphone or location permission may be required for browsing or typing.
- Verify VoiceOver, Dynamic Type/zoom, reduced motion, focus behavior, contrast, touch sizes, and landscape/iPad layouts.
- Add crash reporting with a clear consent/data policy and test offline/slow-network recovery.
- Demonstrate enough native value to clear Apple's minimum-functionality rule; the voice workflow is the first differentiator, not the finished argument.

## 4. App Store Connect checklist

- Apple Developer membership, signing team, certificates, bundle ID `com.yournextspot.app`, and final version/build numbers.
- Final name, subtitle, description, keywords, category, age rating, support URL, privacy-policy URL, and marketing URL.
- App privacy answers covering email address, user ID, reviews, photos, private food-log content, diagnostics, and speech transcript handling. Confirm every third-party SDK/provider before answering.
- Privacy manifest and required-reason API declarations reviewed against the final dependency set.
- Screenshots for every required device size, final icon, launch experience, and review notes explaining sign-in and voice.
- A stable reviewer account or review-safe OTP instructions, with the production backend online during review.
- TestFlight internal testing first, then a small external family cohort, then staged release.

## 5. Recommendation quality gate

The five-second experience is protected by a 4.8-second AI request deadline and a deterministic catalogue fallback. It still cannot honestly guarantee “open now” until the catalogue includes verified opening hours.

Before marketing live availability, add a licensed place-data source, stable provider IDs, weekly hours, holiday exceptions, last-verified timestamps, closure state, and attribution. Cache responsibly and show when hours were last checked.

## Official references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Speech framework](https://developer.apple.com/documentation/speech/)
- [Capacitor iOS documentation](https://capacitorjs.com/docs/ios)
