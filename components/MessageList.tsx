'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface Props {
  messages: Message[];
  isLoading: boolean;
  langName?: string;
}

export default function MessageList({ messages, isLoading, langName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 text-gray-400">
        <div className="text-4xl mb-3">🌐</div>
        <p className="font-medium text-gray-500">
          {langName ? `Chat in ${langName}` : 'Start chatting'}
        </p>
        <p className="text-sm mt-1">
          {langName && langName !== 'English'
            ? `Type in ${langName} or English — AI will respond in ${langName}.`
            : 'Type your message below — AI will respond in English.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
