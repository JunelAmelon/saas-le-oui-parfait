'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, UserPlus, ArrowLeft, CheckCircle, FileClock } from 'lucide-react';
import {
  DiscoveryFormData,
  CALL_TYPES,
  LEAD_SOURCES,
  STYLE_OPTIONS,
  PROGRESS_ITEMS,
  PROVIDER_CATEGORIES,
  ANIMATION_OPTIONS,
  CONCERN_OPTIONS,
  OFFER_OPTIONS,
  getValue,
  setValue,
  toggleArrayValue,
  normalizeDiscoveryForSave,
} from '@/lib/discovery';

interface DiscoveryFormProps {
  mode: 'create' | 'edit';
  initialData: DiscoveryFormData;
  onAutoSave?: (data: DiscoveryFormData) => Promise<void>;
  onComplete?: (data: DiscoveryFormData) => Promise<void>;
  onConvert?: (data: DiscoveryFormData) => Promise<void>;
  onCancel?: () => void;
  isAutoSaving?: boolean;
  isCompleting?: boolean;
  isConverting?: boolean;
}

const allSections = [
  'presentation',
  'project',
  'style',
  'progress',
  'providers',
  'animations',
  'guestsNeeds',
  'expectations',
  'offers',
  'budget',
  'conclusion',
];

export function DiscoveryForm({
  mode,
  initialData,
  onAutoSave,
  onComplete,
  onConvert,
  onCancel,
  isAutoSaving,
  isCompleting,
  isConverting,
}: DiscoveryFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<DiscoveryFormData>(() => initialData);
  const [dirty, setDirty] = useState(false);
  const lastSavedRef = useRef<string>('');

  const setField = (path: string, value: any) => {
    setFormData((prev) => setValue(prev, path, value));
  };

  const toggleArray = (path: string, value: string) => {
    setFormData((prev) => toggleArrayValue(prev, path, value));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const nextValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setField(name, nextValue);
  };

  const handleCheckbox = (path: string) => (checked: boolean | 'indeterminate') => {
    setField(path, checked === true);
  };

  const handleSelect = (path: string) => (value: string) => {
    setField(path, value);
  };

  const fieldValue = (path: string) => getValue(formData, path) ?? '';
  const checkboxValue = (path: string) => Boolean(getValue(formData, path));
  const arrayValue = (path: string) => (getValue(formData, path) as string[] | undefined) || [];

  useEffect(() => {
    const snapshot = JSON.stringify(normalizeDiscoveryForSave(formData));
    if (lastSavedRef.current === '') {
      lastSavedRef.current = snapshot;
      return;
    }
    if (lastSavedRef.current !== snapshot) {
      setDirty(true);
    }
  }, [formData]);

  useEffect(() => {
    if (!onAutoSave) return;
    const interval = setInterval(() => {
      if (!dirty) return;
      const payload = normalizeDiscoveryForSave(formData);
      lastSavedRef.current = JSON.stringify(payload);
      setDirty(false);
      onAutoSave(payload).catch(() => null);
    }, 5000);
    return () => {
      clearInterval(interval);
      if (dirty && onAutoSave) {
        const payload = normalizeDiscoveryForSave(formData);
        lastSavedRef.current = JSON.stringify(payload);
        onAutoSave(payload).catch(() => null);
      }
    };
  }, [dirty, formData, onAutoSave]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAutoSaveNow();
  };

  const handleAutoSaveNow = async () => {
    if (!onAutoSave) return;
    const payload = normalizeDiscoveryForSave(formData);
    lastSavedRef.current = JSON.stringify(payload);
    setDirty(false);
    await onAutoSave(payload);
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    const completed = setValue(formData, 'status', 'completed');
    setFormData(completed);
    const payload = normalizeDiscoveryForSave(completed);
    lastSavedRef.current = JSON.stringify(payload);
    setDirty(false);
    await onComplete(payload);
  };

  const renderInput = (label: string, path: string, type: string = 'text', placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={path}>{label}</Label>
      <Input
        id={path}
        name={path}
        type={type}
        value={fieldValue(path)}
        onChange={handleInput}
        placeholder={placeholder}
      />
    </div>
  );

  const renderTextarea = (label: string, path: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={path}>{label}</Label>
      <Textarea
        id={path}
        name={path}
        value={fieldValue(path)}
        onChange={handleInput}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );

  const renderCheckbox = (label: string, path: string) => (
    <div className="flex items-start gap-2">
      <Checkbox
        id={path}
        checked={checkboxValue(path)}
        onCheckedChange={handleCheckbox(path)}
      />
      <Label htmlFor={path} className="text-sm font-normal leading-tight cursor-pointer">
        {label}
      </Label>
    </div>
  );

  const renderSelect = (label: string, path: string, options: string[]) => (
    <div className="space-y-2">
      <Label htmlFor={path}>{label}</Label>
      <Select value={fieldValue(path)} onValueChange={handleSelect(path)}>
        <SelectTrigger id={path}>
          <SelectValue placeholder="Sélectionner..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderCheckboxGroup = (label: string, path: string, options: string[]) => (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const selected = arrayValue(path);
          const checked = selected.includes(opt);
          return (
            <div key={opt} className="flex items-start gap-2">
              <Checkbox
                id={`${path}-${opt}`}
                checked={checked}
                onCheckedChange={() => toggleArray(path, opt)}
                      />
              <Label htmlFor={`${path}-${opt}`} className="text-sm font-normal leading-tight cursor-pointer">
                {opt}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );

  const statusBadge = useMemo(() => {
    if (formData.status === 'converted') return <Badge className="bg-green-600 text-white">Converti en client</Badge>;
    if (formData.status === 'completed') return <Badge className="bg-brand-turquoise text-white">Terminé</Badge>;
    return <Badge className="bg-orange-100 text-orange-700">Brouillon</Badge>;
  }, [formData.status]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="p-6 shadow-xl border-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-brand-purple font-baskerville">
              Fiche découverte client
            </h2>
            <p className="text-sm text-brand-gray mt-1">
              Premier rendez-vous téléphonique - Le Oui Parfait
            </p>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
            {formData.type === 'client' && (
              <Badge variant="outline">Client</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {renderInput('Partenaire 1 *', 'name', 'text', 'Prénom Nom')}
          {renderInput('Partenaire 2', 'partner', 'text', 'Prénom Nom')}
          {renderInput('Email', 'email', 'email', 'email@example.com')}
          {renderInput('Téléphone', 'phone', 'tel', '+33 6 12 34 56 78')}
          {renderInput('Date de l\'appel', 'callDate', 'date')}
          {renderSelect('Source du lead', 'leadSource', LEAD_SOURCES)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderInput('Date du mariage', 'weddingDate', 'date')}
          {renderCheckbox('Date déjà fixée définitivement', 'dateConfirmed')}
          <div /> {/* spacer */}
        </div>
      </Card>

      <Accordion type="multiple" defaultValue={['presentation']} className="space-y-4">
        <AccordionItem value="presentation" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            1. Accueil et présentation
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderInput('Interlocuteur', 'sections.presentation.interviewer', 'text', 'Kathy')}
            {renderSelect('Type d\'échange', 'sections.presentation.callType', CALL_TYPES)}
            {renderTextarea('Notes de présentation', 'sections.presentation.notes', 'Pitch, parcours, présentation de l\'agence...')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="project" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            2. Découverte du projet
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderInput('Date prévue', 'sections.project.date', 'date')}
              {renderInput('Date civile', 'sections.project.civilDate', 'date')}
              {renderInput('Date religieuse', 'sections.project.religiousDate', 'date')}
              {renderCheckbox('Date confirmée', 'sections.project.dateConfirmed')}
              {renderCheckbox('Besoin d\'une animatrice', 'sections.project.needAnimator')}
              <div /> {/* spacer */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderInput('Adultes', 'sections.project.guestAdults', 'number', '70')}
              {renderInput('Enfants', 'sections.project.guestChildren', 'number', '10')}
              {renderInput('Âges des enfants', 'sections.project.childrenAges', 'text', '3 ans, 7 ans...')}
            </div>
            {renderSelect('Type d\'événement', 'sections.project.eventType', ['Mariage', 'Anniversaire', 'Autre'])}
            {renderTextarea('Notes projet', 'sections.project.notes', 'Infos complémentaires sur le projet...')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="style" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            3. Vos envies et votre univers
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderInput('Thème', 'sections.style.theme', 'text', 'Ex: Flamenco / Espagne')}
            {renderInput('Couleurs envisagées', 'sections.style.colors', 'text', 'Rouge et noir')}
            {renderInput('Ambiance', 'sections.style.ambiance', 'text', 'Chic, élégante, romantique...')}
            {renderCheckboxGroup('Styles', 'sections.style.selectedStyles', STYLE_OPTIONS)}
            {renderTextarea('Inspirations (Pinterest, images...)', 'sections.style.inspirations')}
            {renderTextarea('Éléments auxquels ils tiennent particulièrement', 'sections.style.importantElements')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="progress" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            4. État d\'avancement
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROGRESS_ITEMS.map((item) => renderCheckbox(item.label, `sections.progress.${item.key}`))}
            </div>
            {renderTextarea('Détails / autres', 'sections.progress.otherDetails')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="providers" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            5. Les prestataires recherchés
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderCheckboxGroup('Prestataires recherchés', 'sections.providers.searched', PROVIDER_CATEGORIES)}
            {renderCheckboxGroup('Prestataires déjà trouvés', 'sections.providers.found', PROVIDER_CATEGORIES)}
            {renderCheckbox('Souhaite être accompagné dans la sélection', 'sections.providers.wantsHelp')}
            {renderTextarea('Notes prestataires', 'sections.providers.notes')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="animations" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            6. Les animations
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderCheckbox('Souhaite des animations', 'sections.animations.hasAnimations')}
            {renderTextarea('Idées d\'animations évoquées', 'sections.animations.ideas')}
            {renderCheckboxGroup('Animations sélectionnées', 'sections.animations.selected', ANIMATION_OPTIONS)}
            {renderInput('Autre animation', 'sections.animations.other', 'text')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="guestsNeeds" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            7. Les invités
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderCheckbox('Personnes à mobilité réduite', 'sections.guestsNeeds.reducedMobility')}
            {renderTextarea('Besoins alimentaires spécifiques', 'sections.guestsNeeds.dietary')}
            {renderTextarea('Invités venant de loin ou de l\'étranger', 'sections.guestsNeeds.fromAbroad')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="expectations" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            8. Les principales attentes
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderCheckboxGroup('Préoccupations principales', 'sections.expectations.selected', CONCERN_OPTIONS)}
            {renderTextarea('Autres attentes', 'sections.expectations.other')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="offers" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            9. Présentation des offres Le Oui Parfait
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderCheckboxGroup('Offres présentées', 'sections.offers.presented', OFFER_OPTIONS)}
            {renderSelect('Offre retenue', 'sections.offers.selected', OFFER_OPTIONS)}
            {renderInput('Prix proposé (€)', 'sections.offers.price', 'number')}
            {renderTextarea('Notes offres', 'sections.offers.notes')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="budget" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            10. Le budget
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderInput('Budget global estimé (€)', 'sections.budget.estimatedGlobal', 'number')}
            {renderCheckbox('Prestation wedding planner incluse', 'sections.budget.includesWeddingPlanner')}
            {renderInput('Frais d\'étude personnalisée (€)', 'sections.budget.studyFee', 'number')}
            {renderTextarea('Notes budget', 'sections.budget.notes')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="conclusion" className="border rounded-lg px-4 bg-white shadow-sm">
          <AccordionTrigger className="text-brand-purple font-semibold hover:no-underline">
            11. Conclusion
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {renderTextarea('Conclusion', 'sections.conclusion.notes', 'Résumé, remerciements...')}
            {renderInput('Date de relance / RDV', 'sections.conclusion.followUpDate', 'date')}
            {renderTextarea('Prochaines étapes', 'sections.conclusion.nextSteps', 'Envoi devis, RDV bureau...')}
            {renderCheckbox('RDV bureau pour se rencontrer', 'sections.conclusion.meetingScheduled')}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.push('/agence/decouvertes'))}
          disabled={isCompleting || isConverting}
          className="gap-2 w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise/10 w-full sm:w-auto"
            onClick={handleAutoSaveNow}
            disabled={isAutoSaving || isCompleting || isConverting}
          >
            {isAutoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileClock className="h-4 w-4" />}
            Enregistrer le brouillon
          </Button>

          {mode === 'edit' && formData.type === 'prospect' && onConvert && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-green-600 text-green-600 hover:bg-green-50 w-full sm:w-auto"
              onClick={() => onConvert(formData)}
              disabled={isConverting || isCompleting}
            >
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Convertir en client
            </Button>
          )}

          <Button
            type="button"
            className="bg-brand-purple hover:bg-brand-purple/90 gap-2 w-full sm:w-auto"
            onClick={handleComplete}
            disabled={isCompleting || isConverting}
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Marquer comme terminé
          </Button>
        </div>
      </div>
    </form>
  );
}
