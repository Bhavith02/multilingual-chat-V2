'use client';

import { useState } from 'react';
import { GraduationCap, Volume2, VolumeX, X, Loader2 } from 'lucide-react';

// BCP-47 codes for SpeechSynthesis
const SPEECH_LANG: Record<string, string> = {
  en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR',
  de: 'de-DE', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
  ar: 'ar-SA', pt: 'pt-BR', ru: 'ru-RU', it: 'it-IT',
  ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN',
  bn: 'bn-IN', gu: 'gu-IN', mr: 'mr-IN', pa: 'pa-IN',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', pt: 'Portuguese', ru: 'Russian', it: 'Italian',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam',
  bn: 'Bengali', gu: 'Gujarati', mr: 'Marathi', pa: 'Punjabi',
};

interface Props {
  originalText: string;  // sender's original text in their own language
  senderLang: string;    // sender's language code e.g. 'hi'
  senderName: string;
}

interface LearnData {
  pronunciation: string;
}

export default function LearnPanel({ originalText, senderLang, senderName }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LearnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const langName = LANG_NAMES[senderLang] ?? senderLang.toUpperCase();

  async function handleOpen() {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, language: senderLang }),
      });
      const json = await res.json() as LearnData;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function speak() {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    // Chrome bug: cancel any stalled utterance before starting a new one
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(originalText);
    utterance.lang = SPEECH_LANG[senderLang] ?? senderLang;
    utterance.rate = 0.85;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Voices may not be loaded yet — wait for them then speak
    const trySpeak = () => {
      const voices = synth.getVoices();
      // Try to find an exact match for the language, fall back to any available voice
      const match = voices.find((v) => v.lang.startsWith(utterance.lang.split('-')[0]));
      if (match) utterance.voice = match;
      synth.speak(utterance);
    };

    if (synth.getVoices().length > 0) {
      trySpeak();
    } else {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        trySpeak();
      };
    }
  }

  // ── Trigger button ────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors group"
        title={`Learn to say this in ${langName}`}
      >
        <GraduationCap size={12} className="group-hover:scale-110 transition-transform" />
        <span>Learn</span>
      </button>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────────────
  return (
    <div className="mt-2 w-64 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-md overflow-hidden text-sm animate-in fade-in slide-in-from-top-1 duration-200">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-500 text-white">
        <div className="flex items-center gap-1.5 font-medium text-xs">
          <GraduationCap size={13} />
          <span>Learn {langName}</span>
          <span className="opacity-60 font-normal">from {senderName}</span>
        </div>
        <button onClick={handleClose} className="opacity-70 hover:opacity-100 transition">
          <X size={13} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">

        {/* Original */}
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Original</p>
          <div className="bg-white rounded-xl border border-indigo-100 px-3 py-2 text-gray-800 leading-relaxed text-sm font-medium">
            {originalText}
          </div>
        </div>

        {/* Pronunciation */}
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">How to say it</p>
          <div className="bg-white rounded-xl border border-indigo-100 px-3 py-2 min-h-[36px] flex items-center">
            {loading && (
              <span className="flex items-center gap-1.5 text-gray-400">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-xs">Loading...</span>
              </span>
            )}
            {!loading && error && (
              <span className="text-xs text-red-400">Could not load pronunciation</span>
            )}
            {!loading && !error && data && (
              <span className="text-gray-700 font-mono text-sm leading-relaxed">{data.pronunciation}</span>
            )}
          </div>
        </div>

        {/* Speak button */}
        <button
          onClick={speak}
          disabled={!data && !error}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition
            ${speaking
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
              : 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
        >
          {speaking
            ? <><VolumeX size={13} /> Stop</>
            : <><Volume2 size={13} /> Hear it in {langName}</>
          }
        </button>

      </div>
    </div>
  );
}
