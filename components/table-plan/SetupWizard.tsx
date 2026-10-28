'use client';

/**
 * Assistant de première configuration — s'ouvre quand aucun plan n'existe.
 * 4 étapes : invités → animations → type de table → récapitulatif.
 * La génération elle-même est déléguée à lib/table-plan/wizard.ts (SRP).
 */

import { useState } from 'react';
import { X, Users, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import type { TableShape, SceneObjectKind } from '@/lib/table-plan/types';
import { OBJECT_DEFS } from '@/components/table-plan/StaticHallScene';
import { generatePlan } from '@/lib/table-plan/wizard';

const STEPS = ['Vos invités', 'Vos animations', 'Vos tables', 'Récapitulatif'] as const;

const SHAPE_CHOICES: { shape: TableShape; label: string; desc: string }[] = [
  { shape: 'ronde', label: 'Ronde', desc: 'Conviviale, classique mariage' },
  { shape: 'rectangle', label: 'Rectangle', desc: 'Banquet, table d\'honneur' },
  { shape: 'carree', label: 'Carrée', desc: 'Compacte, symétrique' },
  { shape: 'ovale', label: 'Ovale', desc: 'Élégante, gain de place' },
];

const OBJECT_CHOICES: { kind: SceneObjectKind; hint: string }[] = [
  { kind: 'estrade', hint: 'Table des mariés sur scène' },
  { kind: 'piste', hint: 'Parquet dédié aux danses' },
  { kind: 'allee', hint: 'Tapis blanc + colonnes cristal' },
  { kind: 'buffet', hint: 'Table de service traiteur' },
  { kind: 'bar', hint: 'Comptoir boissons' },
  { kind: 'photobooth', hint: 'Borne photos invités' },
  { kind: 'candy_bar', hint: 'Coin gourmandises' },
  { kind: 'scene', hint: 'DJ / orchestre' },
  { kind: 'urne', hint: 'Urne et livre d\'or' },
];

export function SetupWizard({
  onGenerate,
  onClose,
  isEdit = false,
}: {
  onGenerate: (plan: ReturnType<typeof generatePlan>) => void;
  onClose: () => void;
  /** true = un plan existe déjà : texte "modifier", sinon "créer". */
  isEdit?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [guestCount, setGuestCount] = useState<number>(80);
  const [kinds, setKinds] = useState<SceneObjectKind[]>(['estrade', 'piste', 'allee']);
  const [shape, setShape] = useState<TableShape>('ronde');
  const [seatCount, setSeatCount] = useState(8);

  const toggleKind = (k: SceneObjectKind) =>
    setKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const tableCount = Math.ceil(guestCount / Math.max(1, seatCount));

  const finish = () => {
    onGenerate(generatePlan({ guestCount, shape, seatCount, objectKinds: kinds }));
  };

  const canNext = step === 0 ? guestCount > 0 : true;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-brand-purple/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="px-6 pt-6 pb-4 border-b border-[rgba(75,68,86,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-brand-purple">
                {isEdit ? 'Modifier votre plan de salle' : 'Créer votre plan de salle'}
              </h2>
              <p className="text-[12px] text-brand-gray mt-0.5">
                {isEdit
                  ? 'Vous avez déjà un plan : la régénération recrée la salle (vos invités sont conservés).'
                  : `Étape ${step + 1} sur ${STEPS.length} : ${STEPS[step]}`}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#FAF9F7] hover:bg-[#f0ede8] flex items-center justify-center text-brand-gray">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* progress */}
          <div className="flex gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand-turquoise' : 'bg-[#EDEAE5]'}`} />
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Étape 1 : nombre d'invités */}
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-[13.5px] text-brand-gray leading-relaxed">
                Combien d'invités seront présents à votre réception ? Nous dimensionnerons la salle en fonction.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setGuestCount((g) => Math.max(10, g - 10))}
                  className="w-10 h-10 rounded-full bg-[#FAF9F7] border border-[rgba(75,68,86,0.12)] text-brand-purple text-lg font-bold hover:border-brand-turquoise">−</button>
                <input
                  type="number" min={2} max={600} value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(2, Number(e.target.value) || 2))}
                  className="w-28 text-center text-3xl font-bold text-brand-purple border-b-2 border-brand-turquoise focus:outline-none bg-transparent"
                />
                <button onClick={() => setGuestCount((g) => g + 10)}
                  className="w-10 h-10 rounded-full bg-[#FAF9F7] border border-[rgba(75,68,86,0.12)] text-brand-purple text-lg font-bold hover:border-brand-turquoise">+</button>
              </div>
              <div className="flex justify-center gap-2">
                {[40, 60, 80, 100, 150, 200].map((n) => (
                  <button key={n} onClick={() => setGuestCount(n)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${guestCount === n ? 'bg-brand-turquoise text-white' : 'bg-[#FAF9F7] text-brand-gray border border-[rgba(75,68,86,0.1)]'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-center text-[12px] text-brand-gray flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {guestCount} invités
              </p>
            </div>
          )}

          {/* Étape 2 : animations */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13.5px] text-brand-gray">
                Sélectionnez les éléments prévus dans votre salle. Ils seront placés automatiquement, puis réglables.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {OBJECT_CHOICES.map(({ kind, hint }) => {
                  const active = kinds.includes(kind);
                  return (
                    <button key={kind} onClick={() => toggleKind(kind)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${active ? 'border-brand-turquoise bg-brand-turquoise/5' : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7]'}`}>
                      <div>
                        <p className={`text-[13px] font-semibold ${active ? 'text-brand-purple' : 'text-brand-gray'}`}>{OBJECT_DEFS[kind].label}</p>
                        <p className="text-[11px] text-brand-gray">{hint}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? 'bg-brand-turquoise text-white' : 'border border-[rgba(75,68,86,0.2)]'}`}>
                        {active && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Étape 3 : forme + places */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-[13.5px] text-brand-gray">Choisissez la forme de vos tables.</p>
              <div className="grid grid-cols-2 gap-2.5">
                {SHAPE_CHOICES.map(({ shape: s, label, desc }) => (
                  <button key={s} onClick={() => setShape(s)}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${shape === s ? 'border-brand-turquoise bg-brand-turquoise/5' : 'border-[rgba(75,68,86,0.1)] bg-[#FAF9F7]'}`}>
                    <div className={`mx-auto mb-2 bg-[#4B4456] ${s === 'ronde' ? 'w-9 h-9 rounded-full' : s === 'ovale' ? 'w-12 h-7 rounded-full' : s === 'carree' ? 'w-9 h-9 rounded-[6px]' : 'w-12 h-6 rounded-[6px]'}`} />
                    <p className="text-[13px] font-semibold text-brand-purple text-center">{label}</p>
                    <p className="text-[10.5px] text-brand-gray text-center">{desc}</p>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[13.5px] text-brand-gray mb-2">Places par table : <strong className="text-brand-purple">{seatCount}</strong></p>
                <div className="flex gap-1.5">
                  {[4, 6, 8, 10, 12].map((n) => (
                    <button key={n} onClick={() => setSeatCount(n)}
                      className={`flex-1 h-10 rounded-lg text-[13px] font-semibold transition-colors ${seatCount === n ? 'bg-brand-turquoise text-white' : 'bg-[#FAF9F7] border border-[rgba(75,68,86,0.1)] text-brand-purple'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape 4 : récap */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[13.5px] text-brand-gray">Voici ce que nous allons générer :</p>
              <div className="rounded-2xl bg-[#FAF9F7] border border-[rgba(75,68,86,0.08)] divide-y divide-[rgba(75,68,86,0.06)]">
                {[
                  ['Invités', `${guestCount} personnes`],
                  ['Tables', `${tableCount} tables ${SHAPE_CHOICES.find((s) => s.shape === shape)?.label.toLowerCase()}s de ${seatCount} places`],
                  ['Animations', kinds.length ? kinds.map((k) => OBJECT_DEFS[k].label).join(', ') : 'Aucune'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start px-4 py-3">
                    <span className="text-[12.5px] font-semibold text-brand-gray">{label}</span>
                    <span className="text-[12.5px] font-medium text-brand-purple text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-brand-gray leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-brand-turquoise shrink-0 mt-0.5" />
                La salle sera dimensionnée automatiquement. Tout reste modifiable ensuite : positions, noms de tables, invités.
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-[rgba(75,68,86,0.08)] flex justify-between gap-3">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-[12.5px] font-semibold text-brand-gray hover:text-brand-purple disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-brand-purple text-white text-[12.5px] font-semibold shadow hover:opacity-90 disabled:opacity-50">
              Continuer <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={finish}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-brand-turquoise text-white text-[12.5px] font-semibold shadow hover:bg-brand-turquoise-hover">
              <Sparkles className="w-4 h-4" /> {isEdit ? 'Régénérer ma salle' : 'Générer ma salle'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
