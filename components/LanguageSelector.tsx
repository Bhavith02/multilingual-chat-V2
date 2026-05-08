'use client';

import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: '',   name: '🌐 Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <Globe size={14} className="text-gray-400 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer pr-1"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
