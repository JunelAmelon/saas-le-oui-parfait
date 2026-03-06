import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { assistantKnowledge, resolveRelevantArticles } from '@/lib/assistant/knowledge';

type Role = 'admin' | 'client';

type ChatRequestBody = {
  message?: string;
  role?: Role;
  pathname?: string;
  clientId?: string;
};

async function resolveRoleForUid(uid: string): Promise<Role> {
  try {
    const snap = await adminDb.collection('profiles').doc(uid).get();
    const role = String((snap.exists ? (snap.data() as any)?.role : '') || '').toLowerCase();
    return role === 'planner' ? 'admin' : 'client';
  } catch {
    return 'client';
  }
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
}

function toDateMs(v: any): number {
  if (!v) return 0;
  const dt = v?.toDate?.() || new Date(v);
  const ms = dt instanceof Date ? dt.getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

async function queryFirstByField(collectionName: string, field: string, value: any) {
  const snap = await adminDb.collection(collectionName).where(field, '==', value).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function resolveClientForUser(uid: string, email?: string | null) {
  const byUid = await queryFirstByField('clients', 'client_user_id', uid);
  if (byUid) return byUid;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const byEmail = await queryFirstByField('clients', 'email', normalizedEmail);
  if (byEmail) return byEmail;

  const byClientEmail = await queryFirstByField('clients', 'client_email', normalizedEmail);
  if (byClientEmail) return byClientEmail;

  return null;
}

async function getClientSnapshot(params: {
  clientId: string;
  plannerId?: string;
}) {
  const { clientId, plannerId } = params;

  const clientDoc = await adminDb.collection('clients').doc(clientId).get();
  const client = clientDoc.exists ? { id: clientDoc.id, ...clientDoc.data() } : null;

  const expensesQuery = adminDb.collection('expenses').where('client_id', '==', clientId);
  const expensesSnap = plannerId
    ? await expensesQuery.where('planner_id', '==', plannerId).limit(200).get()
    : await expensesQuery.limit(200).get();
  const expenses = expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const invoicesQuery = adminDb.collection('invoices').where('client_id', '==', clientId);
  const invoicesSnap = plannerId
    ? await invoicesQuery.where('planner_id', '==', plannerId).limit(100).get()
    : await invoicesQuery.limit(100).get();
  const invoices = invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const devisQuery = adminDb.collection('devis').where('client_id', '==', clientId);
  const devisSnap = plannerId
    ? await devisQuery.where('planner_id', '==', plannerId).limit(50).get()
    : await devisQuery.limit(50).get();
  const devis = devisSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const tasksQuery = adminDb
    .collection('tasks')
    .where('client_id', '==', clientId)
    .where('kind', '==', 'milestone');
  const tasksSnap = plannerId
    ? await tasksQuery.where('planner_id', '==', plannerId).limit(200).get()
    : await tasksQuery.limit(200).get();
  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const totalExpenses = expenses.reduce((acc, e: any) => acc + Number(e?.amount || 0), 0);
  const paidExpenses = expenses
    .filter((e: any) => e?.status === 'paid')
    .reduce((acc, e: any) => acc + Number(e?.amount || 0), 0);

  const collectedRevenue = invoices.reduce((acc, inv: any) => acc + Number(inv?.paid || 0), 0);
  const remainingRevenue = invoices.reduce(
    (acc, inv: any) => acc + Math.max(0, Number(inv?.montant_ttc || 0) - Number(inv?.paid || 0)),
    0
  );

  const upcomingTasks = tasks
    .slice()
    .sort((a: any, b: any) => String(a?.deadline || '').localeCompare(String(b?.deadline || '')))
    .slice(0, 8)
    .map((t: any) => ({
      title: String(t?.title || ''),
      deadline: String(t?.deadline || ''),
      client_confirmed: Boolean(t?.client_confirmed),
      admin_confirmed: Boolean(t?.admin_confirmed),
    }));

  const devisSummary = devis
    .slice()
    .sort((a: any, b: any) => toDateMs(b?.created_at) - toDateMs(a?.created_at))
    .slice(0, 8)
    .map((d: any) => ({
      reference: String(d?.reference || ''),
      status: String(d?.status || ''),
      total_ttc: Number(d?.total_ttc || d?.montant_ttc || d?.total || 0),
      docusign_status: String(d?.docusign_status || ''),
      client_signed: Boolean(d?.client_signed),
      planner_signed: Boolean(d?.planner_signed),
    }));

  const invoicesSummary = invoices
    .slice()
    .sort((a: any, b: any) => toDateMs(b?.created_at) - toDateMs(a?.created_at))
    .slice(0, 8)
    .map((inv: any) => ({
      reference: String(inv?.reference || ''),
      status: String(inv?.status || ''),
      montant_ttc: Number(inv?.montant_ttc || 0),
      paid: Number(inv?.paid || 0),
      due_date: String(inv?.due_date || ''),
    }));

  return {
    client: client
      ? {
          id: client.id,
          name: String((client as any)?.name || ''),
          partner: String((client as any)?.partner || ''),
          email: String((client as any)?.email || (client as any)?.client_email || ''),
          budget: Number((client as any)?.budget || 0),
          event_date: String((client as any)?.event_date || ''),
          event_location: String((client as any)?.event_location || ''),
          planner_id: String((client as any)?.planner_id || ''),
        }
      : null,
    finance: {
      total_expenses: totalExpenses,
      paid_expenses: paidExpenses,
      pending_expenses: Math.max(0, totalExpenses - paidExpenses),
      collected_revenue: collectedRevenue,
      remaining_revenue: remainingRevenue,
    },
    upcoming_tasks: upcomingTasks,
    devis: devisSummary,
    invoices: invoicesSummary,
  };
}

async function getAdminSnapshot(plannerId: string) {
  const clientsSnap = await adminDb.collection('clients').where('planner_id', '==', plannerId).limit(200).get();
  const clients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const devisSnap = await adminDb.collection('devis').where('planner_id', '==', plannerId).limit(200).get();
  const devis = devisSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const invoicesSnap = await adminDb.collection('invoices').where('planner_id', '==', plannerId).limit(300).get();
  const invoices = invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const expensesSnap = await adminDb.collection('expenses').where('planner_id', '==', plannerId).limit(500).get();
  const expenses = expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const collectedRevenue = invoices.reduce((acc, inv: any) => acc + Number(inv?.paid || 0), 0);
  const remainingRevenue = invoices.reduce(
    (acc, inv: any) => acc + Math.max(0, Number(inv?.montant_ttc || 0) - Number(inv?.paid || 0)),
    0
  );
  const totalExpenses = expenses.reduce((acc, e: any) => acc + Number(e?.amount || 0), 0);

  const statusCounts = devis.reduce((acc: Record<string, number>, d: any) => {
    const key = String(d?.status || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pendingInvoices = invoices.filter((i: any) => String(i?.status || '') !== 'paid');
  const topPendingInvoices = pendingInvoices
    .slice()
    .sort((a: any, b: any) => toDateMs(b?.created_at) - toDateMs(a?.created_at))
    .slice(0, 10)
    .map((i: any) => ({
      reference: String(i?.reference || ''),
      client: String(i?.client || ''),
      status: String(i?.status || ''),
      montant_ttc: Number(i?.montant_ttc || 0),
      paid: Number(i?.paid || 0),
      due_date: String(i?.due_date || ''),
    }));

  const unsignedDevis = devis
    .filter((d: any) => {
      const status = String(d?.status || '');
      return status === 'sent' || status === 'accepted';
    })
    .slice(0, 20)
    .map((d: any) => ({
      reference: String(d?.reference || ''),
      status: String(d?.status || ''),
      client_id: String(d?.client_id || ''),
      client: String(d?.client || ''),
      docusign_status: String(d?.docusign_status || ''),
      client_signed: Boolean(d?.client_signed),
      planner_signed: Boolean(d?.planner_signed),
    }));

  return {
    counts: {
      clients: clients.length,
      devis: devis.length,
      invoices: invoices.length,
      expenses: expenses.length,
      devis_by_status: statusCounts,
    },
    finance: {
      collected_revenue: collectedRevenue,
      remaining_revenue: remainingRevenue,
      total_expenses: totalExpenses,
    },
    highlights: {
      unsigned_devis: unsignedDevis,
      pending_invoices: topPendingInvoices,
    },
  };
}

function buildSystemPrompt(params: { role: Role; pathname: string }) {
  const { role, pathname } = params;

  const basePrompt =
    role === 'client'
      ?
        "Tu es l'assistant IA de Le Oui Parfait. Tu aides un couple (client) à utiliser l'espace client. " +
        "PÉRIMÈTRE STRICT: tu réponds uniquement aux questions liées à l'utilisation de la plateforme (guidage, aide, explications des fonctionnalités, automatisations possibles dans l'app, statuts devis/factures, documents, planning/étapes, budget/dépenses, galerie/photos, prestataires). " +
        "AUTORISÉ: tu peux répondre aux salutations et politesses (bonjour/merci/au revoir) avec une phrase courte, puis proposer une aide liée à la plateforme. " +
        "INTERDIT: répondre à des questions hors sujet (actualité, politique, santé, droit, code/tech général hors plateforme, questions personnelles, divertissement, etc.). " +
        "SI HORS PÉRIMÈTRE: réponds poliment que tu n'es pas destiné à ça et propose de poser une question liée à l'utilisation de la plateforme. " +
        "Tu réponds en français, de manière courte et concrète. " +
        "Tu peux guider l'utilisateur vers la bonne page et proposer des prochaines actions. " +
        "Si une action nécessite l'admin/planner, explique-le clairement. " +
        "N'invente jamais des données: utilise uniquement le snapshot fourni."
      :
        "Tu es l'assistant IA de Le Oui Parfait côté admin/wedding planner. " +
        "PÉRIMÈTRE STRICT: tu réponds uniquement aux questions liées à la plateforme (guidage, aide, explications des fonctionnalités, automatisations possibles dans l'app, gestion clients, devis/DocuSign, factures/paiements, dépenses/budget, planning/étapes, documents, messagerie, galerie/photos, prestataires). " +
        "AUTORISÉ: tu peux répondre aux salutations et politesses (bonjour/merci/au revoir) avec une phrase courte, puis proposer une aide liée à la plateforme. " +
        "INTERDIT: répondre à des questions hors sujet (actualité, politique, santé, droit, code/tech général hors plateforme, questions personnelles, divertissement, etc.). " +
        "SI HORS PÉRIMÈTRE: réponds poliment que tu n'es pas destiné à ça et propose de poser une question liée à l'utilisation de la plateforme. " +
        "Tu réponds en français, de façon concise et orientée action. " +
        "Tu peux analyser le snapshot (devis/factures/dépenses), identifier les urgences (signatures, paiements), et proposer des relances. " +
        "N'invente jamais des données: utilise uniquement le snapshot fourni.";

  const articles = resolveRelevantArticles({ role, pathname });
  const kbText =
    `\n\nBASE DE CONNAISSANCES (à utiliser pour répondre, sans inventer):\n` +
    `- Contexte page: ${pathname || '(inconnu)'}\n` +
    `- ${assistantKnowledge.global.scope}\n` +
    `- ${assistantKnowledge.global.style}\n` +
    `- ${assistantKnowledge.global.refusal}\n` +
    (articles.length
      ?
        `\nARTICLES PERTINENTS:\n` +
        articles
          .map(
            (a) =>
              `\n[TITRE] ${a.title}\n` +
              `[QUAND] ${a.when}\n` +
              `[COMMENT] ${a.how}\n` +
              `[PROBLÈMES COURANTS] ${a.commonIssues}\n`
          )
          .join('')
      : '\nAucun article spécifique trouvé pour cette page. Réponds avec les règles globales et le snapshot.');

  return basePrompt + kbText;
}

async function callOpenAI(params: {
  system: string;
  userMessage: string;
  context: any;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('openai_missing_key', {
      vercelEnv: process.env.VERCEL_ENV || null,
      nodeEnv: process.env.NODE_ENV || null,
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    });
    throw new Error('openai_missing_key');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: params.system },
        {
          role: 'user',
          content:
            `Contexte (snapshot JSON):\n${JSON.stringify(params.context)}\n\nQuestion utilisateur:\n${params.userMessage}`,
        },
      ],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = String(json?.error?.message || 'openai_error');
    const code = String(json?.error?.code || '');

    if (res.status === 401 || code === 'invalid_api_key' || /incorrect api key/i.test(msg)) {
      throw new Error('openai_invalid_key');
    }

    throw new Error(msg);
  }

  const content = String(json?.choices?.[0]?.message?.content || '').trim();
  return content || "Je n'ai pas pu générer une réponse.";
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);

    const body = (await req.json()) as ChatRequestBody;
    const userMessage = String(body?.message || '').trim();
    const role = await resolveRoleForUid(decoded.uid);
    const pathname = String(body?.pathname || '');

    if (!userMessage) return NextResponse.json({ error: 'missing_message' }, { status: 400 });

    const uid = decoded.uid;
    const email = (decoded as any)?.email || '';

    let context: any = { pathname, role };

    if (role === 'client') {
      const client = await resolveClientForUser(uid, email);
      if (!client?.id) return NextResponse.json({ error: 'client_not_found' }, { status: 404 });
      context.snapshot = await getClientSnapshot({ clientId: client.id, plannerId: String((client as any)?.planner_id || '') || undefined });
    } else {
      const clientId = String(body?.clientId || '').trim();
      context.snapshot = await getAdminSnapshot(uid);
      if (clientId) {
        context.client_snapshot = await getClientSnapshot({ clientId, plannerId: uid });
      }
    }

    const answer = await callOpenAI({
      system: buildSystemPrompt({ role, pathname }),
      userMessage,
      context,
    });

    return NextResponse.json({ ok: true, answer });
  } catch (e: any) {
    const message = String(e?.message || 'error');
    console.error('assistant chat error:', e);

    if (message === 'openai_missing_key') {
      return NextResponse.json({ error: 'openai_missing_key' }, { status: 500 });
    }

    if (message === 'openai_invalid_key') {
      return NextResponse.json({ error: 'openai_invalid_key' }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
