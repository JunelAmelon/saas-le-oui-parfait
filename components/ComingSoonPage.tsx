'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <Card className="w-full max-w-md p-8 sm:p-10 text-center shadow-xl border-0 bg-white">
          <div className="w-16 h-16 rounded-full bg-brand-turquoise/10 flex items-center justify-center mx-auto mb-6">
            {icon ?? <Sparkles className="h-8 w-8 text-brand-turquoise" />}
          </div>
          <Badge
            variant="secondary"
            className="mb-4 bg-brand-purple/8 text-brand-purple hover:bg-brand-purple/8"
          >
            Bientôt disponible
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-3">{title}</h1>
          <p className="text-brand-gray leading-relaxed">
            {description || 'Cette fonctionnalité sera disponible prochainement.'}
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
