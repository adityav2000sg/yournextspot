import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import SaveToLockerModal from "./SaveToLockerModal";

interface Props {
  slug: string;
  saved?: boolean;
  onSignIn: () => void;
  onChange: (saved: boolean) => void;
  compact?: boolean;
}

export default function SaveSpotButton({
  slug,
  saved,
  onSignIn,
  onChange,
  compact = false,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onSaved(event: Event) {
      const detail = (event as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug === slug) onChange(true);
    }
    window.addEventListener("yns:saved", onSaved);
    return () => window.removeEventListener("yns:saved", onSaved);
  }, [slug, onChange]);

  async function toggle() {
    if (!user) {
      window.localStorage.setItem("yns.pendingSaveSlug", slug);
      onSignIn();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`btn ${compact ? "min-h-[36px] px-3 py-1.5 text-xs" : ""} ${
          saved
            ? "border border-gilt/35 bg-gilt/15 text-gilt hover:bg-gilt/20"
            : "bg-white/10 text-mist-100 hover:bg-white/15"
        }`}
      >
        <span aria-hidden>{saved ? "✓" : "+"}</span>
        {busy
          ? compact
            ? "..."
            : "Saving..."
          : saved
            ? compact
              ? "Saved"
              : "Saved to Locker"
            : user
              ? compact
                ? "Save"
                : "Save spot"
              : compact
                ? "Log in"
                : "Log in to save"}
      </button>
      {open && (
        <SaveToLockerModal
          slug={slug}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setBusy(false);
            onChange(true);
          }}
        />
      )}
    </>
  );
}
