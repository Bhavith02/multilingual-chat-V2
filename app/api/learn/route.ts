import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

let _groq: Groq | null = null;
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
  de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', pt: 'Portuguese', ru: 'Russian', it: 'Italian',
  ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam',
  bn: 'Bengali', gu: 'Gujarati', mr: 'Marathi', pa: 'Punjabi',
};

export async function POST(req: NextRequest) {
  try {
    const { text, language } = await req.json() as { text: string; language: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: 'text too long (max 500 chars)' }, { status: 400 });
    }
    if (!language || typeof language !== 'string' || !/^[a-z]{2}$/.test(language)) {
      return NextResponse.json({ error: 'valid 2-letter language code required' }, { status: 400 });
    }
    const langName = LANG_NAMES[language] ?? language;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            `You are a pronunciation guide for language learners. ` +
            `The user wants to learn how to pronounce ${langName} text using English phonetics. ` +
            `Write a simple word-by-word phonetic guide using English letters and hyphens, ` +
            `so an English speaker can sound it out naturally. ` +
            `Examples: ` +
            `Japanese "こんにちは" → "kon-ni-chi-wa", ` +
            `Hindi "नमस्ते" → "na-mas-tay", ` +
            `Korean "안녕하세요" → "an-nyeong-ha-se-yo", ` +
            `Arabic "مرحبا" → "mar-ha-ban". ` +
            `Return ONLY the phonetic pronunciation. No explanations, no original text, no quotes.`,
        },
        { role: 'user', content: text },
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const pronunciation = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ pronunciation });
  } catch (err) {
    console.error('[/api/learn]', err);
    return NextResponse.json({ pronunciation: '' }, { status: 500 });
  }
}
