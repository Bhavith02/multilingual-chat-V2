'use client';

import { useRef, useState, KeyboardEvent } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

const MAX_CHARS = 2000;

// BCP-47 lang code → SpeechRecognition lang tag
const SPEECH_LANG: Record<string, string> = {
  en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR',
  de: 'de-DE', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
  ar: 'ar-SA', pt: 'pt-BR', ru: 'ru-RU', it: 'it-IT',
  ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN',
  bn: 'bn-IN', gu: 'gu-IN', mr: 'mr-IN', pa: 'pa-IN',
};

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  recognitionLang?: string; // BCP-47 code from language selector
  langName?: string; // Display name of the selected language (e.g. "German")
}

export default function ChatInput({ onSend, isLoading, recognitionLang, langName }: Props) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const canSend = text.trim().length > 0 && !isLoading && text.length <= MAX_CHARS;

  function handleSend() {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    // Use the selected language tag, or fall back to browser default
    rec.lang = (recognitionLang && SPEECH_LANG[recognitionLang]) ?? '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join('');
      setText(transcript);
      setTimeout(autoResize, 0);
    };

    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }

  const charsLeft = MAX_CHARS - text.length;

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={isListening ? '🎙 Listening...' : langName && langName !== 'English' ? `Type in ${langName} or English...` : 'Type your message...'}
            rows={1}
            disabled={isLoading}
            className={`w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-1 disabled:bg-gray-50 transition ${
              isListening
                ? 'border-red-400 focus:border-red-400 focus:ring-red-100 bg-red-50'
                : 'border-gray-200 focus:border-blue-400 focus:ring-blue-100'
            }`}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          {text.length > MAX_CHARS - 200 && (
            <span
              className={`absolute bottom-2 right-3 text-xs ${
                charsLeft < 0 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {charsLeft}
            </span>
          )}
        </div>

        {/* Mic button */}
        <button
          onClick={toggleVoice}
          disabled={isLoading}
          title={isListening ? 'Stop recording' : 'Voice input — speak in any language'}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          <Send size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        Enter to send &nbsp;·&nbsp; Shift+Enter for new line &nbsp;·&nbsp; 🎙 tap mic to speak
      </p>
    </div>
  );
}
