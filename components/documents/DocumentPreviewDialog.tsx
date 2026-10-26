'use client';

/**
 * Aperçu intégré de document (PDF / image / Office) partagé entre les
 * espaces admin, client et pro. Une seule implémentation — pas de
 * duplication de la logique de rendu.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';

interface DocumentPreviewSource {
  name?: string;
  file_url?: string;
  file_type?: string;
}

interface DocumentPreviewDialogProps {
  doc: DocumentPreviewSource | null;
  onClose: () => void;
  onDownload?: (doc: DocumentPreviewSource) => void;
}

/** Choix du mode de rendu selon le type de fichier. */
export function previewKind(doc: DocumentPreviewSource | null): 'image' | 'pdf' | 'office' | 'other' {
  const mime = String(doc?.file_type || '').toLowerCase();
  const url = String(doc?.file_url || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/.test(url)) return 'image';
  if (mime === 'application/pdf' || /\.pdf(\?|$)/.test(url)) return 'pdf';
  if (/word|officedocument|msword|excel|powerpoint/.test(mime) || /\.(docx?|xlsx?|pptx?)(\?|$)/.test(url)) return 'office';
  return 'other';
}

function previewUrl(doc: DocumentPreviewSource): string {
  const url = String(doc?.file_url || '');
  if (previewKind(doc) === 'office') {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  return url;
}

export function DocumentPreviewDialog({ doc, onClose, onDownload }: DocumentPreviewDialogProps) {
  const kind = previewKind(doc);

  const fallbackDownload = () => {
    if (!doc?.file_url) return;
    window.open(doc.file_url, '_blank');
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-[rgba(75,68,86,0.08)] shrink-0">
          <DialogTitle className="text-brand-purple text-base truncate pr-8">
            {doc?.name || 'Aperçu'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-[#F5F3F0] flex items-center justify-center">
          {doc && kind === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl(doc)}
              alt={doc?.name || 'Aperçu'}
              className="max-w-full max-h-full object-contain"
            />
          )}
          {doc && (kind === 'pdf' || kind === 'office') && (
            <iframe
              src={previewUrl(doc)}
              title={doc?.name || 'Aperçu du document'}
              className="w-full h-full border-0"
            />
          )}
          {doc && kind === 'other' && (
            <div className="text-center p-8">
              <FileText className="h-12 w-12 text-brand-gray mx-auto mb-3" />
              <p className="text-sm text-brand-gray mb-4">
                Format non prévisualisable dans la page.
              </p>
              <Button variant="outline" onClick={fallbackDownload}>
                Ouvrir dans un nouvel onglet
              </Button>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-[rgba(75,68,86,0.08)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            className="text-xs text-brand-gray hover:text-brand-purple underline-offset-2 hover:underline flex items-center gap-1"
            onClick={() => doc?.file_url && window.open(doc.file_url, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            Ouvrir dans un nouvel onglet
          </button>
          <Button
            size="sm"
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
            onClick={() => doc && (onDownload ? onDownload(doc) : fallbackDownload())}
          >
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
