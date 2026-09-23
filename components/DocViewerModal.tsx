'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Download, Loader2 } from 'lucide-react';

interface DocViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string | null;
  name?: string;
  fileType?: string | null;
}

const extOf = (s: string) => {
  const clean = (s || '').split('?')[0].split('#')[0].toLowerCase();
  const i = clean.lastIndexOf('.');
  return i >= 0 ? clean.slice(i) : '';
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.bmp', '.heic'];
const OFFICE_EXTS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.csv', '.txt'];

const extsOf = (url: string, name: string, fileType?: string | null) =>
  new Set([extOf(name), extOf(url), extOf(fileType || '')].filter(Boolean));

const isImage = (url: string, name: string, fileType?: string | null) => {
  if (fileType && fileType.startsWith('image/')) return true;
  // Cloudinary : les images passent par /image/upload/
  if (url.includes('/image/upload/')) return true;
  const exts = extsOf(url, name, fileType);
  return IMAGE_EXTS.some((e) => exts.has(e));
};

const isPdf = (url: string, name: string, fileType?: string | null) => {
  if (fileType === 'application/pdf') return true;
  const exts = extsOf(url, name, fileType);
  return exts.has('.pdf');
};

const isOffice = (url: string, name: string, fileType?: string | null) => {
  const exts = extsOf(url, name, fileType);
  return OFFICE_EXTS.some((e) => exts.has(e));
};

const officeViewerUrl = (u: string) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;

// Modal de visualisation de document dans la page :
// - images -> <img> zoomee
// - PDF -> <iframe> embarquee
// - Office/texte -> Google Docs Viewer embarque
// - autres types -> apercu impossible, bouton d'ouverture externe
export function DocViewerModal({ open, onOpenChange, url, name, fileType }: DocViewerModalProps) {
  const u = url || '';
  const n = name || 'Document';
  const img = isImage(u, n, fileType);
  const office = !img && isOffice(u, n, fileType);
  // PDF detecte OU type inconnu : on tente le rendu pdf.js (la majorite des
  // fichiers partages sont des PDF, meme quand l'URL Cloudinary n'a pas
  // d'extension), puis on retombe sur l'iframe brute qui fonctionnait avant.
  const pdf = !img && !office;

  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFallback, setPdfFallback] = useState(false);

  useEffect(() => {
    if (!open || !pdf || !u) return;
    let cancelled = false;
    setPdfBusy(true);
    setPdfFallback(false);
    setPdfPages([]);

    (async () => {
      try {
        const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf');
        const pdfjs = (pdfjsMod as any)?.default || pdfjsMod;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        // fetch explicite -> arrayBuffer (contourne Content-Disposition:
        // attachment de Cloudinary ; CORS reste le meme que getDocument(url))
        const res = await fetch(u);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const data = await res.arrayBuffer();

        const doc = await pdfjs.getDocument({ data }).promise;
        const imgs: string[] = [];
        const total = Math.min(doc.numPages, 40);
        for (let i = 1; i <= total; i += 1) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgs.push(canvas.toDataURL('image/jpeg', 0.85));
        }
        if (!cancelled) {
          if (imgs.length) setPdfPages(imgs);
          else setPdfFallback(true);
        }
      } catch (e) {
        console.error('PDF preview error, fallback iframe:', e);
        // Ancienne version : iframe directe sur l'URL (viewer natif du navigateur)
        if (!cancelled) setPdfFallback(true);
      } finally {
        if (!cancelled) setPdfBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pdf, u]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] h-[100dvh] max-w-none rounded-none p-0 gap-0 flex flex-col overflow-hidden sm:w-[96vw] sm:h-[92vh] sm:max-w-5xl sm:rounded-2xl">
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#4B4456]/8 bg-white">
          <DialogTitle className="font-baskerville text-base sm:text-lg text-[#4B4456] truncate pr-8">
            {n}
          </DialogTitle>
          <div className="flex items-center gap-2 mr-8">
            <a
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5E958F] hover:text-[#4a7a74] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouvel onglet</span>
            </a>
            <a
              href={u}
              download={n}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8C6C3B] hover:text-[#6d5430] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Télécharger</span>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-[#F4F1EC] overflow-auto">
          {img ? (
            <div className="min-h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={n}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : pdf ? (
            pdfPages.length > 0 ? (
              <div className="flex flex-col items-center gap-4 p-4">
                {pdfPages.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`${n} — page ${i + 1}`}
                    className="w-full max-w-[900px] rounded-md shadow-md"
                  />
                ))}
              </div>
            ) : pdfFallback ? (
              // Ancienne version : viewer PDF natif du navigateur en iframe
              <iframe src={u} title={n} className="w-full h-full border-0 bg-white" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-[#5E958F]" />
                <p className="text-[13px] text-[#9C97A3]">Chargement du document...</p>
              </div>
            )
          ) : office ? (
            <iframe
              src={officeViewerUrl(u)}
              title={n}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#5E958F]/15 flex items-center justify-center">
                <FileText className="h-7 w-7 text-[#5E958F]" />
              </div>
              <div>
                <p className="font-semibold text-[#4B4456]">{n}</p>
                <p className="text-[13px] text-[#9C97A3] mt-1">
                  L&apos;aperçu de ce type de fichier n&apos;est pas disponible.
                </p>
              </div>
              <Button
                className="bg-[#5E958F] hover:bg-[#4a7a74] text-white gap-2 rounded-full"
                onClick={() => window.open(u, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir le fichier
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
