'use client';

import { Card } from '@/components/ui/card';

interface BudgetCardProps {
  total: number;
  spent: number;
}

export function BudgetCard({ total, spent }: BudgetCardProps) {
  const percentage = total > 0 ? (spent / total) * 100 : 0;
  const remaining = total - spent;

  return (
    <Card className="p-4 sm:p-6 shadow-xl border-0">
      <h3 className="text-lg font-bold text-brand-gray-dark mb-4">Budget</h3>

      <div className="mb-4 sm:mb-6 text-center">
        <p className="text-xs text-brand-gray mb-1 uppercase tracking-label">
          Budget total
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-brand-purple break-words">
          {total.toLocaleString('fr-FR')} €
        </p>
      </div>

      <div className="relative mb-4 min-h-[180px] sm:min-h-[200px]">
        <svg className="h-40 sm:h-48 w-full" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            fill="none"
            stroke="#E5E5E5"
            strokeWidth="16"
          />
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            fill="none"
            stroke="#C4A26A"
            strokeWidth="16"
            strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
            strokeLinecap="round"
          />
          <text
            x="100"
            y="70"
            textAnchor="middle"
            className="text-[10px] sm:text-xs fill-brand-gray"
          >
            Budget dépensé
          </text>
          <text
            x="100"
            y="88"
            textAnchor="middle"
            className="text-base sm:text-xl font-bold fill-brand-purple"
          >
            {spent.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </text>
        </svg>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 transform text-center">
          <span className="text-xs sm:text-sm font-medium text-brand-turquoise">
            {percentage.toFixed(1)} %
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-brand-beige p-3 text-center">
        <p className="text-xs text-brand-gray mb-1">Reste disponible</p>
        <p className="text-base sm:text-lg font-bold text-brand-purple break-words">
          {remaining.toLocaleString('fr-FR')} €
        </p>
      </div>
    </Card>
  );
}
