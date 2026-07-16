'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">{title}</h1>
        {description ? <p className="text-sm sm:text-base text-brand-gray">{description}</p> : null}
      </div>
      {children ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {children}
        </div>
      ) : null}
    </div>
  );
}
