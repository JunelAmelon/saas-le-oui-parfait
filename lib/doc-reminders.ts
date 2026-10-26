/**
 * Builders purs des emails de rappel "document non consulté" (J+5).
 * SRP : la composition des textes est séparée du cron qui les envoie.
 * Pas de HTML arbitraire : texte brut issu de données sanitisees.
 */

export interface DocReminderEmailContext {
  docName: string;
  coupleName: string;
  plannerName: string;
}

const plannerSignature = (plannerName?: string): string => {
  const name = (plannerName || '').trim();
  return name && name !== 'Le Oui Parfait' ? `${name}\nLe Oui Parfait` : 'Le Oui Parfait';
};

export function buildClientDocReminderEmail(ctx: DocReminderEmailContext): {
  subject: string;
  text: string;
} {
  const docName = (ctx.docName || '').trim() || 'votre document';
  const coupleName = (ctx.coupleName || '').trim();
  return {
    subject: 'Un document vous attend dans votre espace client',
    text: `Bonjour ${coupleName || 'à vous deux'},\n\nLe document « ${docName} » est disponible dans votre espace client depuis quelques jours et n'a pas encore été consulté.\n\nPensez à y jeter un œil dans l'onglet Documents de votre espace.\n\nSi vous avez une question, écrivez-moi via la messagerie de votre espace client.\n\nÀ très vite,\n${plannerSignature(ctx.plannerName)}`,
  };
}

export function buildPlannerDocReminderEmail(ctx: DocReminderEmailContext): {
  subject: string;
  text: string;
} {
  const docName = (ctx.docName || '').trim() || 'Document';
  const coupleName = (ctx.coupleName || '').trim() || 'le couple';
  return {
    subject: `Document non consulté : ${docName} · ${coupleName}`,
    text: `Bonjour,\n\nLe document « ${docName} » partagé avec ${coupleName} n'a toujours pas été ouvert après 5 jours.\n\nVous pouvez relancer le couple depuis la page Documents, bouton « Relancer le client ».\n\nLe Oui Parfait`,
  };
}
