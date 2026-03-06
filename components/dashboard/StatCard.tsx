import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  tone?: 'mint' | 'lavender' | 'sky' | 'peach' | 'neutral';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, { card: string; iconWrap: string; icon: string }> = {
  mint: {
    card: 'bg-[#EAF4EF] border-[#D7E7DE]',
    iconWrap: 'bg-white/70 border border-white/70',
    icon: 'text-[#2F6B55]',
  },
  lavender: {
    card: 'bg-[#E7E8FF] border-[#D8D9FF]',
    iconWrap: 'bg-white/70 border border-white/70',
    icon: 'text-[#4B4A86]',
  },
  sky: {
    card: 'bg-[#EAF2FF] border-[#D9E6FF]',
    iconWrap: 'bg-white/70 border border-white/70',
    icon: 'text-[#2B5EA7]',
  },
  peach: {
    card: 'bg-[#FBE9E6] border-[#F6D7D1]',
    iconWrap: 'bg-white/70 border border-white/70',
    icon: 'text-[#9B3E34]',
  },
  neutral: {
    card: 'bg-white border-gray-200',
    iconWrap: 'bg-brand-turquoise/10',
    icon: 'text-brand-turquoise',
  },
};

export function StatCard({ title, value, icon: Icon, description, trend, tone }: StatCardProps) {
  const styles = toneStyles[tone || 'neutral'];
  return (
    <Card
      className={`p-6 border shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-3xl ${styles.card}`}
    >
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
        <div className={`rounded-full p-3 ${styles.iconWrap}`}>
          <Icon className={`h-6 w-6 ${styles.icon}`} />
        </div>
      </div>
    </Card>
  );
}
