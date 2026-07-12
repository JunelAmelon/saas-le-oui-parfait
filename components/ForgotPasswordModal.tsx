'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] sm:w-full rounded-none border border-brand-purple/8 p-0 overflow-hidden">
        <div className="relative h-32 bg-brand-purple">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative w-20 h-20 rounded-none ring-4 ring-white overflow-hidden bg-brand-beige shrink-0">
              <Image
                src="/kathy.png"
                alt="Cathy"
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          </div>
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="font-baskerville text-xl text-brand-purple">
              Vous avez oublié vos identifiants ?
            </DialogTitle>
            <DialogDescription className="text-brand-gray text-sm mt-1">
              Pas de panique. Contactez-moi pour une restauration de vos identifiants.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover rounded-none h-11"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
