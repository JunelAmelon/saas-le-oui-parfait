'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { getDocuments } from '@/lib/db';

interface TimelineProps {
    eventId: string;
}

interface TimelineItem {
    id: string;
    title: string;
    date: string;
    status: 'completed' | 'in_progress' | 'pending';
    order: number;
}

export function ClientTimeline({ eventId }: TimelineProps) {
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTimeline() {
            if (eventId) {
                try {
                    const items = await getDocuments('events/' + eventId + '/timeline_items', []);
                    // Sort manually since we are not using complex indices yet
                    const sortedItems = items.map((item: any) => ({
                        id: item.id,
                        title: item.title,
                        date: item.date,
                        status: item.status,
                        order: item.order || 0
                    })).sort((a, b) => a.order - b.order);

                    setTimeline(sortedItems);
                } catch (error) {
                    console.error("Error fetching timeline", error);
                } finally {
                    setLoading(false);
                }
            }
        }

        fetchTimeline();
    }, [eventId]);

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-brand-turquoise" /></div>;
    }

    if (timeline.length === 0) {
        return <div className="text-gray-500 italic text-center p-4">Aucune étape définie pour le moment.</div>;
    }

    return (
        <Card className="p-6 shadow-xl border-0">
            <h3 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-brand-turquoise" />
                Timeline des préparatifs
            </h3>
            <div className="space-y-4">
                {timeline.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${item.status === 'completed'
                                    ? 'bg-green-100'
                                    : item.status === 'in_progress'
                                        ? 'bg-brand-turquoise/20'
                                        : 'bg-gray-100'
                                    }`}
                            >
                                {item.status === 'completed' ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : item.status === 'in_progress' ? (
                                    <Clock className="h-5 w-5 text-brand-turquoise" />
                                ) : (
                                    <Clock className="h-5 w-5 text-gray-400" />
                                )}
                            </div>
                            {index < timeline.length - 1 && (
                                <div className="w-0.5 h-12 bg-gray-200 my-1"></div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p
                                className={`font-medium ${item.status === 'completed'
                                    ? 'text-brand-purple'
                                    : 'text-brand-gray'
                                    }`}
                            >
                                {item.title}
                            </p>
                            <p className="text-sm text-brand-gray">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
