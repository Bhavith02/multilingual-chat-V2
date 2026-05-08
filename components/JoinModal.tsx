'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'pl', name: 'Polish' },
];

interface Props {
  mode: 'create' | 'join';
  initialRoomCode?: string;
  error?: string;
  isLoading?: boolean;
  onSubmit: (data: { name: string; language: string; roomCode?: string }) => void;
}

export default function JoinModal({
  mode,
  initialRoomCode = '',
  error,
  isLoading,
  onSubmit,
}: Props) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [localError, setLocalError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    if (mode === 'join' && !roomCode.trim()) {
      setLocalError('Please enter the room code');
      return;
    }
    setLocalError('');
    onSubmit({
      name: name.trim(),
      language,
      roomCode: roomCode.trim().toUpperCase() || undefined,
    });
  }

  const displayError = error || localError;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{mode === 'create' ? '✨' : '🔗'}</div>
          <h1 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Create a New Room' : 'Join Room'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'create'
              ? 'Start a group chat. Share the room code with friends to invite them.'
              : 'Enter your details to join the conversation.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Room Code — join only */}
          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                maxLength={6}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono tracking-widest uppercase outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
              />
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-gray-400 font-normal">(visible to others)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should others call you?"
              maxLength={20}
              autoFocus={mode === 'create'}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Must be unique within the room</p>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Language</label>
            <div className="relative">
              <Globe
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 appearance-none bg-white transition cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              All messages will be translated into this language for you
            </p>
          </div>

          {/* Error */}
          {displayError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {displayError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isLoading
              ? 'Connecting...'
              : mode === 'create'
              ? '✨ Create Room & Enter'
              : '→ Join Room'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
