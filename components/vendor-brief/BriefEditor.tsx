'use client';

/**
 * Modal générique d'édition d'un brief prestataire (côté admin).
 * Rendu piloté par le schéma de la catégorie (registry) : le même
 * composant fonctionne pour toutes les catégories actuelles et futures.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/storage';
import { validateBriefData } from '@/lib/vendor-briefs/validate';
import type { BriefData, BriefPerson, VendorBriefSchema } from '@/lib/vendor-briefs/schemas';

interface BriefEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: VendorBriefSchema;
  initialData?: BriefData | null;
  saving?: boolean;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  uploadFolder: string;
  onSave: (data: BriefData) => void | Promise<void>;
}

const emptyPerson = (): BriefPerson => ({
  name: '',
  role: 'mariee',
  services: [],
  touch_up: false,
  notes: '',
  photos: [],
});

export function BriefEditor({
  open,
  onOpenChange,
  schema,
  initialData,
  saving = false,
  loading = false,
  title,
  subtitle,
  uploadFolder,
  onSave,
}: BriefEditorProps) {
  const [people, setPeople] = useState<BriefPerson[]>([]);
  const [notes, setNotes] = useState('');
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const maxPeople = schema.people?.max ?? 20;
  const maxPhotos = schema.people?.maxPhotos ?? 6;

  useEffect(() => {
    if (!open) return;
    const init = initialData && Array.isArray(initialData.people) ? initialData.people : [];
    setPeople(
      init.map((p) => ({
        name: p.name || '',
        role: p.role || 'autre',
        custom_role: typeof p.custom_role === 'string' ? p.custom_role : '',
        services: Array.isArray(p.services) ? p.services : [],
        touch_up: p.touch_up === true,
        notes: p.notes || '',
        photos: Array.isArray(p.photos) ? p.photos : [],
      }))
    );
    setNotes(typeof initialData?.notes === 'string' ? initialData.notes : '');
  }, [open, initialData]);

  const patchPerson = (idx: number, patch: Partial<BriefPerson>) => {
    setPeople((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const toggleService = (idx: number, service: string) => {
    setPeople((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const has = p.services.includes(service);
        return { ...p, services: has ? p.services.filter((s) => s !== service) : [...p.services, service] };
      })
    );
  };

  const handlePhotosSelected = async (idx: number, files: File[]) => {
    const images = files.filter((f) => /^image\//i.test(f.type));
    if (images.length === 0) return;
    const current = people[idx]?.photos?.length || 0;
    const room = Math.max(0, maxPhotos - current);
    const toUpload = images.slice(0, room);
    if (toUpload.length === 0) {
      toast.error(`Maximum ${maxPhotos} photos par personne`);
      return;
    }
    setUploadingIdx(idx);
    try {
      const uploaded: { url: string }[] = [];
      for (const f of toUpload) {
        const url = await uploadImage(f, uploadFolder);
        uploaded.push({ url });
      }
      setPeople((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, photos: [...p.photos, ...uploaded] } : p))
      );
    } catch (e) {
      console.error('Brief photo upload failed:', e);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setUploadingIdx(null);
    }
  };

  const removePhoto = (personIdx: number, photoIdx: number) => {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === personIdx ? { ...p, photos: p.photos.filter((_, j) => j !== photoIdx) } : p
      )
    );
  };

  const hasPeopleField = useMemo(() => schema.fields.some((f) => f.type === 'people'), [schema]);
  const notesField = useMemo(() => schema.fields.find((f) => f.type === 'textarea'), [schema]);

  const handleSave = async () => {
    const result = validateBriefData(schema, { people, notes });
    if (!result.ok) {
      toast.error(result.errors[0] || 'Brief invalide');
      return;
    }
    await onSave(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] w-[95vw] rounded-[20px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="w-12 h-12 rounded-full bg-fuchsia-100 flex items-center justify-center mb-3">
            <ImagePlus className="h-6 w-6 text-fuchsia-500" />
          </div>
          <DialogTitle className="text-[18px] font-baskerville text-[#4B4456]">
            {schema.title}
            {title && <span className="block text-sm font-medium text-[#4B4456] mt-1">{title}</span>}
            {subtitle && (
              <span className="block text-sm font-medium text-[#88b7b5] mt-0.5">{subtitle}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#9C97A3]">
            Ces informations seront visibles par le prestataire dans son espace pro.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#88b7b5]" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {hasPeopleField && schema.people && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-sm font-semibold text-[#4B4456] whitespace-nowrap">
                    Personnes à préparer ({people.length})
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-fuchsia-300 text-fuchsia-600 hover:bg-fuchsia-50 w-full sm:w-auto"
                    disabled={people.length >= maxPeople}
                    onClick={() => setPeople((prev) => [...prev, emptyPerson()])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </div>

                {people.length === 0 && (
                  <p className="text-sm text-[#9C97A3] rounded-lg border border-dashed border-[#E5E5E5] p-4 text-center">
                    Ajoutez les personnes que le prestataire devra préparer.
                  </p>
                )}

                {people.map((person, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[rgba(75,68,86,0.10)] bg-[#FAF9F7] p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[11px] uppercase tracking-wide text-[#9C97A3]">Nom</Label>
                          <Input
                            value={person.name}
                            onChange={(e) => patchPerson(idx, { name: e.target.value })}
                            placeholder="Ex : Julie"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] uppercase tracking-wide text-[#9C97A3]">Rôle</Label>
                          <Select
                            value={person.role}
                            onValueChange={(v) => patchPerson(idx, { role: v, ...(v !== 'autre' ? { custom_role: '' } : {}) })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              {schema.people!.roles.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {person.role === 'autre' && schema.people!.allowCustomRole && (
                          <div className="sm:col-span-2">
                            <Label className="text-[11px] uppercase tracking-wide text-[#9C97A3]">
                              {schema.people!.customRoleLabel || 'Précisez qui'} *
                            </Label>
                            <Input
                              value={person.custom_role || ''}
                              onChange={(e) => patchPerson(idx, { custom_role: e.target.value })}
                              placeholder="Ex : Belle-mère, cousine, maquilleuse remplaçante..."
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        title="Supprimer cette personne"
                        onClick={() => setPeople((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-full text-[#9C97A3] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      {schema.people!.services.map((s) => (
                        <label key={s.value} className="flex items-center gap-2 text-sm text-[#4B4456] cursor-pointer">
                          <Checkbox
                            checked={person.services.includes(s.value)}
                            onCheckedChange={() => toggleService(idx, s.value)}
                          />
                          {s.label}
                        </label>
                      ))}
                      <label className="flex items-center gap-2 text-sm text-[#4B4456] cursor-pointer">
                        <Checkbox
                          checked={person.touch_up}
                          onCheckedChange={(v) => patchPerson(idx, { touch_up: v === true })}
                        />
                        {schema.people!.touchUpLabel}
                      </label>
                    </div>

                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-[#9C97A3]">
                        Photos ({person.photos.length}/{maxPhotos})
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {person.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="relative h-14 w-14 rounded-lg overflow-hidden border border-[#E5E5E5] group">
                            <img src={photo.url} alt={person.name || 'photo'} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              title="Retirer la photo"
                              onClick={() => removePhoto(idx, pIdx)}
                              className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {person.photos.length < maxPhotos && (
                          <button
                            type="button"
                            onClick={() => fileInputsRef.current[idx]?.click()}
                            disabled={uploadingIdx !== null}
                            className="h-14 w-14 rounded-lg border-2 border-dashed border-[#E5E5E5] flex items-center justify-center text-[#9C97A3] hover:border-fuchsia-300 hover:text-fuchsia-500 transition-colors disabled:opacity-50"
                          >
                            {uploadingIdx === idx ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImagePlus className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <input
                          ref={(el) => {
                            fileInputsRef.current[idx] = el;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const selected = Array.from(e.target.files || []);
                            e.target.value = '';
                            void handlePhotosSelected(idx, selected);
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-[#9C97A3]">Notes</Label>
                      <Textarea
                        value={person.notes || ''}
                        onChange={(e) => patchPerson(idx, { notes: e.target.value })}
                        placeholder="Allergies, type de peau/cheveux, inspirations..."
                        className="mt-1 text-sm min-h-[60px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {notesField && (
              <div>
                <Label className="text-sm font-semibold text-[#4B4456]">{notesField.label}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires pour le prestataire..."
                  className="mt-1.5 min-h-[80px]"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || loading}
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
