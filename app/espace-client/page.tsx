'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { ClientDashboardLayout } from '@/components/layout/ClientDashboardLayout';
import { cn } from '@/lib/utils';
import { getDocuments, updateDocument } from '@/lib/db';
import { calculateDaysRemaining, PaymentData, getClientPayments, DocumentData, getClientDocuments } from '@/lib/client-helpers';
import { Loader2, ChevronRight, Users, Euro, Sparkles, Calendar, FileText, CreditCard, Heart, Check, X } from 'lucide-react';
import Image from 'next/image';

type Milestone = {
  id: string;
  kind?: 'milestone';
  event_id: string;
  title: string;
  description?: string;
  deadline?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
};

const teamColors = ['#4B4456', '#6a9a98', '#C9A96E', '#B98A96', '#88b7b5', '#B7A6C0'];

export default function ClientPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { client, event, loading: dataLoading } = useClientData();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [expenses, setExpenses] = useState<{ label: string; amount: number; heightClass: string }[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingPaymentsTotal, setPendingPaymentsTotal] = useState(0);
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  const displayDate = (event as any)?.event_date || (client as any)?.event_date || '';
  const displayGuests = (event as any)?.guest_count ?? (client as any)?.guests ?? 0;
  const displayBudget = (event as any)?.budget ?? (client as any)?.budget ?? 0;
  const coupleNames =
    (event as any)?.couple_names ||
    `${(client as any)?.name || ''}${(client as any)?.name && (client as any)?.partner ? ' & ' : ''}${(client as any)?.partner || ''}`
      .trim() ||
    'Client';
  const daysRemaining = displayDate ? calculateDaysRemaining(displayDate) : 0;

  const sortedMilestones = useMemo(() => {
    return milestones.slice().sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
  }, [milestones]);

  const milestonesDone = useMemo(() => {
    return sortedMilestones.filter((m) => Boolean(m.admin_confirmed) && Boolean(m.client_confirmed)).length;
  }, [sortedMilestones]);

  const milestonesTotal = sortedMilestones.length;
  const progressPct = milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;

  const nextMilestones = useMemo(() => {
    return sortedMilestones
      .filter((m) => !(Boolean(m.admin_confirmed) && Boolean(m.client_confirmed)))
      .slice(0, 4);
  }, [sortedMilestones]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'client') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchMilestones = async () => {
      const eventId = String(event?.id || '').trim();
      const clId = String(client?.id || '').trim();
      if (!eventId && !clId) {
        setMilestones([]);
        return;
      }
      setMilestonesLoading(true);
      try {
        const items = await getDocuments('tasks', [
          eventId
            ? { field: 'event_id', operator: '==', value: eventId }
            : { field: 'client_id', operator: '==', value: clId },
        ]);
        const only = (items as any[]).filter((t) => t?.kind === 'milestone') as Milestone[];
        setMilestones(only);
      } catch (e) {
        console.error('Error fetching milestones (home):', e);
        setMilestones([]);
      } finally {
        setMilestonesLoading(false);
      }
    };

    fetchMilestones();
  }, [event?.id, client?.id]);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!client?.id) {
        setTeam([]);
        return;
      }
      setTeamLoading(true);
      try {
        const links = await getDocuments('client_vendors', [{ field: 'client_id', operator: '==', value: client.id }]);
        const plannerId = client.planner_id;
        const allVendors = plannerId
          ? await getDocuments('vendors', [{ field: 'planner_id', operator: '==', value: plannerId }])
          : [];
        const byId = new Map<string, any>((allVendors as any[]).map((v: any) => [v.id, v]));

        const mapped = (links as any[]).map((l: any, idx: number) => {
          const v = byId.get(l.vendor_id);
          const name = v?.name || l.vendor_name || 'Prestataire';
          const role = v?.category || l.vendor_category || 'Prestataire';
          const initials = (String(name)
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0]?.toUpperCase())
            .join('') || 'PR').slice(0, 2);
          return { id: l.vendor_id, name, role, initials, color: teamColors[idx % teamColors.length] };
        });
        setTeam(mapped.slice(0, 5));
      } catch (e) {
        console.error('Error fetching team (home):', e);
        setTeam([]);
      } finally {
        setTeamLoading(false);
      }
    };

    fetchTeam();
  }, [client?.id, client?.planner_id]);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!client?.id) {
        setExpenses([]);
        return;
      }
      setExpensesLoading(true);
      try {
        const payments = await getClientPayments(client.id);
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        const now = new Date();
        const last3: { label: string; amount: number }[] = [];
        for (let i = 2; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          last3.push({ label: months[d.getMonth()], amount: 0 });
        }
        payments.forEach((p: PaymentData) => {
          const raw = p.date || p.due_date || p.paid_at;
          if (!raw) return;
          const d = new Date(String(raw));
          if (Number.isNaN(d.getTime())) return;
          const label = months[d.getMonth()];
          const bucket = last3.find((m) => m.label === label);
          if (bucket) bucket.amount += Number(p.amount || 0);
        });
        const max = Math.max(...last3.map((m) => m.amount), 1);
        const withHeight = last3.map((m, i) => {
          const pct = Math.round((m.amount / max) * 100);
          let heightClass = 'h-[34%]';
          if (pct >= 70) heightClass = 'h-[88%]';
          else if (pct >= 40) heightClass = 'h-[62%]';
          else if (pct >= 20) heightClass = 'h-[45%]';
          return { ...m, heightClass, barClass: i === 0 ? 'bg-[rgba(136,183,181,0.16)]' : 'bg-[#88b7b5]' };
        });
        setExpenses(withHeight);
        const totalPaid = payments.reduce(
          (sum, p) => sum + (Number(p.paid_amount || 0) || (p.status === 'paid' || p.status === 'completed' ? Number(p.amount || 0) : 0)),
          0
        );
        const pending = payments.filter((p) => p.status !== 'paid' && p.status !== 'completed');
        setPendingPaymentsCount(pending.length);
        setPendingPaymentsTotal(pending.reduce((sum, p) => sum + Number(p.amount || 0), 0));
        setPaidAmount(totalPaid);
      } catch (e) {
        console.error('Error fetching expenses (home):', e);
        setExpenses([]);
      } finally {
        setExpensesLoading(false);
      }
    };

    fetchExpenses();
  }, [client?.id]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!client?.id) {
        setDocuments([]);
        return;
      }
      try {
        const items = await getClientDocuments(client.id);
        setDocuments(items);
      } catch (e) {
        console.error('Error fetching documents (home):', e);
        setDocuments([]);
      }
    };

    fetchDocuments();
  }, [client?.id]);

  if (authLoading || !user || user.role !== 'client' || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-brand-turquoise mx-auto" />
          <p className="mt-4 text-brand-gray">Préparation de votre espace...</p>
        </div>
      </div>
    );
  }

  const confirmMilestone = async (m: Milestone) => {
    if (!m?.id) return;
    const next = !m.client_confirmed;
    setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, client_confirmed: next } : x)));
    try {
      await updateDocument('tasks', m.id, { client_confirmed: next });
    } catch (e) {
      console.error('Error updating milestone confirmation (home):', e);
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, client_confirmed: !next } : x)));
    }
  };

  const ringCircumference = 2 * Math.PI * 44;
  const ringOffset = ringCircumference * (1 - Math.min(progressPct, 100) / 100);

  const initials = (() => {
    const src = coupleNames || user?.email || 'CL';
    return (
      String(src)
        .split(/\s+|\s*&\s*/)
        .filter(Boolean)
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'CL'
    );
  })();

  const chartMax = Math.max(...expenses.map((e) => e.amount), 1);

  return (
    <ClientDashboardLayout clientName={coupleNames} daysRemaining={daysRemaining}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        <div>
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-[#4B4456] px-7 py-7 sm:px-8 sm:py-8 mb-5">
            <span className="inline-block text-[10px] tracking-[0.15em] uppercase text-[#4B4456] bg-white/90 px-3 py-1.5 rounded-full mb-4">
              Mariage
            </span>
            <h1 className="font-baskerville text-[#FAF9F7] text-2xl sm:text-[26px] leading-tight max-w-md mb-6">
              Votre grand jour
              <br />
              prend forme, jour après jour.
            </h1>
            <button
              onClick={() => router.push('/espace-client/mariage')}
              className="inline-flex items-center gap-2.5 bg-[#2E2937] text-white text-[13px] font-semibold pl-5 pr-2.5 py-2.5 rounded-full hover:bg-[#1f1c26] transition-colors"
            >
              Voir mon mariage
              <span className="w-6 h-6 rounded-full bg-[#88b7b5] flex items-center justify-center">
                <ChevronRight className="w-3 h-3 text-[#4B4456]" />
              </span>
            </button>
            <svg
              className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.18] hidden sm:block"
              width="140"
              height="140"
              viewBox="0 0 100 100"
              fill="none"
            >
              <path d="M50 5 L56 44 L95 50 L56 56 L50 95 L44 56 L5 50 L44 44 Z" fill="#fff" />
            </svg>
          </div>

          {/* Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-7">
            <div className="flex items-center gap-3 bg-white border border-[rgba(75,68,86,0.08)] rounded-2xl px-4 py-3.5">
              <div className="w-[38px] h-[38px] rounded-xl bg-[rgba(75,68,86,0.07)] flex items-center justify-center text-[#4B4456]">
                <Users className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="text-[11px] text-[#9C97A3] mb-0.5">{displayGuests || 0} invités</div>
                <div className="text-[13.5px] font-semibold text-[#4B4456]">Invités</div>
              </div>
              <div className="ml-auto text-[#C9C4CE]">⋮</div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-[rgba(75,68,86,0.08)] rounded-2xl px-4 py-3.5">
              <div className="w-[38px] h-[38px] rounded-xl bg-[#F3E3E6] flex items-center justify-center text-[#B98A96]">
                <Euro className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="text-[11px] text-[#9C97A3] mb-0.5">
                  {paidAmount.toLocaleString('fr-FR')} / {Number(displayBudget || 0).toLocaleString('fr-FR')} €
                </div>
                <div className="text-[13.5px] font-semibold text-[#4B4456]">Budget</div>
              </div>
              <div className="ml-auto text-[#C9C4CE]">⋮</div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-[rgba(75,68,86,0.08)] rounded-2xl px-4 py-3.5">
              <div className="w-[38px] h-[38px] rounded-xl bg-[rgba(136,183,181,0.16)] flex items-center justify-center text-[#6a9a98]">
                <Sparkles className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="text-[11px] text-[#9C97A3] mb-0.5">
                  {milestonesDone}/{milestonesTotal || 0} étapes
                </div>
                <div className="text-[13.5px] font-semibold text-[#4B4456]">Préparatifs</div>
              </div>
              <div className="ml-auto text-[#C9C4CE]">⋮</div>
            </div>
          </div>

          {/* Aperçu fonctionnel */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-baskerville text-xl text-[#4B4456]">En un coup d&apos;œil</h2>
            <div className="flex gap-2">
              <button className="w-[30px] h-[30px] rounded-full bg-[#FAF9F7] text-[#4B4456] flex items-center justify-center hover:bg-[rgba(75,68,86,0.07)] transition-colors">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
              <button className="w-[30px] h-[30px] rounded-full bg-[#88b7b5] text-white flex items-center justify-center hover:bg-[#6a9a98] transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
            <button
              onClick={() => router.push('/espace-client/paiements')}
              className="text-left bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="relative h-[120px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#B7A6C0] to-[#8C7A9B]">
                <Image
                  src="/couple-mariage.jpg"
                  alt="Paiements"
                  fill
                  className="object-cover opacity-60"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <div className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-full bg-white/85 flex items-center justify-center text-[#4B4456]">
                  <Heart className="w-[13px] h-[13px]" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wide uppercase text-[#B98A96] bg-[#F3E3E6] px-2 py-0.5 rounded-full inline-block mb-2.5">
                  <CreditCard className="w-3 h-3" />
                  Paiements en attente
                </div>
                <p className="text-[13.5px] font-semibold text-[#4B4456] leading-snug mb-2">
                  {pendingPaymentsCount} paiement{pendingPaymentsCount > 1 ? 's' : ''} en attente
                </p>
                <p className="text-[11.5px] text-[#9C97A3] mb-3">
                  Restant dû : {pendingPaymentsTotal.toLocaleString('fr-FR')} €
                </p>
                <div className="flex items-center justify-between pt-2.5 border-t-2 border-[#B98A96]">
                  <div className="flex items-center gap-2">
                    <div className="w-[26px] h-[26px] rounded-full bg-[#B98A96] flex items-center justify-center text-[10px] font-semibold text-white">{initials}</div>
                    <div>
                      <div className="text-[11.5px] font-semibold text-[#4B4456] leading-tight truncate max-w-[110px]">{coupleNames}</div>
                      <div className="text-[10.5px] text-[#9C97A3]">Votre mariage</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#B98A96]">Accéder →</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/espace-client/documents')}
              className="text-left bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="relative h-[120px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#9FBDBB] to-[#6a9a98]">
                <Image
                  src="/ia.jpg"
                  alt="Documents"
                  fill
                  className="object-cover opacity-60"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <div className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-full bg-white/85 flex items-center justify-center text-[#4B4456]">
                  <Heart className="w-[13px] h-[13px]" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wide uppercase text-[#6a9a98] bg-[rgba(136,183,181,0.16)] px-2 py-0.5 rounded-full inline-block mb-2.5">
                  <FileText className="w-3 h-3" />
                  Documents
                </div>
                <p className="text-[13.5px] font-semibold text-[#4B4456] leading-snug mb-2">
                  {documents.length} document{documents.length > 1 ? 's' : ''}
                </p>
                <p className="text-[11.5px] text-[#9C97A3] truncate mb-3">
                  {documents[0]?.name || 'Aucun document'}
                </p>
                <div className="flex items-center justify-between pt-2.5 border-t-2 border-[#88b7b5]">
                  <div className="flex items-center gap-2">
                    <div className="w-[26px] h-[26px] rounded-full bg-[#88b7b5] flex items-center justify-center text-[10px] font-semibold text-white">{initials}</div>
                    <div>
                      <div className="text-[11.5px] font-semibold text-[#4B4456] leading-tight truncate max-w-[110px]">{coupleNames}</div>
                      <div className="text-[10.5px] text-[#9C97A3]">Votre mariage</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#6a9a98]">Accéder →</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/espace-client/planning')}
              className="text-left bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div className="relative h-[120px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#D9C6AE] to-[#C9A96E]">
                <Image
                  src="/couple-mariage.jpg"
                  alt="Planning"
                  fill
                  className="object-cover opacity-60"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <div className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-full bg-white/85 flex items-center justify-center text-[#4B4456]">
                  <Heart className="w-[13px] h-[13px]" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wide uppercase text-[#C9A96E] bg-[#F1EADD] px-2 py-0.5 rounded-full inline-block mb-2.5">
                  <Calendar className="w-3 h-3" />
                  Planning
                </div>
                <p className="text-[13.5px] font-semibold text-[#4B4456] leading-snug mb-2">
                  {nextMilestones.length > 0 ? nextMilestones[0].title : 'Aucune étape à venir'}
                </p>
                <p className="text-[11.5px] text-[#9C97A3] mb-3">
                  {nextMilestones.length > 0 && nextMilestones[0].deadline
                    ? `Échéance : ${nextMilestones[0].deadline}`
                    : `${milestonesTotal - milestonesDone} étape${milestonesTotal - milestonesDone > 1 ? 's' : ''} restante`}
                </p>
                <div className="flex items-center justify-between pt-2.5 border-t-2 border-[#C9A96E]">
                  <div className="flex items-center gap-2">
                    <div className="w-[26px] h-[26px] rounded-full bg-[#C9A96E] flex items-center justify-center text-[10px] font-semibold text-white">{initials}</div>
                    <div>
                      <div className="text-[11.5px] font-semibold text-[#4B4456] leading-tight truncate max-w-[110px]">{coupleNames}</div>
                      <div className="text-[10.5px] text-[#9C97A3]">Votre mariage</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#C9A96E]">Accéder →</span>
                </div>
              </div>
            </button>
          </div>

          {/* Itinerary */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-baskerville text-xl text-[#4B4456]">Votre itinéraire</h2>
            <button onClick={() => router.push('/espace-client/planning')} className="text-xs font-semibold text-[#6a9a98] hover:underline">
              Voir tout
            </button>
          </div>

          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5 sm:p-6 mb-6 overflow-hidden">
            {milestonesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[#88b7b5]" />
              </div>
            ) : nextMilestones.length === 0 ? (
              <p className="text-sm text-[#5A5A5A] py-6 text-center">
                Vos prochaines étapes apparaîtront ici à mesure que votre mariage prend forme.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] pb-3.5 font-semibold">Étape</th>
                      <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] pb-3.5 font-semibold">Type</th>
                      <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] pb-3.5 font-semibold">Description</th>
                      <th className="text-left text-[10px] tracking-[0.1em] uppercase text-[#9C97A3] pb-3.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextMilestones.map((m) => (
                      <tr key={m.id} className="border-t border-[rgba(75,68,86,0.06)]">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#4B4456] flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                              {m.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold text-[#4B4456]">{m.title}</div>
                              {m.deadline ? <div className="text-[11px] text-[#9C97A3]">Échéance : {m.deadline}</div> : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-[rgba(136,183,181,0.16)] text-[#6a9a98] px-2.5 py-1 rounded-full">Étape</span>
                        </td>
                        <td className="py-3">
                          <span className="text-[13px] text-[#5A5A5A]">{m.description || 'À valider'}</span>
                        </td>
                        <td className="py-3">
                          {!m.client_confirmed && (
                            <button
                              onClick={() => void confirmMilestone(m)}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors',
                                'bg-[rgba(136,183,181,0.16)] text-[#6a9a98] hover:bg-[rgba(136,183,181,0.28)]'
                              )}
                            >
                              <Check className="w-3 h-3" />
                              Confirmer
                            </button>
                          )}
                          {m.client_confirmed && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[rgba(136,183,181,0.16)] text-[#6a9a98]">
                              <Check className="w-3 h-3" />
                              Confirmé
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right column */}
        <div>
          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5 mb-4">
            <div className="flex items-center justify-between text-[15px] font-semibold text-[#4B4456] mb-5">
              Compte à rebours
              <span className="text-[#C9C4CE] cursor-pointer">⋮</span>
            </div>
            <div className="relative w-[100px] h-[100px] mx-auto mb-4">
              <svg
                width="100"
                height="100"
                viewBox="0 0 100 100"
                className="absolute inset-0"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(75,68,86,0.07)" strokeWidth="7" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#88b7b5"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="absolute inset-2 rounded-full bg-[rgba(75,68,86,0.07)] flex items-center justify-center font-baskerville text-xl text-[#4B4456]">
                {initials}
              </div>
              <div className="absolute -top-1 -right-1 bg-[#4B4456] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {progressPct}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-[14.5px] font-bold text-[#4B4456]">Bonjour {coupleNames} 💍</div>
              <div className="text-[11.5px] text-[#9C97A3] mt-1 leading-snug">
                Plus que {daysRemaining} jours avant votre grand jour !
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5 mb-4">
            <div className="text-[15px] font-semibold text-[#4B4456] mb-5">Dépenses</div>
            {expensesLoading ? (
              <div className="flex items-center justify-center h-[90px]">
                <Loader2 className="h-5 w-5 animate-spin text-[#88b7b5]" />
              </div>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-[#9C97A3] text-center py-6">Aucune dépense enregistrée.</p>
            ) : (
              <div className="flex items-end gap-4 h-[90px] mb-2 pl-8 relative">
                <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[9.5px] text-[#9C97A3]">
                  <span>{Math.round(chartMax).toLocaleString('fr-FR')}€</span>
                  <span>{Math.round(chartMax / 2).toLocaleString('fr-FR')}€</span>
                  <span>0€</span>
                </div>
                {expenses.map((e, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className={`w-6 rounded-t-md ${i === 0 ? 'bg-[rgba(136,183,181,0.16)]' : 'bg-[#88b7b5]'} ${e.heightClass}`} />
                    <span className="text-[10px] text-[#9C97A3]">{e.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[18px] border border-[rgba(75,68,86,0.06)] p-5">
            <div className="text-[15px] font-semibold text-[#4B4456] mb-5">Votre équipe</div>
            {teamLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#88b7b5]" />
              </div>
            ) : team.length === 0 ? (
              <p className="text-sm text-[#9C97A3] text-center py-4">Aucun prestataire ajouté pour le moment.</p>
            ) : (
              <>
                {team.map((member) => (
                  <div key={member.id} className="flex items-center gap-2.5 py-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-[#4B4456] truncate">{member.name}</div>
                      <div className="text-[10.5px] text-[#9C97A3] truncate">{member.role}</div>
                    </div>
                    <button
                      onClick={() => router.push('/espace-client/prestataires')}
                      className="text-[11px] font-semibold text-[#4B4456] border border-[rgba(75,68,86,0.18)] px-3 py-1.5 rounded-full hover:bg-[rgba(75,68,86,0.05)] transition-colors shrink-0"
                    >
                      Voir
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => router.push('/espace-client/prestataires')}
                  className="w-full mt-3 bg-[#4B4456] text-white text-[12.5px] font-semibold py-2.5 rounded-xl hover:bg-[#3a3446] transition-colors"
                >
                  Voir toute l&apos;équipe
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
}
