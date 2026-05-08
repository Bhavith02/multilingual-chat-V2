import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { detectLanguage, translateText, getLanguageName } from '@/lib/translation';
import { getAIResponse } from '@/lib/openai';
import { getHistory, appendMessage, clearSession } from '@/lib/session';
import { ChatRequest, SSEEvent } from '@/types';

function sseEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function getSessionId(request: NextRequest): { sessionId: string; isNew: boolean } {
  const existing = request.cookies.get('x-session-id')?.value;
  return existing
    ? { sessionId: existing, isNew: false }
    : { sessionId: uuidv4(), isNew: true };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { message, languageOverride } = body as ChatRequest;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', data: 'message is required' })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }
  if (message.length > 2000) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', data: 'Message too long (max 2000 characters)' })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  const { sessionId, isNew } = getSessionId(request);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Determine the response language (what the user wants back)
        // This is always from languageOverride (the picker selection) or detected from the message.
        let responseLang: { code: string; name: string };
        if (languageOverride) {
          responseLang = { code: languageOverride, name: getLanguageName(languageOverride) };
        } else {
          const detected = await detectLanguage(message);
          responseLang = detected.confidence >= 0.5
            ? { code: detected.code, name: detected.name }
            : { code: 'en', name: 'English' };
        }

        controller.enqueue(encoder.encode(sseEvent({ type: 'lang', data: { ...responseLang, confidence: 1 } })));

        // Step 2: Detect what language the user actually TYPED IN (independent of response lang).
        // User can type in English OR in their selected language — both must be understood.
        let englishMessage: string;
        if (languageOverride) {
          // Detect actual input language so we translate correctly to English.
          const inputLangDetected = await detectLanguage(message);
          const inputLang = inputLangDetected.confidence >= 0.5 ? inputLangDetected.code : responseLang.code;
          englishMessage = inputLang !== 'en'
            ? await translateText(message, 'en', inputLang)
            : message;
        } else {
          // No override: responseLang was detected from the message itself, so use that as input lang.
          englishMessage = responseLang.code !== 'en'
            ? await translateText(message, 'en', responseLang.code)
            : message;
        }

        // Step 3: Build history and get AI response (buffered)
        // Belt-and-suspenders: append a system reminder to the current turn so the
        // model cannot ignore the language instruction even with contaminated history.
        const history = getHistory(sessionId);
        const aiEnglishResponse = await getAIResponse([
          ...history,
          { role: 'user', content: englishMessage },
          // Injected per-request reminder — stripped before saving to history
          { role: 'system', content: 'REMINDER: Write your reply in English only. You may discuss any language or topic, but the text of your reply itself must be English.' },
        ]);

        // Step 4: Persist English versions to session history
        appendMessage(sessionId, { role: 'user', content: englishMessage });
        appendMessage(sessionId, { role: 'assistant', content: aiEnglishResponse });

        // Step 5: Translate AI response back to the user's selected response language
        const translatedResponse =
          responseLang.code !== 'en'
            ? await translateText(aiEnglishResponse, responseLang.code, 'en')
            : aiEnglishResponse;

        // Step 6: Re-stream translated text in chunks for streaming UX
        const CHUNK_SIZE = 5;
        for (let i = 0; i < translatedResponse.length; i += CHUNK_SIZE) {
          controller.enqueue(
            encoder.encode(
              sseEvent({ type: 'chunk', data: translatedResponse.slice(i, i + CHUNK_SIZE) }),
            ),
          );
          await new Promise((r) => setTimeout(r, 15));
        }

        controller.enqueue(encoder.encode(sseEvent({ type: 'done', data: null })));
      } catch (err) {
        console.error('[/api/chat] Error:', err);
        controller.enqueue(
          encoder.encode(
            sseEvent({ type: 'error', data: err instanceof Error ? err.message : 'Something went wrong. Please try again.' }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  if (isNew) {
    headers[
      'Set-Cookie'
    ] = `x-session-id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
  }

  return new Response(stream, { headers });
}

export async function DELETE(request: NextRequest) {
  const { sessionId } = getSessionId(request);
  clearSession(sessionId);
  return Response.json({ ok: true });
}
