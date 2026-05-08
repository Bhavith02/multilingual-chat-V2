// A single message in the conversation (UI layer)
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  detectedLanguage?: DetectedLang;
  responseLang?: string;   // language the AI responded in (set on assistant messages)
  timestamp: number;
  isStreaming?: boolean;
}

// Language info returned from detection
export interface DetectedLang {
  code: string;   // BCP-47 e.g. "hi", "es", "fr"
  name: string;   // Display name e.g. "Hindi", "Spanish"
  confidence: number; // 0–1
}

// What the client POSTs to /api/chat
export interface ChatRequest {
  message: string;
  languageOverride?: string; // BCP-47 code, undefined = auto-detect
}

// SSE event types streamed from server to client
export type SSEEvent =
  | { type: 'lang';  data: DetectedLang }
  | { type: 'chunk'; data: string }
  | { type: 'done';  data: null }
  | { type: 'error'; data: string };

// OpenAI message format (stored in session, always English)
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
