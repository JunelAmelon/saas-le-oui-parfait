'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Phone } from 'lucide-react';

const WHATSAPP_NUMBER = '+33687217118';

export function WhatsAppChat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[280px] sm:w-[320px] rounded-none border border-brand-purple/8 bg-white shadow-[0_16px_45px_-12px_rgba(75,68,86,0.25)] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="relative h-24 bg-brand-purple">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-5 pb-5 -mt-10">
            <div className="flex items-end gap-3 mb-4">
              <div className="relative w-16 h-16 rounded-full ring-4 ring-white overflow-hidden bg-brand-beige shrink-0">
                <Image
                  src="/kathy.png"
                  alt="Kathy"
                  fill
                  className="object-cover object-top scale-110"
                  sizes="64px"
                />
              </div>
            </div>
            <p className="text-brand-purple font-baskerville text-base mb-1">Vous avez une préoccupation ?</p>
            <p className="text-brand-gray text-sm leading-relaxed mb-4">
              Échangez avec moi directement sur WhatsApp.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold py-3 rounded-none transition-colors"
            >
              <Phone className="w-4 h-4" />
              Discuter sur WhatsApp
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative w-14 h-14 rounded-full overflow-hidden ring-4 ring-white shadow-[0_8px_24px_-8px_rgba(75,68,86,0.35)] transition-all duration-200 hover:scale-105 bg-brand-purple"
        aria-label="Ouvrir le chat WhatsApp"
      >
        {open ? (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-purple/90 text-white">
            <X className="w-6 h-6" />
          </div>
        ) : (
          <Image
            src="/kathy.png"
            alt="Kathy"
            fill
            className="object-cover object-top scale-110"
            sizes="56px"
          />
        )}
      </button>
    </div>
  );
}
