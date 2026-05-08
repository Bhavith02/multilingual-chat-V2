import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/translation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, sourceLang } = body as { text: string; sourceLang: string };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'text too long (max 2000 chars)' }, { status: 400 });
    }
    if (!sourceLang || typeof sourceLang !== 'string' || !/^[a-z]{2}$/.test(sourceLang)) {
      return NextResponse.json({ error: 'valid 2-letter sourceLang required' }, { status: 400 });
    }
    if (sourceLang === 'en') {
      return NextResponse.json({ translation: text });
    }

    const translation = await translateText(text, 'en', sourceLang);
    return NextResponse.json({ translation });
  } catch (err) {
    console.error('[/api/translate]', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
