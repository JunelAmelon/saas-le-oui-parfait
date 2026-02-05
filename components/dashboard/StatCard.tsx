import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <Card className="p-6 shadow-xl border-0">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-label text-brand-gray mb-2">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-brand-purple mb-1">{value}</h3>
          {description && (
            <p className="text-sm text-brand-gray">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-brand-gray">vs mois dernier</span>
            </div>
          )}
        </div>
        <div className="rounded-full bg-brand-turquoise/10 p-3">
          <Icon className="h-6 w-6 text-brand-turquoise" />
        </div>
      </div>
    </Card>
  );
}
