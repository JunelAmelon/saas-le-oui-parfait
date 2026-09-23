'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClientDocuments, DocumentData } from '@/lib/client-helpers';
import { Loader2 } from 'lucide-react';

interface DocumentsProps {
  eventId: string;
  clientId?: string;
}

export function ClientDocuments({ eventId, clientId }: DocumentsProps) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  const parseDocDate = (doc: any) => {
    const raw = doc?.created_timestamp || doc?.uploaded_at || doc?.date || '';
    if (!raw) return 0;
    if (raw?.toDate) return raw.toDate().getTime();
    const s = String(raw);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.getTime();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      const d2 = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      return Number.isNaN(d2.getTime()) ? 0 : d2.getTime();
    }
    return 0;
  };

  useEffect(() => {
    async function fetchDocuments() {
      if (clientId) {
        try {
          const items = await getClientDocuments(clientId);
          setDocuments(items);
        } catch (error) {
          console.error('Error fetching documents', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [clientId]);

  if (loading) {
    return (
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
        <div className="flex justify-center p-4">
          <Loader2 className="animate-spin h-5 w-5 text-[#88b7b5]" />
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-6">
        <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#88b7b5]" />
          Documents
        </h3>
        <div className="text-sm text-[#9C97A3] italic text-center p-4">Aucun document disponible pour le moment.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5 sm:p-6">
      <h3 className="text-[17px] font-semibold text-[#4B4456] mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-[#88b7b5]" />
        Documents
      </h3>
      <div className="space-y-2">
        {documents
          .slice()
          .sort((a, b) => parseDocDate(b) - parseDocDate(a))
          .slice(0, 5)
          .map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF9F7] hover:bg-[rgba(75,68,86,0.07)] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[rgba(75,68,86,0.07)] flex items-center justify-center text-[#4B4456] shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[#4B4456] text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-[#9C97A3]">
                    {doc.type} - {doc.date || doc.uploaded_at || 'Date inconnue'}
                  </p>
                </div>
              </div>
              {doc.file_url && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    title="Visualiser"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-[#5A5A5A] hover:text-[#4B4456] hover:bg-[rgba(75,68,86,0.07)]"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
