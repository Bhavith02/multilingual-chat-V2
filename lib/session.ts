import { OpenAIMessage } from '@/types';

// In-memory session store: sessionId -> conversation history (always in English)
const store = new Map<string, OpenAIMessage[]>();
const lastSeen = new Map<string, number>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SESSIONS = 500;

// Prune stale sessions every hour to prevent unbounded memory growth
const _pruneTimer = setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, ts] of lastSeen) {
    if (ts < cutoff) { store.delete(id); lastSeen.delete(id); }
  }
  if (store.size > MAX_SESSIONS) {
    const oldest = [...lastSeen.entries()].sort((a, b) => a[1] - b[1]);
    for (const [id] of oldest.slice(0, store.size - MAX_SESSIONS)) {
      store.delete(id); lastSeen.delete(id);
    }
  }
}, 60 * 60 * 1000);
(_pruneTimer as NodeJS.Timeout).unref?.();

const SYSTEM_PROMPT: OpenAIMessage = {
  role: 'system',
  content: `You are a helpful, friendly assistant.
You can discuss any topic — including foreign languages, translation, grammar, culture, or anything else the user asks about.
However, YOU MUST ALWAYS WRITE YOUR REPLY IN ENGLISH. This is a technical requirement: your English output is passed to a translation service which delivers it to the user in their chosen language.
Do not write any part of your reply in a non-English language, regardless of the conversation history.
Be concise for conversational exchanges (2–4 sentences). When the user asks for a list, phrases, examples, or step-by-step content, provide the FULL list or content completely — do not summarise or say you will provide it, just provide it directly.`,
};

export function getHistory(sessionId: string): OpenAIMessage[] {
  return store.get(sessionId) ?? [SYSTEM_PROMPT];
}

export function appendMessage(sessionId: string, msg: OpenAIMessage): void {
  lastSeen.set(sessionId, Date.now());
  const history = getHistory(sessionId);
  // Keep system prompt + last 20 messages to control token cost
  const trimmed =
    history.length > 21
      ? [history[0], ...history.slice(history.length - 20)]
      : history;
  store.set(sessionId, [...trimmed, msg]);
}

export function clearSession(sessionId: string): void {
  store.delete(sessionId);
  lastSeen.delete(sessionId);
}
