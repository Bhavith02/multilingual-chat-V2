import Groq from 'groq-sdk';
import { DetectedLang } from '@/types';

// Lazy-init so env vars are loaded by Next.js before first use
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', pt: 'Portuguese', ru: 'Russian', it: 'Italian',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam',
  bn: 'Bengali', gu: 'Gujarati', mr: 'Marathi', pa: 'Punjabi',
  tr: 'Turkish', pl: 'Polish', nl: 'Dutch', vi: 'Vietnamese',
  th: 'Thai', id: 'Indonesian', sv: 'Swedish', uk: 'Ukrainian',
};

export function getLanguageName(code: string): string {
  return LANG_NAMES[code] ?? code.toUpperCase();
}

async function aiTranslate(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content:
          `You are a professional translator. Translate the user's message from ${sourceName} to ${targetName}. ` +
          `Preserve proper nouns (names of people, places, brands) exactly as-is — do NOT translate them. ` +
          `Return ONLY the translated text with no explanation, no quotes, no extra words.`,
      },
      { role: 'user', content: text },
    ],
    max_tokens: 2000,
    temperature: 0.1, // low temp for deterministic translation
  });

  const result = completion.choices[0]?.message?.content?.trim();
  if (!result) throw new Error('Empty response from AI');
  return result;
}

export async function detectLanguage(text: string): Promise<DetectedLang> {
  try {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'Detect the language of the text and reply with ONLY the ISO 639-1 two-letter language code (e.g. en, hi, ja, fr). Nothing else.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 5,
      temperature: 0,
    });
    const code = completion.choices[0]?.message?.content?.trim().toLowerCase().slice(0, 2) ?? 'en';
    return { code, name: getLanguageName(code), confidence: 1 };
  } catch {
    return { code: 'en', name: 'English', confidence: 1 };
  }
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string> {
  if (sourceLang === targetLang) return text;
  try {
    return await aiTranslate(text, sourceLang, targetLang);
  } catch (err) {
    console.error(`[translate] AI failed ${sourceLang}→${targetLang}:`, err);
    return text;
  }
}
