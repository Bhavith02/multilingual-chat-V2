'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Users, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinError, setJoinError] = useState('');
  const router = useRouter();

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setJoinError('Enter a valid 6-character room code');
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-6">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🌐</div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Multilingual Chat</h1>
        <p className="text-gray-500 mt-2 text-base max-w-sm mx-auto">
          Talk to anyone, in any language — AI translates everything in real-time
        </p>
      </div>

      {/* Option cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* ── AI Chatbot ── */}
        <button
          onClick={() => router.push('/chat')}
          className="group text-left bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <Bot size={22} className="text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-lg mb-1">AI Chatbot</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            One-on-one with an AI assistant. Type or speak in any language — get replies in yours.
          </p>
          <div className="mt-4 flex items-center gap-1 text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
            Start chatting <ArrowRight size={14} />
          </div>
        </button>

        {/* ── Group Chat ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <Users size={22} className="text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-lg mb-1">Group Chat Room</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Create a room or join one. Everyone chats in their own language, auto-translated in real-time.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => router.push('/room/new')}
              className="w-full py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
            >
              ✨ Create Room
            </button>

            {!showJoinInput ? (
              <button
                onClick={() => setShowJoinInput(true)}
                className="w-full py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
              >
                🔗 Join Existing Room
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setJoinError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="Room code (6 chars)"
                    maxLength={6}
                    autoFocus
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono uppercase tracking-widest outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
                  />
                  <button
                    onClick={handleJoin}
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    →
                  </button>
                </div>
                {joinError && <p className="text-xs text-red-500">{joinError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs text-gray-400 text-center">
        Rooms are temporary — automatically deleted when everyone leaves
      </p>
    </div>
  );
}
