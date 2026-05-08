'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Users, Copy, Check, LogOut, ChevronRight, Languages, ChevronDown, ChevronUp } from 'lucide-react';
import { UserInfo, RoomMessageData } from '@/types/socket';
import JoinModal from './JoinModal';
import ChatInput from './ChatInput';
import LearnPanel from './LearnPanel';

// ── English Meaning Panel (inline) ───────────────────────────────────────────

function EnglishMeaningPanel({ originalText, senderLang }: { originalText: string; senderLang: string }) {
  const [open, setOpen] = useState(false);
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // If sender typed in English, originalText IS the English meaning — no API call needed
  const isAlreadyEnglish = senderLang === 'en';

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (fetched || isAlreadyEnglish) return;
    setLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, sourceLang: senderLang }),
      });
      const data = await res.json();
      setTranslation(data.translation ?? originalText);
    } catch {
      setTranslation(originalText);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  const displayText = isAlreadyEnglish ? originalText : translation;

  return (
    <div className="mt-1">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition"
      >
        <Languages size={11} />
        <span>English meaning</span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div className="mt-1.5 max-w-[75%] bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-900 leading-relaxed">
          {loading ? 'Translating…' : displayText}
        </div>
      )}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RoomMessage {
  id: string;
  senderName: string;
  senderLang: string;
  text: string;         // translated (what this user sees)
  originalText: string; // sender's original
  isOwn: boolean;
  isSystem: boolean;
  timestamp: number;
}

type Phase = 'setup' | 'connecting' | 'chatting';

interface Props {
  initialRoomId: string; // 'new' or an existing 6-char room code
}

// ── Language display names ────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', pt: 'Portuguese', ru: 'Russian', it: 'Italian',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali',
};
function getLangName(code: string) { return LANG_NAMES[code] ?? code.toUpperCase(); }

function formatTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  return `${Math.floor(d / 3_600_000)}h ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomPage({ initialRoomId }: Props) {
  const isCreating = initialRoomId === 'new';

  const [phase, setPhase] = useState<Phase>('setup');
  const [joinError, setJoinError] = useState('');
  const [roomId, setRoomId] = useState(isCreating ? '' : initialRoomId);
  const [myName, setMyName] = useState('');
  const [myLanguage, setMyLanguage] = useState('en');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [showUsers, setShowUsers] = useState(true);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Disconnect on unmount
  useEffect(() => {
    return () => { socketRef.current?.disconnect(); };
  }, []);

  function addSystemMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), senderName: '', senderLang: '', text, originalText: '', isOwn: false, isSystem: true, timestamp: Date.now() },
    ]);
  }

  function attachSocketListeners(socket: Socket) {
    socket.on('room-joined', ({ roomId: newId, users: roomUsers }: { roomId: string; users: UserInfo[] }) => {
      setRoomId(newId);
      setUsers(roomUsers);
      setPhase('chatting');
      // Update URL without reload so the room code is shareable
      window.history.replaceState(null, '', `/room/${newId}`);
    });

    socket.on('join-error', (msg: string) => {
      setJoinError(msg);
      setPhase('setup');
    });

    socket.on('message', (data: RoomMessageData) => {
      setMessages((prev) => [...prev, { ...data, id: uuidv4(), isSystem: false }]);
    });

    socket.on('user-joined', ({ name, users: roomUsers }: { name: string; users: UserInfo[] }) => {
      addSystemMessage(`${name} joined the room`);
      setUsers(roomUsers);
    });

    socket.on('user-left', ({ name, users: roomUsers }: { name: string; users: UserInfo[] }) => {
      addSystemMessage(`${name} left the room`);
      setUsers(roomUsers);
    });

    socket.on('room-deleted', () => {
      addSystemMessage('All participants left. Room closed.');
      setTimeout(() => { window.location.href = '/'; }, 2500);
    });
  }

  function handleJoin({ name, language, roomCode }: { name: string; language: string; roomCode?: string }) {
    setMyName(name);
    setMyLanguage(language);
    setJoinError('');
    setPhase('connecting');

    const socket = io();
    socketRef.current = socket;
    attachSocketListeners(socket);

    if (isCreating || !roomCode) {
      socket.emit('create-room', { name, language });
    } else {
      socket.emit('join-room', { roomId: roomCode, name, language });
    }
  }

  const handleSend = useCallback(
    (text: string) => {
      if (!socketRef.current || !roomId) return;
      socketRef.current.emit('send-message', { roomId, text });
    },
    [roomId],
  );

  function handleLeave() {
    socketRef.current?.emit('leave-room');
    socketRef.current?.disconnect();
    window.location.href = '/';
  }

  async function copyRoomId() {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render: Join / Connecting ────────────────────────────────────────────────

  if (phase === 'setup' || phase === 'connecting') {
    return (
      <JoinModal
        mode={isCreating ? 'create' : 'join'}
        initialRoomCode={isCreating ? '' : initialRoomId}
        error={joinError}
        isLoading={phase === 'connecting'}
        onSubmit={handleJoin}
      />
    );
  }

  // ── Render: Chatting ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-gray-800">🌐 Room</span>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1 shrink-0">
            <span className="font-mono font-bold text-blue-700 text-sm tracking-widest">{roomId}</span>
            <button onClick={copyRoomId} title="Copy room code" className="text-gray-400 hover:text-blue-600 transition ml-1">
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
          </div>
          <span className="hidden md:inline text-xs text-gray-400 truncate">Share this code to invite others</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowUsers((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition px-2 py-1.5 rounded-lg hover:bg-blue-50"
          >
            <Users size={14} />
            <span>{users.length}</span>
            <ChevronRight size={12} className={`transition-transform ${showUsers ? 'rotate-90' : ''}`} />
          </button>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Messages + Input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4">

            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages yet. Say hello! 👋
              </div>
            )}

            {messages.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                      {msg.text}
                    </span>
                  </div>
                );
              }
              return (
                  <div key={msg.id} className={`flex flex-col mb-4 ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                  {!msg.isOwn && (
                    <span className="text-xs font-medium text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.isOwn
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{formatTime(msg.timestamp)}</span>
                  {/* Learn + English meaning — only on received messages */}
                  {!msg.isOwn && (
                    <>
                      <LearnPanel
                        originalText={msg.originalText}
                        senderLang={msg.senderLang}
                        senderName={msg.senderName}
                      />
                      {/* Show English meaning only when receiver's language is not English */}
                      {myLanguage !== 'en' && (
                        <EnglishMeaningPanel
                          originalText={msg.originalText}
                          senderLang={msg.senderLang}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSend={handleSend} isLoading={false} recognitionLang={myLanguage} />
        </div>

        {/* Users Panel */}
        {showUsers && (
          <aside className="w-52 shrink-0 border-l border-gray-200 bg-white p-4 overflow-y-auto hidden sm:flex flex-col">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              People ({users.length})
            </h3>
            <ul className="space-y-3">
              {users.map((user) => (
                <li key={user.name} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user.name}
                      {user.name === myName && (
                        <span className="ml-1 text-xs text-gray-400 font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{getLangName(user.language)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
