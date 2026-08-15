import { Link } from "react-router-dom";

function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-5">
      <section className="glass rounded-[1.75rem] p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-mist-100 sm:text-5xl">
          {title}
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-7 text-mist-300">{children}</div>
        <Link to="/" className="btn-ghost mt-6 border border-white/10">
          Back to Atlas
        </Link>
      </section>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <Shell eyebrow="Privacy" title="What YourNextSpot stores">
      <p>
        Guests can browse the public place catalogue without signing in. If you sign in, YourNextSpot stores your email, display name, lockers, saved-place links, private visit entries, reviews, and photos you submit.
      </p>
      <p>
        Reviews and photos you mark public are visible to everyone. Private visit entries and photos you mark private are available only to your signed-in account. Do not enter sensitive personal information into notes or captions.
      </p>
      <p>
        Authentication uses an HTTP-only session cookie. Email codes may be sent through Resend when configured; in development they can be shown in the login flow for local testing.
      </p>
      <p>Deleting your account removes your reviews, uploaded photos, saves, lockers, and private visit history.</p>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell eyebrow="Terms" title="Use the atlas responsibly">
      <p>
        YourNextSpot is a decision aid for discovering places in Singapore. Place information can be incomplete or outdated; verify live hours, menus, availability and directions before going.
      </p>
      <p>
        Do not use the service to publish unlawful, abusive or misleading content. Account deletion is available from Profile.
      </p>
      <p>
        Upload only photos you took or have permission to share. By choosing public, you allow YourNextSpot to display that photo with the place listing until you delete it or make it private.
      </p>
    </Shell>
  );
}

export function ContactPage() {
  return (
    <Shell eyebrow="Feedback" title="Report incorrect information">
      <p>
        If a place is wrong, closed, duplicated, missing key information, or should be removed, send the details to{" "}
        <a className="text-aqua underline-offset-4 hover:underline" href="mailto:hello@yournextspot.app">
          hello@yournextspot.app
        </a>
        .
      </p>
      <p>
        Include the place name, what is wrong, and a source if you have one. Your private Locker notes are not needed for catalogue corrections.
      </p>
    </Shell>
  );
}

export function NotFoundPage() {
  return (
    <Shell eyebrow="Not found" title="This route is not in the atlas.">
      <p>The page may have moved, or the link may be incorrect.</p>
      <div className="flex flex-wrap gap-2">
        <Link to="/" className="btn bg-mist-100 text-ink-900 hover:bg-white">
          Browse places
        </Link>
        <Link to="/locker" className="btn-ghost border border-white/10">
          Open Locker
        </Link>
      </div>
    </Shell>
  );
}
