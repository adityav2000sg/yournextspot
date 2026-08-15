import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthModal from "./components/AuthModal";
import Home from "./pages/Home";
import { ContactPage, NotFoundPage, PrivacyPage, TermsPage } from "./pages/StaticPages";

const SpotDetail = lazy(() => import("./pages/SpotDetail"));
const Locker = lazy(() => import("./pages/Locker"));
const Profile = lazy(() => import("./pages/Profile"));

function Header({ onSignIn }: { onSignIn: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="pointer-events-none sticky top-0 z-40 px-4 pt-4">
      <div className="app-header pointer-events-auto mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 shadow-2xl shadow-black/20 sm:px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] p-[1px] sm:h-9 sm:w-9">
            <span className="grid h-full w-full place-items-center rounded-full bg-ink-900 text-sm shadow-inner shadow-white/10">
              <span className="text-shimmer">✦</span>
            </span>
          </span>
          <span className="text-base font-semibold tracking-tight text-mist-100 sm:text-lg">
            Your<span className="text-shimmer">Next</span>Spot
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5">
          <Link to="/#atlas" className="btn-ghost hidden px-3 text-sm sm:inline-flex">Explore</Link>
          {user ? (
            <div className="flex items-center gap-1.5">
              <Link to="/locker" className="locker-pill is-open hidden md:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-aqua" />
                Locker unlocked
              </Link>
              <Link to="/locker" className="btn border border-white/10 bg-white/10 px-3 text-sm text-mist-100 hover:bg-white/15 md:hidden">
                Locker
              </Link>
              <span className="hidden max-w-[180px] truncate px-2 text-sm text-mist-400 lg:inline">
                {user.displayName ?? user.email}
              </span>
              <Link to="/profile" className="btn-ghost hidden px-3 text-sm lg:inline-flex">Profile</Link>
              <button onClick={() => void logout()} className="btn-ghost hidden px-3 text-sm sm:inline-flex">
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="btn-primary min-h-[40px] px-3 text-sm sm:px-4"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function RoutePosition() {
  const location = useLocation();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
      else window.scrollTo({ top: 0 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return null;
}

function Shell() {
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();
  return (
    <div className="min-h-full overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <RoutePosition />
      <Header onSignIn={() => setAuthOpen(true)} />
      <div id="main-content" tabIndex={-1}>
        <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-20"><div className="h-72 animate-pulse rounded-3xl bg-white/[0.04]" /></div>}>
          <Routes>
            <Route path="/" element={<Home onSignIn={() => setAuthOpen(true)} />} />
            <Route path="/spot/:slug" element={<SpotDetail onSignIn={() => setAuthOpen(true)} />} />
            <Route path="/locker" element={<Locker onSignIn={() => setAuthOpen(true)} />} />
            <Route path="/locker/:id" element={<Locker onSignIn={() => setAuthOpen(true)} />} />
            <Route path="/profile" element={<Profile onSignIn={() => setAuthOpen(true)} />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 pb-8 text-xs text-mist-500 sm:px-5">
        <span>Built for people you trust.</span>
        <span>·</span>
        <Link to="/privacy" className="hover:text-mist-200">Privacy</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-mist-200">Terms</Link>
        <span>·</span>
        <Link to="/contact" className="hover:text-mist-200">Report info</Link>
        {user && (
          <>
            <span>·</span>
            <Link to="/profile" className="hover:text-mist-200">Profile</Link>
          </>
        )}
      </footer>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
