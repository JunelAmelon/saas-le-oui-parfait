'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

// Champ adresse avec autocompletion via api-adresse.data.gouv.fr (gratuit, sans cle).
export function AddressInput({ value, onChange, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipFetch = useRef(false);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 4) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
        );
        const json = await res.json();
        const labels = (json?.features || [])
          .map((f: any) => f?.properties?.label)
          .filter(Boolean) as string[];
        setSuggestions(labels);
        setOpen(labels.length > 0);
      } catch {
        // silencieux
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className || ''}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#E7DCCE] bg-white shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-[12px] text-[#4B4456] hover:bg-[#F0F8F7] flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                skipFetch.current = true;
                onChange(s);
                setOpen(false);
                setSuggestions([]);
              }}
            >
              <MapPin className="h-3.5 w-3.5 text-[#88b7b5] shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
