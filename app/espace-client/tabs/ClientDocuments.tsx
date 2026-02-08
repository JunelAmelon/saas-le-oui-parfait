'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocuments } from '@/lib/db';
import { Loader2 } from 'lucide-react';

interface DocumentsProps {
    eventId: string;
}

interface DocumentItem {
    id: string;
    name: string;
    type: string;
    date: string;
    url?: string;
}

export function ClientDocuments({ eventId }: DocumentsProps) {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDocuments() {
            if (eventId) {
                try {
                    const items = await getDocuments('events/' + eventId + '/documents', []);

                    setDocuments(items.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        type: item.type,
                        date: item.date,
                        url: item.url
                    })));
                } catch (error) {
                    console.error("Error fetching documents", error);
                } finally {
                    setLoading(false);
                }
            }
        }

        fetchDocuments();
    }, [eventId]);

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
                {documents.map((doc) => (
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
                                    {doc.type} - {new Date(doc.date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        {doc.url && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-brand-turquoise hover:text-brand-turquoise-hover"
                                onClick={() => window.open(doc.url, '_blank')}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
}
