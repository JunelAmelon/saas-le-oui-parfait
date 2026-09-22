'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  FileDown,
  Eye,
  Loader2,
  ArrowUp,
  ArrowDown,
  Send,
  Check,
  List,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { WeddingDayTimelineItem } from '@/lib/client-helpers';
import { DEFAULT_TEMPLATES, categoryLabels, categoryOrder } from '@/lib/wedding-day-timeline-defaults';
import { WeddingDayTimelinePages } from './WeddingDayTimelinePages';
import { WeddingDayRecipient } from '@/lib/wedding-day-send';
import { AddressInput } from './AddressInput';

const minOf = (h: string) => {
  const [a, b] = (h || '00:00').split(':').map(Number);
  return (a < 5 ? a + 24 : a) * 60 + b;
};

type Category = NonNullable<WeddingDayTimelineItem['category']>;

// Champ "Qui ?" : select des prestataires assignes, ou "Autre" -> saisie libre.
function WhoField({
  value,
  onChange,
  custom,
  onCustomChange,
  vendors,
}: {
  value?: string;
  onChange: (v: string) => void;
  custom: boolean;
  onCustomChange: (c: boolean) => void;
  vendors: string[];
}) {
  const inList = vendors.includes(value || '');
  const showCustom = custom || (Boolean(value) && !inList);
  if (showCustom) {
    return (
      <div className="flex gap-1">
        <Input
          value={inList ? '' : value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Précisez (ex : le maire)"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          title="Choisir dans la liste des prestataires"
          onClick={() => {
            onCustomChange(false);
            onChange('');
          }}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  return (
    <Select
      value={inList ? value : ''}
      onValueChange={(v) => (v === '__autre' ? onCustomChange(true) : onChange(v))}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Qui ?" />
      </SelectTrigger>
      <SelectContent>
        {vendors.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
        <SelectItem value="__autre">Autre (préciser…)</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface WeddingDayTimelineProps {
  items: WeddingDayTimelineItem[];
  coupleNames?: string;
  eventDate?: string;
  location?: string;
  editable?: boolean;
  allowPdf?: boolean;
  allowSend?: boolean;
  onChange?: (items: WeddingDayTimelineItem[]) => void;
  onSend?: (blob: Blob) => void | Promise<void>;
  onFetchRecipients?: () => Promise<WeddingDayRecipient[]>;
  vendorOptions?: string[];
}

export function WeddingDayTimeline({
  items,
  coupleNames = '',
  eventDate = '',
  location = '',
  editable = false,
  allowPdf = false,
  allowSend = false,
  onChange,
  onSend,
  onFetchRecipients,
  vendorOptions = [],
}: WeddingDayTimelineProps) {
  const [localItems, setLocalItems] = useState<WeddingDayTimelineItem[]>(items || []);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('preparation');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveBeforeSendOpen, setSaveBeforeSendOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [customWhoRows, setCustomWhoRows] = useState<Set<number>>(new Set());
  const [formWhoCustom, setFormWhoCustom] = useState(false);
  const [recipients, setRecipients] = useState<WeddingDayRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sorted = useMemo(
    () => [...localItems].sort((a, b) => minOf(a.time) - minOf(b.time)),
    [localItems]
  );

  const draft: WeddingDayTimelineItem = {
    time: '',
    duration: '',
    title: '',
    who: '',
    location: '',
    address: '',
    note: '',
    category: 'autre',
    visibleTo: 'all',
    highlight: false,
  };

  const [form, setForm] = useState<WeddingDayTimelineItem>(draft);

  const updateLocal = (next: WeddingDayTimelineItem[]) => {
    setLocalItems(next);
    setDirty(true);
  };

  const saveItems = async () => {
    if (!dirty || !onChange) return;
    setSaving(true);
    try {
      await onChange(localItems);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = (template: WeddingDayTimelineItem) => {
    if (localItems.some((it) => it.time === template.time && it.title === template.title)) {
      toast.info('Ce moment est déjà dans le planning');
      return;
    }
    // Seul le titre est pre-rempli : le reste reste vide avec placeholders.
    const next = [
      ...localItems,
      {
        ...draft,
        title: template.title,
        category: template.category,
        highlight: template.highlight,
      },
    ];
    updateLocal(next);
    toast.success(`${template.title} ajouté`);
  };

  const addManual = () => {
    if (!form.time.trim() || !form.title.trim()) {
      toast.error('Heure et titre obligatoires');
      return;
    }
    const next = [...localItems, { ...form }];
    updateLocal(next);
    setForm(draft);
    setFormWhoCustom(false);
  };

  const updateItem = (idx: number, field: keyof WeddingDayTimelineItem, value: any) => {
    const next = localItems.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    updateLocal(next);
  };

  const removeItem = (idx: number) => {
    const next = localItems.filter((_, i) => i !== idx);
    updateLocal(next);
    setDeleteIdx(null);
  };

  const moveItem = (idx: number, delta: number) => {
    if (idx + delta < 0 || idx + delta >= localItems.length) return;
    const next = [...localItems];
    const [m] = next.splice(idx, 1);
    next.splice(idx + delta, 0, m);
    updateLocal(next);
  };

  const applyAllTemplates = () => {
    const existing = new Set(localItems.map((it) => `${it.time}-${it.title}`));
    const next = [...localItems];
    for (const t of DEFAULT_TEMPLATES) {
      if (!existing.has(`${t.time}-${t.title}`)) next.push({ ...t });
    }
    updateLocal(next);
    toast.success('Planning type chargé');
  };

  const clearAll = () => {
    if (localItems.length === 0) return;
    if (confirm('Vider tout le planning ?')) {
      updateLocal([]);
    }
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    setLoadingPdf(true);
    try {
      const [{ pdf }, { WeddingDayTimelineDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./WeddingDayTimelineDocument'),
      ]);
      const blob = await pdf(
        <WeddingDayTimelineDocument
          items={sorted}
          coupleNames={coupleNames}
          eventDate={eventDate}
          location={location}
        />
      ).toBlob();
      return blob;
    } catch (e) {
      console.error('PDF generation error:', e);
      toast.error('Erreur lors de la génération du PDF');
      return null;
    } finally {
      setLoadingPdf(false);
    }
  };

  const downloadPdf = async () => {
    const blob = await generatePdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordre-du-jour-${coupleNames || 'mariage'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendPdf = async () => {
    if (!onSend) return;
    // Si des modifs sont en cours, on demande de sauvegarder avant d'envoyer.
    if (dirty) {
      setSaveBeforeSendOpen(true);
      return;
    }
    // Liste des prestataires assignes -> modal de confirmation.
    if (onFetchRecipients) {
      setLoadingRecipients(true);
      try {
        const list = await onFetchRecipients();
        setRecipients(list);
        setSendConfirmOpen(true);
      } catch (e) {
        console.error('Error fetching recipients:', e);
        toast.error('Impossible de charger la liste des prestataires');
      } finally {
        setLoadingRecipients(false);
      }
      return;
    }
    await doSend();
  };

  const doSend = async () => {
    const blob = await generatePdfBlob();
    if (!blob) return;
    await Promise.resolve(onSend?.(blob));
    setSendConfirmOpen(false);
  };

  const visibleTemplates = DEFAULT_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className={`space-y-5 ${editable ? 'wdt-form' : ''}`}>
      {editable && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-baskerville text-lg text-[#4B4456]">Ordre du jour J</h3>
              <p className="text-[12px] text-[#9C97A3]">
                {dirty ? 'Modifications en cours — pensez à sauvegarder' : 'Planning à jour'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {allowPdf && (
                <Button
                  onClick={() => void downloadPdf()}
                  disabled={loadingPdf}
                  className="gap-2 bg-[#88b7b5] hover:bg-[#6a9a98] text-white border-0"
                  title="Télécharger le PDF"
                >
                  {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Aperçu</span>
              </Button>
              {onChange && (
                <Button
                  onClick={() => void saveItems()}
                  disabled={!dirty || saving}
                  className="bg-[#88b7b5] hover:bg-[#6a9a98] text-white gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Sauvegarder
                </Button>
              )}
            </div>
          </div>

          <Card className="p-4 border border-brand-purple/8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-baskerville text-lg text-[#4B4456]">Catalogue de moments</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={applyAllTemplates}>
                  Planning type complet
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={clearAll}>
                  Tout effacer
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {categoryOrder.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#4B4456] text-white'
                      : 'bg-[#FAF9F7] text-[#9C97A3] hover:bg-[#4B4456]/10'
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {visibleTemplates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => addTemplate(t)}
                  className="text-left p-3 rounded-xl border border-[#E7DCCE] bg-[#FAF9F7] hover:border-[#88b7b5] hover:bg-[#F0F8F7] transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-[#88b7b5]">{t.time}</span>
                    <Plus className="w-3.5 h-3.5 text-[#9C97A3] group-hover:text-[#88b7b5]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#4B4456] mt-1 leading-tight">{t.title}</p>
                </button>
              ))}
            </div>
          </Card>

          {selectedCategory === 'autre' && (
            <Card className="p-4 border border-brand-purple/8">
              <h3 className="font-baskerville text-lg text-[#4B4456] mb-3">Ajouter un moment personnalisé</h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Heure</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Durée</Label>
                  <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="30 min" />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Titre</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Arrivée photographe" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Qui ? (prestataire ou participant)</Label>
                  <WhoField
                    value={form.who}
                    onChange={(v) => setForm({ ...form, who: v })}
                    custom={formWhoCustom}
                    onCustomChange={setFormWhoCustom}
                    vendors={vendorOptions}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Lieu</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lieu" />
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs">Cat.</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                    <SelectTrigger className="h-9 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOrder.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-6">
                  <Label className="text-xs">Adresse complète</Label>
                  <AddressInput
                    value={form.address || ''}
                    onChange={(v) => setForm({ ...form, address: v })}
                    placeholder="Ex: 14 rue Albert Rémy, 91130 Ris-Orangis"
                  />
                </div>
                <div className="sm:col-span-6">
                  <Label className="text-xs">Note / description</Label>
                  <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Détail, consigne..." />
                </div>
                <div className="sm:col-span-12">
                  <Button onClick={addManual} className="bg-[#C9A96E] hover:bg-[#B8975E] text-white">
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter au planning
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 border border-brand-purple/8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-baskerville text-lg text-[#4B4456]">Planning en cours</h3>
              <span className="text-[11px] text-[#9C97A3]">{localItems.length} moment(s)</span>
            </div>
            {sorted.length === 0 ? (
              <p className="text-sm text-[#9C97A3] text-center py-6">Commencez par choisir un moment dans le catalogue.</p>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {sorted.map((item) => {
                  const idx = localItems.indexOf(item);
                  return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-xl border border-[#E7DCCE] bg-[#FAF9F7]"
                  >
                    <div className="sm:col-span-2">
                      <Input type="time" value={item.time} onChange={(e) => updateItem(idx, 'time', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Input value={item.duration || ''} onChange={(e) => updateItem(idx, 'duration', e.target.value)} placeholder="Durée" />
                    </div>
                    <div className="sm:col-span-3">
                      <Input value={item.title} onChange={(e) => updateItem(idx, 'title', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <WhoField
                        value={item.who}
                        onChange={(v) => updateItem(idx, 'who', v)}
                        custom={customWhoRows.has(idx)}
                        onCustomChange={(c) => {
                          const s = new Set(customWhoRows);
                          if (c) s.add(idx);
                          else s.delete(idx);
                          setCustomWhoRows(s);
                        }}
                        vendors={vendorOptions}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input value={item.location || ''} onChange={(e) => updateItem(idx, 'location', e.target.value)} placeholder="Lieu" />
                    </div>
                    <div className="sm:col-span-1">
                      <Select value={item.category} onValueChange={(v) => updateItem(idx, 'category', v)}>
                        <SelectTrigger className="h-9 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOrder.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {categoryLabels[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-6">
                      <AddressInput
                        value={item.address || ''}
                        onChange={(v) => updateItem(idx, 'address', v)}
                        placeholder="Adresse complète"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <Input value={item.note || ''} onChange={(e) => updateItem(idx, 'note', e.target.value)} placeholder="Note / description" />
                    </div>
                    <div className="sm:col-span-12 flex items-center gap-2">
                      <label className="flex items-center gap-2 text-[12px] text-[#4B4456] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!item.highlight}
                          onChange={(e) => updateItem(idx, 'highlight', e.target.checked)}
                          className="rounded border-[#C9A96E] text-[#C9A96E]"
                        />
                        Moment fort
                      </label>
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, 1)} disabled={idx === localItems.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteIdx(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {allowSend && onSend && (
          <Button onClick={() => void sendPdf()} disabled={loadingPdf || loadingRecipients} className="bg-[#88b7b5] hover:bg-[#6a9a98] text-white gap-2">
            {loadingPdf || loadingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer aux prestataires
          </Button>
        )}
      </div>

      {/* Lecture seule (client / prestataire) : liste verticale sur mobile,
          document paysage en plein ecran ; pager horizontal sur desktop */}
      {!editable && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-baskerville text-lg text-[#4B4456]">Ordre du jour J</h3>
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  size="sm"
                  variant="outline"
                  title="Voir le document"
                  aria-label="Voir le document"
                  className="gap-2 shrink-0"
                  onClick={() => setDocOpen(true)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Document</span>
                </Button>
              )}
              {allowPdf && (
                <Button
                  size="sm"
                  title="Télécharger le PDF"
                  aria-label="Télécharger le PDF"
                  className="gap-2 shrink-0 bg-[#88b7b5] hover:bg-[#6a9a98] text-white border-0"
                  disabled={loadingPdf}
                  onClick={() => void downloadPdf()}
                >
                  {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
              )}
            </div>
          </div>
          <WeddingDayTimelinePages
            items={sorted}
            coupleNames={coupleNames}
            eventDate={eventDate}
            location={location}
          />
        </div>
      )}

      {/* Edition (admin) : aperçu en modal, ouvert via le bouton Aperçu */}
      {editable && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="w-[100vw] h-[100dvh] max-w-none rounded-none p-2 flex flex-col overflow-hidden sm:w-[98vw] sm:h-auto sm:max-w-6xl sm:max-h-[95vh] sm:rounded-xl sm:p-4 gap-2">
            <DialogHeader className="shrink-0">
              <DialogTitle>Aperçu — Ordre du jour J</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WeddingDayTimelinePages
                items={sorted}
                coupleNames={coupleNames}
                eventDate={eventDate}
                location={location}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de confirmation : liste des prestataires assignes avant envoi */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer l&apos;ordre du jour</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B5E53]">
            Votre planning sera envoyé aux prestataires assignés au mariage
            {coupleNames ? ` de ${coupleNames}` : ''} :
          </p>
          <div className="rounded-xl border border-[#C9A96E]/40 bg-[#FBF6EC] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#8C6C3B] mb-1">
              Avant de valider, relisez bien le planning
            </p>
            <p className="text-[12px] text-[#6B5E53] leading-relaxed">
              Vérifiez les horaires, les lieux et les adresses de chaque moment.
              Cette version sera envoyée telle quelle aux prestataires et remplacera
              la précédente. Ils recevront une notification et un email.
            </p>
          </div>
          {recipients.length === 0 ? (
            <p className="text-sm text-[#9C97A3] py-2">Aucun prestataire assigné à ce mariage.</p>
          ) : (
            <ul className="space-y-1.5 py-1 max-h-[280px] overflow-y-auto">
              {recipients.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#4B4456]">
                  <Check className="h-4 w-4 text-[#88b7b5] shrink-0" />
                  <span>{r.name}</span>
                  {!r.hasAccount && (
                    <span className="text-[11px] text-[#9C97A3]">(pas de compte pro — pas d&apos;email)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSendConfirmOpen(false)} disabled={loadingPdf}>
              Annuler
            </Button>
            <Button
              className="bg-[#88b7b5] hover:bg-[#6a9a98] text-white gap-2"
              disabled={loadingPdf || recipients.length === 0}
              onClick={() => void doSend()}
            >
              {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document plein ecran (mobile) */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-w-none w-[100vw] h-[100dvh] rounded-none p-2 flex flex-col gap-2">
          <DialogHeader className="px-1">
            <DialogTitle className="text-left">Ordre du jour J — document</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <WeddingDayTimelinePages
              items={sorted}
              coupleNames={coupleNames}
              eventDate={eventDate}
              location={location}
            />
            <p className="mt-2 mb-1 text-center text-[11px] text-[#9C97A3]">
              Glissez dans la page pour zoomer, flèches pour changer de page.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup : confirmation avant suppression d'un moment */}
      <Dialog open={deleteIdx !== null} onOpenChange={(o) => !o && setDeleteIdx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce moment ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B5E53]">
            {deleteIdx !== null && localItems[deleteIdx]
              ? `« ${localItems[deleteIdx].title || 'Moment sans titre'} » sera retiré de l'ordre du jour.`
              : 'Ce moment sera retiré de l\'ordre du jour.'}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteIdx(null)}>
              Annuler
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
              onClick={() => deleteIdx !== null && removeItem(deleteIdx)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup : sauvegarder avant d'envoyer aux prestataires */}
      <Dialog open={saveBeforeSendOpen} onOpenChange={setSaveBeforeSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifications non sauvegardées</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B5E53]">
            Des modifications sont en cours sur l&apos;ordre du jour. Sauvegardez-les d&apos;abord avant d&apos;envoyer le planning aux prestataires.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSaveBeforeSendOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[#88b7b5] hover:bg-[#6a9a98] text-white gap-2"
              disabled={saving}
              onClick={async () => {
                await saveItems();
                setSaveBeforeSendOpen(false);
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
