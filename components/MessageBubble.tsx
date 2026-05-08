'use client';

import { useState } from 'react';
import { Message } from '@/types';
import LearnPanel from './LearnPanel';
import { Languages, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  message: Message;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// ── English meaning panel ────────────────────────────────────────────────────
function EnglishMeaningPanel({ text, sourceLang }: { text: string; sourceLang: string }) {
  const [open, setOpen] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (translation || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang }),
      });
      const json = await res.json() as { translation?: string; error?: string };
      if (json.translation) setTranslation(json.translation);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors group"
        title="See what this means in English"
      >
        <Languages size={12} className="group-hover:scale-110 transition-transform" />
        <span>What does this mean in English?</span>
        <ChevronDown size={11} />
      </button>
    );
  }

  return (
    <div className="mt-2 w-72 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-md overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-500 text-white">
        <div className="flex items-center gap-1.5 font-medium text-xs">
          <Languages size={13} />
          <span>English meaning</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="opacity-70 hover:opacity-100 transition flex items-center gap-0.5 text-xs"
        >
          <ChevronUp size={13} />
        </button>
      </div>

      <div className="px-3 py-3 min-h-[48px] flex items-center">
        {loading && (
          <span className="flex items-center gap-1.5 text-gray-400">
            <Loader2 size={13} className="animate-spin" />
            <span className="text-xs">Translating...</span>
          </span>
        )}
        {!loading && error && (
          <span className="text-xs text-red-400">Could not load translation</span>
        )}
        {!loading && !error && translation && (
          <p className="text-gray-800 text-sm leading-relaxed">{translation}</p>
        )}
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const showExtras = !isUser && !message.isStreaming && message.responseLang && message.responseLang !== 'en';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {message.content}
        {message.isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
        )}
      </div>

      <div className="flex items-center gap-2 mt-1">
        {isUser && message.detectedLanguage && (
          <span className="text-xs text-gray-400">
            🌐 {message.detectedLanguage.name}
          </span>
        )}
        <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
      </div>

      {showExtras && (
        <div className="flex flex-col gap-0.5">
          {/* "What does this mean in English?" */}
          <EnglishMeaningPanel text={message.content} sourceLang={message.responseLang!} />
          {/* Learn pronunciation */}
          <LearnPanel
            originalText={message.content}
            senderLang={message.responseLang!}
            senderName="AI"
          />
        </div>
      )}
    </div>
  );
}

