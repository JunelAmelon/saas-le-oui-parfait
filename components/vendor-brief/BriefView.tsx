'use client';

/**
 * Carte "Votre briefing" côté espace pro — lecture seule.
 * Rendu piloté par le même schéma registry que l'éditeur admin.
 */

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, StickyNote, X } from 'lucide-react';
import {
  getPersonRoleLabel,
  getPersonServiceLabel,
  type BriefData,
  type BriefPerson,
  type VendorBriefSchema,
} from '@/lib/vendor-briefs/schemas';

interface BriefViewProps {
  schema: VendorBriefSchema;
  data: BriefData | null | undefined;
}

const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function BriefView({ schema, data }: BriefViewProps) {
  const [selected, setSelected] = useState<BriefPerson | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const people = useMemo(() => {
    const p = data?.people;
    return Array.isArray(p) ? p : [];
  }, [data]);
  const notes = typeof data?.notes === 'string' ? data.notes : '';
  const touchUpCount = people.filter((p) => p.touch_up).length;

  if (people.length === 0 && !notes) return null;

  return (
    <>
      <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-fuchsia-500" />
          <span className="text-[11px] font-semibold text-[#9C97A3] uppercase tracking-wide">
            Votre fiche de préparation — {schema.serviceLabel}
          </span>
        </div>
        {people.length > 0 && (
          <p className="text-[13px] text-[#4B4456] font-medium mb-4">
            {people.length} personne{people.length > 1 ? 's' : ''} à préparer
            {touchUpCount > 0 ? ` · ${touchUpCount} avec retouches` : ''}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {people.map((person, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(person)}
              className="flex items-center gap-3 rounded-xl border border-[rgba(75,68,86,0.08)] bg-[#FAF9F7] p-3 text-left hover:border-fuchsia-300 transition-colors"
            >
              {person.photos?.[0]?.url ? (
                <img
                  src={person.photos[0].url}
                  alt={person.name}
                  className="h-11 w-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials(person.name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#4B4456] truncate">{person.name}</p>
                <p className="text-[11px] text-[#9C97A3] truncate">
                  {getPersonRoleLabel(schema, person.role)}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(person.services || []).map((s) => (
                    <Badge
                      key={s}
                      className="bg-fuchsia-100 text-fuchsia-700 border-0 text-[9px] px-1.5 py-0 leading-4"
                    >
                      {getPersonServiceLabel(schema, s)}
                    </Badge>
                  ))}
                  {person.touch_up && (
                    <Badge className="bg-[#FFFBF3] text-[#C9A96E] border-0 text-[9px] px-1.5 py-0 leading-4">
                      Retouches
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {notes && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#FFFBF3] border border-[#C9A96E]/20 p-3">
            <StickyNote className="w-4 h-4 text-[#C9A96E] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#4B4456] whitespace-pre-wrap">{notes}</p>
          </div>
        )}
      </div>

      {/* Fiche personne */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[20px] max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
                  {selected.name}
                  <span className="block text-sm font-medium text-[#9C97A3] mt-0.5">
                    {getPersonRoleLabel(schema, selected.role)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {(selected.services || []).map((s) => (
                    <Badge key={s} className="bg-fuchsia-100 text-fuchsia-700 border-0">
                      {getPersonServiceLabel(schema, s)}
                    </Badge>
                  ))}
                  {selected.touch_up && (
                    <Badge className="bg-[#FFFBF3] text-[#C9A96E] border-0">
                      {schema.people?.touchUpLabel || 'Retouches'}
                    </Badge>
                  )}
                </div>

                {selected.notes && (
                  <p className="text-[13px] text-[#4B4456] whitespace-pre-wrap rounded-lg bg-[#FAF9F7] p-3">
                    {selected.notes}
                  </p>
                )}

                {selected.photos?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selected.photos.map((photo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightbox(photo.url)}
                        className="aspect-square rounded-lg overflow-hidden border border-[#E5E5E5] hover:opacity-90 transition-opacity"
                      >
                        <img src={photo.url} alt={selected.name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox photo */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-7 w-7" />
          </button>
          <img
            src={lightbox}
            alt="Photo"
            className="max-h-full max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
