'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { WeddingDayTimelineItem } from '@/lib/client-helpers';

interface Props {
  items: WeddingDayTimelineItem[];
  coupleNames?: string;
  eventDate?: string;
  location?: string;
}

// Rend le PDF react-pdf page par page via pdf.js, en defilement horizontal.
export function WeddingDayTimelinePages({ items, coupleNames = '', eventDate = '', location = '' }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      setBusy(true);
      setError(false);
      try {
        const [{ pdf }, { WeddingDayTimelineDocument }, pdfjsMod] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./WeddingDayTimelineDocument'),
          import('pdfjs-dist/legacy/build/pdf'),
        ]) as [any, any, any];
        const pdfjs = pdfjsMod?.default || pdfjsMod;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const blob = await pdf(
          <WeddingDayTimelineDocument
            items={items}
            coupleNames={coupleNames}
            eventDate={eventDate}
            location={location}
          />
        ).toBlob();
        const data = await blob.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;

        const imgs: string[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgs.push(canvas.toDataURL('image/png'));
        }
        if (!cancelled) {
          setPages(imgs);
          setCurrent(0);
          scrollerRef.current?.scrollTo({ left: 0 });
        }
      } catch (e) {
        console.error('Timeline preview error:', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    const timer = setTimeout(() => {
      void render();
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [items, coupleNames, eventDate, location]);

  const goTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, pages.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (error) {
    return (
      <div className="rounded-xl border border-[#E7DCCE] bg-[#EDE6DC] p-10 text-center text-[13px] text-[#9C97A3]">
        Impossible de générer l&apos;aperçu.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#E7DCCE] bg-[#EDE6DC]">
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-[13px] text-[#9C97A3] bg-[#EDE6DC]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération de l&apos;aperçu…
        </div>
      )}

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {pages.map((src, i) => (
          <div key={i} className="min-w-full snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Page ${i + 1}`}
              className="block w-full h-auto"
              draggable={false}
            />
          </div>
        ))}
        {!busy && pages.length === 0 && (
          <div className="min-w-full p-10 text-center text-[13px] text-[#9C97A3]">
            Aucune page à afficher.
          </div>
        )}
      </div>

      {pages.length > 1 && (
        <>
          <button
            aria-label="Page précédente"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/50 backdrop-blur-[2px] text-[#4B4456] flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-white/80 transition-opacity disabled:opacity-20"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Page suivante"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-white/50 backdrop-blur-[2px] text-[#4B4456] flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-white/80 transition-opacity disabled:opacity-20"
            disabled={current >= pages.length - 1}
            onClick={() => goTo(current + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-white/50 backdrop-blur-[2px] px-2 py-0.5 text-[10px] font-medium text-[#4B4456] opacity-60">
            {current + 1} / {pages.length}
          </div>
        </>
      )}
    </div>
  );
}
