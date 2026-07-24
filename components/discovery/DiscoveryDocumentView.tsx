'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DiscoveryFormData, PROGRESS_ITEMS, PROVIDER_CATEGORIES, ANIMATION_OPTIONS, CONCERN_OPTIONS, OFFER_OPTIONS } from '@/lib/discovery';

function formatDate(iso?: string) {
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  return iso;
}

function YesNo({ value }: { value?: boolean }) {
  return value ? <span className="text-green-600 font-medium">Oui</span> : <span className="text-brand-gray">Non</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 shadow-sm border-0">
      <h4 className="text-sm font-bold text-brand-purple uppercase tracking-wide mb-3 font-baskerville">{title}</h4>
      {children}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs text-brand-gray">{label}</p>
      <div className="text-sm text-brand-purple font-medium whitespace-pre-wrap">{value || '—'}</div>
    </div>
  );
}

function Chips({ values }: { values?: string[] }) {
  if (!values || values.length === 0) return <span className="text-brand-gray">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="text-xs">
          {v}
        </Badge>
      ))}
    </div>
  );
}

export function DiscoveryDocumentView({ data }: { data: DiscoveryFormData }) {
  const s = data.sections;

  return (
    <div className="space-y-5">
      <Card className="p-5 shadow-md border-0 bg-gradient-to-br from-white to-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-brand-purple font-baskerville">
              {data.name || 'Prospect'} {data.partner ? `& ${data.partner}` : ''}
            </h2>
            <p className="text-sm text-brand-gray">Fiche découverte – Premier rendez-vous téléphonique</p>
          </div>
          <Badge
            className={
              data.status === 'converted'
                ? 'bg-green-600 text-white'
                : data.status === 'completed'
                ? 'bg-brand-turquoise text-white'
                : 'bg-orange-100 text-orange-700'
            }
          >
            {data.status === 'converted' ? 'Converti' : data.status === 'completed' ? 'Terminé' : 'Brouillon'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Email" value={data.email} />
          <Field label="Téléphone" value={data.phone} />
          <Field label="Date de l'appel" value={formatDate(data.callDate)} />
          <Field label="Source du lead" value={data.leadSource} />
          <Field label="Date du mariage" value={formatDate(data.weddingDate)} />
          <Field label="Date confirmée" value={<YesNo value={data.dateConfirmed} />} />
          <div className="sm:col-span-2" />
        </div>
      </Card>

      <Section title="1. Présentation">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Interlocuteur" value={s.presentation.interviewer} />
          <Field label="Type d'échange" value={s.presentation.callType} />
          <div />
        </div>
        <Field label="Notes" value={s.presentation.notes} />
      </Section>

      <Section title="2. Projet">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Date prévue" value={formatDate(s.project.date)} />
          <Field label="Date confirmée" value={<YesNo value={s.project.dateConfirmed} />} />
          <Field label="Date civile" value={formatDate(s.project.civilDate)} />
          <Field label="Date religieuse" value={formatDate(s.project.religiousDate)} />
          <Field label="Type d'événement" value={s.project.eventType} />
          <Field label="Besoin d'animatrice" value={<YesNo value={s.project.needAnimator} />} />
          <Field label="Adultes" value={s.project.guestAdults} />
          <Field label="Enfants" value={s.project.guestChildren} />
          <Field label="Âges des enfants" value={s.project.childrenAges} />
        </div>
        <Field label="Notes projet" value={s.project.notes} />
      </Section>

      <Section title="3. Envies & univers">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Thème" value={s.style.theme} />
          <Field label="Ambiance" value={s.style.ambiance} />
          <Field label="Couleurs" value={s.style.colors} />
          <Field label="Styles" value={<Chips values={s.style.selectedStyles} />} />
          <Field label="Inspirations" value={s.style.inspirations} />
          <Field label="Éléments importants" value={s.style.importantElements} />
        </div>
      </Section>

      <Section title="4. État d'avancement">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROGRESS_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between text-sm">
              <span className="text-brand-purple">{item.label}</span>
              <YesNo value={Boolean(s.progress[item.key])} />
            </div>
          ))}
        </div>
        {s.progress.otherDetails && <Field label="Autres détails" value={s.progress.otherDetails} />}
      </Section>

      <Section title="5. Prestataires">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Recherchés" value={<Chips values={s.providers.searched} />} />
          <Field label="Déjà trouvés" value={<Chips values={s.providers.found} />} />
        </div>
        <Field label="Accompagnement souhaité" value={<YesNo value={s.providers.wantsHelp} />} />
        <Field label="Notes" value={s.providers.notes} />
      </Section>

      <Section title="6. Animations">
        <Field label="Animations souhaitées" value={<YesNo value={s.animations.hasAnimations} />} />
        <Field label="Idées" value={s.animations.ideas} />
        <Field label="Sélectionnées" value={<Chips values={s.animations.selected} />} />
        <Field label="Autre" value={s.animations.other} />
      </Section>

      <Section title="7. Invités">
        <Field label="Mobilité réduite" value={<YesNo value={s.guestsNeeds.reducedMobility} />} />
        <Field label="Besoins alimentaires" value={s.guestsNeeds.dietary} />
        <Field label="Invités de loin / étranger" value={s.guestsNeeds.fromAbroad} />
      </Section>

      <Section title="8. Attentes">
        <Field label="Principales préoccupations" value={<Chips values={s.expectations.selected} />} />
        <Field label="Autres" value={s.expectations.other} />
      </Section>

      <Section title="9. Offres Le Oui Parfait">
        <Field label="Offres présentées" value={<Chips values={s.offers.presented} />} />
        <Field label="Offre retenue" value={s.offers.selected} />
        <Field label="Prix proposé" value={s.offers.price ? `${s.offers.price} €` : ''} />
        <Field label="Notes" value={s.offers.notes} />
      </Section>

      <Section title="10. Budget">
        <Field label="Budget global estimé" value={s.budget.estimatedGlobal ? `${s.budget.estimatedGlobal} €` : ''} />
        <Field label="Wedding planner inclus" value={<YesNo value={s.budget.includesWeddingPlanner} />} />
        <Field label="Frais d'étude" value={s.budget.studyFee ? `${s.budget.studyFee} €` : ''} />
        <Field label="Notes" value={s.budget.notes} />
      </Section>

      <Section title="11. Conclusion">
        <Field label="Conclusion" value={s.conclusion.notes} />
        <Field label="Relance / RDV" value={formatDate(s.conclusion.followUpDate)} />
        <Field label="Prochaines étapes" value={s.conclusion.nextSteps} />
        <Field label="RDV bureau planifié" value={<YesNo value={s.conclusion.meetingScheduled} />} />
      </Section>
    </div>
  );
}
