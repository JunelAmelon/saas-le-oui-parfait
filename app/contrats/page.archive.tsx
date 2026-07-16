'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Redirection vers la page principale des contrats
export default function ContratsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/agence/contrats');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
    </div>
  );
}
