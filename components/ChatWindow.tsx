'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { Message, SSEEvent } from '@/types';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { Trash2, Globe, ArrowRight } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'German',     flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian',    flag: '🇷🇺' },
  { code: 'it', name: 'Italian',    flag: '🇮🇹' },
  { code: 'ta', name: 'Tamil',      flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',     flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',    flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam',  flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',    flag: '🇧🇩' },
  { code: 'mr', name: 'Marathi',    flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati',   flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi',    flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu',       flag: '🇵🇰' },
  { code: 'tr', name: 'Turkish',    flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch',      flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish',    flag: '🇸🇪' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'pl', name: 'Polish',     flag: '🇵🇱' },
];

// ── Language picker screen ────────────────────────────────────────────────────
function LanguagePicker({ onSelect }: { onSelect: (code: string, name: string) => void }) {
  const [selected, setSelected] = useState('en');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe size={26} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Choose your language</h1>
          <p className="text-sm text-gray-500 mt-1">
            The AI will chat with you in the language you pick
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 mb-6">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition text-left ${
                selected === l.code
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg leading-none">{l.flag}</span>
              <span className="truncate">{l.name}</span>
              {selected === l.code && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={async () => {
            // Always clear any previous session so old language history
            // cannot contaminate the new session's AI context.
            await fetch('/api/chat', { method: 'DELETE' }).catch(() => {});
            const lang = LANGUAGES.find((l) => l.code === selected)!;
            onSelect(lang.code, lang.name);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
        >
          Start chatting in {LANGUAGES.find((l) => l.code === selected)?.name}
          <ArrowRight size={15} />
        </button>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main chat window ──────────────────────────────────────────────────────────
export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [languageOverride, setLanguageOverride] = useState('');
  const [langName, setLangName] = useState('');

  const sendMessage = useCallback(
    async (text: string) => {
      if (isLoading) return;

      // Add user message to UI immediately
      const userMsg: Message = {
        id: uuidv4(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Placeholder AI message that will be filled by SSE chunks
      const aiMsgId = uuidv4();
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      // We'll add it once we start receiving chunks

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            languageOverride: languageOverride || undefined,
          }),
        });

        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let aiAdded = false;
        let aiLang = 'en'; // will be set from the lang SSE event

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            const event: SSEEvent = JSON.parse(json);

            if (event.type === 'lang') {
              aiLang = event.data.code;
              // Attach detected language to user message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === userMsg.id
                    ? { ...m, detectedLanguage: event.data }
                    : m,
                ),
              );
            } else if (event.type === 'chunk') {
              if (!aiAdded) {
                setMessages((prev) => [...prev, { ...aiMsg, responseLang: aiLang }]);
                aiAdded = true;
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: m.content + event.data }
                    : m,
                ),
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, isStreaming: false } : m,
                ),
              );
              setIsLoading(false);
            } else if (event.type === 'error') {
              setMessages((prev) => [
                ...prev,
                {
                  id: uuidv4(),
                  role: 'system',
                  content: event.data,
                  timestamp: Date.now(),
                },
              ]);
              setIsLoading(false);
            }
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'system',
            content: 'Connection lost. Please try again.',
            timestamp: Date.now(),
          },
        ]);
        setIsLoading(false);
      }
    },
    [isLoading, languageOverride],
  );

  async function clearChat() {
    await fetch('/api/chat', { method: 'DELETE' });
    setMessages([]);
  }

  // Show language picker until user has chosen
  if (!languageOverride) {
    return (
      <LanguagePicker
        onSelect={(code, name) => {
          setLanguageOverride(code);
          setLangName(name);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-800">🌐 Multilingual Chat</span>
          <span className="hidden sm:inline text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
            AI-Powered
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Globe size={13} className="text-gray-400" />
            {langName}
          </span>
          <button
            onClick={clearChat}
            disabled={messages.length === 0 && !isLoading}
            title="Clear conversation"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} langName={langName || undefined} />

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} recognitionLang={languageOverride || undefined} langName={langName || undefined} />
    </div>
  );
}
