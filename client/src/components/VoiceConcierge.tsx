import { useEffect, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

type RecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEventLike = Event & {
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionErrorLike = Event & {
  error?: string;
};

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  onBrowse: () => void;
}

const EXAMPLE =
  "Coffee with my girlfriend and her friends at 5pm, near the East Coast, easy on the wallet.";

export default function VoiceConcierge({ open, onClose, onSubmit, onBrowse }: Props) {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const nativeListenersRef = useRef<PluginListenerHandle[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(Capacitor.isNativePlatform());

  const Recognition =
    typeof window === "undefined"
      ? undefined
      : window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const speechAvailable = nativeAvailable || Boolean(Recognition);

  async function clearNativeListeners() {
    const listeners = nativeListenersRef.current.splice(0);
    await Promise.all(listeners.map((listener) => listener.remove().catch(() => undefined)));
  }

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      void SpeechRecognition.stop().catch(() => undefined);
      void clearNativeListeners();
      setListening(false);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      void SpeechRecognition.available()
        .then(({ available }) => setNativeAvailable(available))
        .catch(() => setNativeAvailable(false));
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      void SpeechRecognition.stop().catch(() => undefined);
      void clearNativeListeners();
    };
  }, [open, onClose]);

  async function beginListening() {
    if (Capacitor.isNativePlatform()) {
      setError(null);
      try {
        const availability = await SpeechRecognition.available();
        if (!availability.available) {
          setNativeAvailable(false);
          setError("Voice input is not available on this device. Type the request instead.");
          textRef.current?.focus();
          return;
        }
        setNativeAvailable(true);
        let permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== "granted") {
          permission = await SpeechRecognition.requestPermissions();
        }
        if (permission.speechRecognition !== "granted") {
          setError("Microphone and speech access are needed for voice. You can still type below.");
          textRef.current?.focus();
          return;
        }

        await clearNativeListeners();
        nativeListenersRef.current = [
          await SpeechRecognition.addListener("partialResults", ({ matches }) => {
            const next = matches[0]?.replace(/\s+/g, " ").trim();
            if (next) setTranscript(next);
          }),
          await SpeechRecognition.addListener("listeningState", ({ status }) => {
            setListening(status === "started");
          }),
        ];
        setListening(true);
        const result = await SpeechRecognition.start({
          language: "en-SG",
          maxResults: 3,
          partialResults: true,
          popup: false,
          prompt: "Tell YourNextSpot what you need",
        });
        const next = result.matches?.[0]?.replace(/\s+/g, " ").trim();
        if (next) setTranscript(next);
      } catch {
        setListening(false);
        setError("I could not start voice input. Try again or type the request.");
      }
      return;
    }

    if (!Recognition || listening) {
      if (!Recognition) {
        setError("Voice input is not available in this browser yet. Type the request instead.");
        textRef.current?.focus();
      }
      return;
    }

    setError(null);
    const recognition = new Recognition();
    recognition.lang = "en-SG";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const next = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (next) setTranscript(next);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access was not allowed. You can still type the request below.");
      } else if (event.error !== "aborted") {
        setError("I could not hear that clearly. Try once more or type the request.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function stopListening() {
    if (Capacitor.isNativePlatform()) {
      await SpeechRecognition.stop().catch(() => undefined);
      await clearNativeListeners();
      setListening(false);
      return;
    }
    recognitionRef.current?.stop();
    setListening(false);
  }

  function submit() {
    const prompt = transcript.trim();
    if (!prompt) {
      setError("Tell me at least the place type, occasion, area, budget, or time.");
      textRef.current?.focus();
      return;
    }
    recognitionRef.current?.abort();
    void SpeechRecognition.stop().catch(() => undefined);
    void clearNativeListeners();
    onSubmit(prompt);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="voice-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-concierge-title"
      onClick={onClose}
    >
      <section className="voice-sheet" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="voice-close" onClick={onClose} aria-label="Close voice concierge">
          ×
        </button>

        <div className="voice-sheet-copy">
          <p className="eyebrow text-aqua">Voice concierge</p>
          <h2 id="voice-concierge-title">What’s next?</h2>
          <p>
            Say the occasion, company, time, area, and budget. I’ll pull a shortlist from your atlas.
          </p>
        </div>

        <button
          type="button"
          className={`voice-orb ${listening ? "is-listening" : ""}`}
          onClick={() => void (listening ? stopListening() : beginListening())}
          aria-label={listening ? "Stop listening" : "Start voice request"}
          aria-pressed={listening}
        >
          <span className="voice-orb-ring voice-orb-ring-one" />
          <span className="voice-orb-ring voice-orb-ring-two" />
          <span className="voice-orb-core">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 15.5a3.75 3.75 0 0 0 3.75-3.75v-5a3.75 3.75 0 1 0-7.5 0v5A3.75 3.75 0 0 0 12 15.5Z" />
              <path d="M5.75 11.25v.5a6.25 6.25 0 0 0 12.5 0v-.5M12 18v3M9.25 21h5.5" />
            </svg>
          </span>
        </button>

        <p className="voice-status" aria-live="polite">
          {listening
            ? "Listening… tap the orb when you’re finished."
            : speechAvailable
              ? "Tap once, then speak naturally."
              : "Voice is unavailable here, but typing works exactly the same."}
        </p>

        <label className="voice-transcript">
          <span>Your request</span>
          <textarea
            ref={textRef}
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              setError(null);
            }}
            placeholder={EXAMPLE}
            rows={4}
          />
        </label>

        {error && <p className="voice-error" role="alert">{error}</p>}

        <div className="voice-actions">
          <button type="button" onClick={submit} className="btn-primary" disabled={!transcript.trim()}>
            Pull my spots <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onBrowse();
            }}
            className="btn-secondary"
          >
            Browse the atlas
          </button>
        </div>

        <p className="voice-privacy">
          The microphone starts only when you tap. YourNextSpot receives the transcript, not an audio recording.
        </p>
      </section>
    </div>
  );
}
