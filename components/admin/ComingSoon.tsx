'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              {title}
            </h1>
            {description ? (
              <p className="text-sm sm:text-base text-brand-gray">{description}</p>
            ) : null}
          </div>
        </div>

        <Card className="p-8 sm:p-12 border border-brand-turquoise/20 bg-brand-turquoise/5 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-turquoise/15 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-brand-turquoise" />
            </div>
            <div>
              <p className="text-lg font-semibold text-brand-purple mb-1">
                Fonctionnalité à venir
              </p>
              <p className="text-sm text-brand-gray max-w-md mx-auto">
                Cette fonctionnalité sera disponible prochainement. Nous l&apos;optimisons pour vous offrir la meilleure expérience possible.
              </p>
            </div>
            <Badge className="bg-brand-turquoise/15 text-brand-turquoise hover:bg-brand-turquoise/15">
              Bientôt disponible
            </Badge>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
