'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
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
                    console.error("Error fetching documents", error);
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
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-brand-turquoise" /></div>;
    }

    if (documents.length === 0) {
        return (
            <Card className="p-6 shadow-xl border-0">
                <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-brand-turquoise" />
                    Documents
                </h3>
                <div className="text-gray-500 italic text-center p-4">Aucun document disponible pour le moment.</div>
            </Card>
        );
    }

    return (
        <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6 text-brand-turquoise" />
                Documents
            </h3>
            <div className="space-y-3">
                {documents
                    .slice()
                    .sort((a, b) => parseDocDate(b) - parseDocDate(a))
                    .slice(0, 5)
                    .map((doc) => (
                    <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-5 w-5 text-brand-turquoise" />
                            <div>
                                <p className="font-medium text-brand-purple text-sm">
                                    {doc.name}
                                </p>
                                <p className="text-xs text-brand-gray">
                                    {doc.type} - {doc.date || doc.uploaded_at || 'Date inconnue'}
                                </p>
                            </div>
                        </div>
                        {doc.file_url && (
                            <div className="flex items-center gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-brand-turquoise hover:text-brand-turquoise-hover"
                                    onClick={() => window.open(doc.file_url, '_blank')}
                                    title="Visualiser"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-brand-turquoise hover:text-brand-turquoise-hover"
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
        </Card>
    );
}
