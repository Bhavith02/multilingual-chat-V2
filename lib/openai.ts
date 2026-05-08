import Groq from 'groq-sdk';
import { OpenAIMessage } from '@/types';

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Collects the full Groq streamed response and returns it as a string.
 * We buffer here instead of streaming directly to client because the
 * translation layer needs complete sentences for accurate output.
 */
export async function getAIResponse(history: OpenAIMessage[]): Promise<string> {
  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: history,
    stream: true,
    max_tokens: 1500,
    temperature: 0.7,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    fullResponse += delta;
  }
  return fullResponse.trim();
}
