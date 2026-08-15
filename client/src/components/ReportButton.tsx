import { useState } from "react";
import { api } from "../api";

interface Props {
  targetType: "review" | "photo" | "spot";
  targetId: string;
  signedIn: boolean;
  onSignIn: () => void;
  className?: string;
}

export default function ReportButton({ targetType, targetId, signedIn, onSignIn, className = "" }: Props) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function report() {
    if (!signedIn) {
      onSignIn();
      return;
    }
    if (sent || busy) return;
    const confirmed = window.confirm("Report this content for review? Use this for spam, abuse, misleading information, or content that does not belong here.");
    if (!confirmed) return;

    setBusy(true);
    try {
      await api.reportContent({ targetType, targetId, reason: "other" });
      setSent(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not send that report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={sent || busy}
      onClick={() => void report()}
      className={`text-xs text-mist-500 transition hover:text-ember disabled:cursor-default disabled:text-mist-500 ${className}`}
    >
      {sent ? "Reported" : busy ? "Reporting…" : "Report"}
    </button>
  );
}
