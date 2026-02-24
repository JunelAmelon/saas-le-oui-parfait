export type AssistantRole = 'admin' | 'client';

type FeatureArticle = {
  title: string;
  when: string;
  how: string;
  commonIssues: string;
};

type KnowledgeBase = {
  client: Record<string, FeatureArticle>;
  admin: Record<string, FeatureArticle>;
  global: {
    scope: string;
    refusal: string;
    style: string;
  };
};

export const assistantKnowledge: KnowledgeBase = {
  global: {
    scope:
      "Périmètre: assistance uniquement sur l'utilisation de la plateforme Le Oui Parfait (guidage, fonctionnalités, automatisations dans l'app, explication des statuts, résolution d'erreurs liées à l'app).",
    refusal:
      "Si la question n'est pas liée à la plateforme, réponds: 'Je suis un assistant dédié à l'utilisation de la plateforme Le Oui Parfait. Je ne suis pas destiné à répondre à ce type de question. Si tu veux, pose-moi une question sur une fonctionnalité de l'app (devis, documents, planning, galerie, prestataires, paiements, messages, etc.).'",
    style:
      "Style: français, clair, précis, étapes courtes. Indique où cliquer (menu + page). Ne jamais inventer des données. Si une info dépend d'un accès (admin/client) ou d'une validation du planner, le dire.",
  },
  client: {
    '/espace-client': {
      title: 'Tableau de bord (Espace client)',
      when: 'Voir un résumé du mariage (budget, progression, documents, paiements, devis).',
      how:
        "Menu: Tableau de bord. Tu peux ouvrir 'Mon mariage' pour les infos (date/lieu/budget/thème), 'Planning' pour les étapes et rendez-vous, et 'Mes documents' pour devis/contrats/factures. La progression dépend des étapes (milestones) confirmées.",
      commonIssues:
        "Si tu ne vois pas tes infos: vérifie que tu es connecté avec le bon compte client. Si la page charge indéfiniment: rafraîchis et réessaie; si ça persiste, contacte ton wedding planner.",
    },
    '/espace-client/mariage': {
      title: 'Mon mariage',
      when: 'Consulter/mettre à jour les informations (date, lieu, budget, thème, notes).',
      how:
        "Menu: Mon mariage. Pour demander un changement, clique 'Demander une modification', remplis les infos et envoie. Le planner valide ensuite.",
      commonIssues:
        "Si le bouton est grisé: ajoute une note dans le champ obligatoire. Si rien ne s'envoie: vérifie ta connexion puis réessaie.",
    },
    '/espace-client/planning': {
      title: 'Planning',
      when: 'Voir les rendez-vous et les étapes/planning partagés par le planner.',
      how:
        "Menu: Planning. Les rendez-vous et étapes sont ajoutés par ton planner. Tu peux confirmer certaines étapes selon l'écran.",
      commonIssues:
        "Si aucune étape n'apparaît: le planner n'en a peut-être pas créé; contacte-le via Messages.",
    },
    '/espace-client/documents': {
      title: 'Mes documents',
      when: 'Voir/télécharger des documents (contrats, devis, factures) et parfois signer.',
      how:
        "Menu: Mes documents. Tu peux rechercher/filtrer, prévisualiser, télécharger. Selon le document, tu peux voir un statut et parfois lancer une signature.",
      commonIssues:
        "Si la signature ne s'ouvre pas: autorise les popups/redirect, réessaie sur un autre navigateur. Si erreur DocuSign: contacte ton planner.",
    },
    '/espace-client/messages': {
      title: 'Messages',
      when: 'Échanger avec ton wedding planner, envoyer des pièces jointes.',
      how:
        "Menu: Messages. Sélectionne la conversation, écris et envoie. Pour joindre un fichier, utilise l'icône trombone si disponible.",
      commonIssues:
        "Si les messages ne s'affichent pas: recharge la page. Si l'envoi échoue: vérifie ton fichier et ta connexion.",
    },
    '/espace-client/fleurs': {
      title: 'Fleurs',
      when: 'Consulter les compositions florales partagées par ton planner.',
      how:
        "Menu: Fleurs. Tu vois les compositions que le planner a marquées comme visibles. Utilise la recherche pour filtrer.",
      commonIssues:
        "Si rien n'apparaît: le planner n'a pas encore partagé de compositions.",
    },
    '/espace-client/paiements': {
      title: 'Paiements',
      when: 'Voir les paiements à venir et l’historique, obtenir les coordonnées bancaires et vérifier un paiement.',
      how:
        "Menu: Paiements. Sélectionne un paiement à venir puis clique 'Payer' pour voir les instructions (IBAN/BIC/référence). Après virement, tu peux cliquer 'Vérifier le paiement' si le bouton est présent.",
      commonIssues:
        "Si les coordonnées bancaires ne chargent pas: réessaie plus tard. Si un paiement reste en attente: vérifie la référence de virement.",
    },
    '/espace-client/galerie': {
      title: 'Galerie photos',
      when: 'Ajouter ou consulter des photos liées au mariage.',
      how:
        "Menu: Galerie photos. Utilise le bouton d'ajout/import si présent, sélectionne tes images puis valide. Les photos peuvent être visibles selon les droits/planner.",
      commonIssues:
        "Si l'upload échoue: fichier trop lourd ou connexion instable. Réessaie avec une image plus petite.",
    },
    '/espace-client/prestataires': {
      title: 'Mes prestataires',
      when: 'Voir la liste des prestataires sélectionnés (contact, statut).',
      how:
        "Menu: Mes prestataires. Tu peux consulter les infos (nom, catégorie, contact) selon ce que ton planner a renseigné.",
      commonIssues:
        "Si la liste est vide: le planner n'a pas encore ajouté de prestataires ou ils ne sont pas encore partagés.",
    },
    '/espace-client/checklist': {
      title: 'Check-list',
      when: 'Suivre les étapes sous forme de check-list.',
      how:
        "Menu: Check-list. Coche/décoche les éléments si disponible. Les items peuvent provenir des étapes (tasks kind=milestone).",
      commonIssues:
        "Si une case ne se sauvegarde pas: rafraîchis et réessaie.",
    },
    '/espace-client/parametres': {
      title: 'Paramètres',
      when: 'Gérer les infos du compte et des préférences (notifications).',
      how:
        "Menu: Paramètres. Tu peux consulter tes infos (noms, email, téléphone) et modifier les préférences de notifications. Certaines actions (photo, mot de passe, suppression de compte) peuvent être affichées mais pas forcément actives selon la version.",
      commonIssues:
        "Si une modification ne se sauvegarde pas: cette page peut être partiellement en mode démo (UI sans écriture). Si tu ne vois pas certains réglages: ils peuvent être réservés à l'admin/planner.",
    },
  },
  admin: {
    '/': {
      title: 'Tableau de bord (Admin)',
      when: 'Voir l’activité globale, accès rapide devis/factures/clients.',
      how:
        "Menu admin: Tableau de bord. Utilise les sections pour accéder aux clients, devis, factures et statistiques.",
      commonIssues:
        "Si des chiffres semblent incomplets: vérifie les filtres planner_id et que les données sont bien rattachées au planner.",
    },
    '/agence': {
      title: 'Agence > Informations',
      when: "Configurer les informations de l'agence (nom, siret, description, contacts, adresse) et le logo.",
      how:
        "Menu: Agence > Informations. Modifie les champs puis clique 'Enregistrer les modifications'. Pour le logo: clique 'Télécharger un logo'.",
      commonIssues:
        "Si l'upload logo échoue: vérifie les variables Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) et la taille (<5MB).",
    },
    '/agence/clients': {
      title: 'Agence > Fiches Clients',
      when: 'Lister les clients, ouvrir une fiche, accéder aux modules (messages, documents, prestataires, dépenses, planning, étapes, galerie).',
      how:
        "Menu: Agence > Fiches Clients. Clique sur un client pour ouvrir le détail, puis utilise les boutons (Messages / Documents / Prestataires / Dépenses / Planning / Étapes / Galerie).",
      commonIssues:
        "Si la liste est vide: vérifie que tu es connecté en planner et que les clients ont bien planner_id = ton uid.",
    },
    '/agence/todo': {
      title: 'Agence > Todo',
      when: 'Gérer les tâches internes de l’agence.',
      how: "Menu: Agence > Todo. Ajoute/édite les items si l'écran le propose.",
      commonIssues: "Si rien ne s'enregistre: vérifie les règles Firestore (permissions) ou si la page est en démo.",
    },
    '/agence/postit': {
      title: 'Agence > Mes post-it',
      when: 'Garder des notes rapides.',
      how: "Menu: Agence > Mes post-it. Ajoute des notes si l'UI le permet.",
      commonIssues: "Si les post-it disparaissent: vérifie l'enregistrement et les permissions Firestore.",
    },
    '/agence/campagnes': {
      title: 'Agence > Campagnes email',
      when: 'Créer/planifier des campagnes email (si activé).',
      how: "Menu: Agence > Campagnes email. Suis les étapes de création si disponibles.",
      commonIssues: "Si l'envoi échoue: vérifie la config email (provider/SMTP) et les droits.",
    },
    '/prospects': {
      title: 'Prospects',
      when: 'Créer et suivre des prospects (pipeline: nouveau/contacté/qualifié/converti/perdu).',
      how:
        "Menu: Prospects > Liste. Utilise 'Nouveau prospect' pour créer. Clique sur un prospect pour voir le détail et changer le statut. Tu peux archiver un prospect depuis le détail.",
      commonIssues:
        "Si tu ne vois pas de prospects: vérifie la collection 'prospects'. Si l'accès est trop large: la page filtre surtout sur archived=false (pas sur planner_id).",
    },
    '/prospects/archives': {
      title: 'Prospects > Archives',
      when: 'Restaurer ou supprimer définitivement un prospect archivé.',
      how:
        "Menu: Prospects > Archives. Utilise 'Restaurer' pour le remettre dans la liste, ou 'Supprimer' pour suppression définitive.",
      commonIssues:
        "Si la suppression échoue: permissions Firestore insuffisantes. Vérifie aussi la connexion.",
    },
    '/statistiques': {
      title: 'Statistiques',
      when: 'Voir le chiffre d’affaires (invoices.paid), clients, événements, top prestataires et exporter.',
      how:
        "Menu: Statistiques. Les graphes se basent sur invoices (paid), clients, events, vendors. Utilise le bouton d'export PDF si présent.",
      commonIssues:
        "Si les stats sont à 0: vérifie que les docs ont planner_id/owner_id cohérents avec ton uid. Si l'export PDF échoue: bloqueur de popups ou données trop volumineuses.",
    },
    '/prestataires': {
      title: 'Mes prestataires (Admin)',
      when: 'Gérer les prestataires (catalogue) et les lier à des clients (selon implémentation).',
      how:
        "Menu: Mes prestataires. Ajoute/édite les prestataires si l'écran le propose, puis affecte-les aux clients depuis les fiches clients.",
      commonIssues:
        "Si aucun prestataire: vérifier collection vendors (ou vendors_assigned) et les permissions.",
    },
    '/planning': {
      title: 'Planning (Admin)',
      when: 'Voir le planning global côté admin.',
      how: "Menu: Planning. Utilise les filtres/sections pour retrouver les rendez-vous et échéances.",
      commonIssues: "Si vide: les rendez-vous sont souvent stockés dans tasks(kind=appointment).",
    },
    '/documents': {
      title: 'Documents (Admin)',
      when: 'Gérer/consulter les documents partagés (PDF, contrats, etc.).',
      how: "Menu: Documents. Téléverse/organise les documents si disponible.",
      commonIssues: "Si un document ne s'affiche pas: URL invalide ou permissions Storage/Firestore.",
    },
    '/profile': {
      title: 'Profil (Admin)',
      when: 'Gérer les infos de ton profil (photo, nom, etc.).',
      how: "Menu: Profil. Modifie les champs puis enregistre.",
      commonIssues: "Si la photo ne se met pas à jour: vérifier champs photo/photoUrl/avatar_url dans profiles.",
    },
    '/settings': {
      title: 'Paramètres (Admin)',
      when: "Mettre à jour les informations agence (photo, infos, etc.).",
      how:
        "Menu admin: Paramètres. Modifie les champs puis enregistre.",
      commonIssues:
        "Si une photo ne s'affiche pas: vérifier l'URL (photo/photoUrl/avatar_url) dans profiles.",
    },
    '/admin/clients': {
      title: 'Clients (Admin)',
      when: 'Lister les clients, ouvrir une fiche client, gérer les onglets.',
      how:
        "Menu admin: Clients. Clique sur un client pour ouvrir sa fiche et accéder aux onglets (documents, prestataires, planning, étapes, galerie, dépenses).",
      commonIssues:
        "Si un client n'apparaît pas: vérifie le champ planner_id sur la fiche client.",
    },
    '/admin/clients/[id]/planning': {
      title: 'Planning client (Admin)',
      when: 'Ajouter/modifier/supprimer des rendez-vous visibles côté client.',
      how:
        "Dans la fiche client > Planning: clique 'Ajouter un RDV', remplis titre/date/heure (+ lieu/notes), puis enregistre. Tu peux modifier via l'icône crayon.",
      commonIssues:
        "Si tu ne peux pas enregistrer: titre/date/heure sont obligatoires. Si le client ne reçoit rien: la notif est best-effort.",
    },
    '/admin/clients/[id]/etapes': {
      title: 'Étapes client (Admin)',
      when: 'Créer des étapes (milestones) et suivre validations admin/client.',
      how:
        "Dans la fiche client > Étapes: clique 'Ajouter', définis titre/description/échéance. Tu peux valider côté admin avec 'Valider côté admin'.",
      commonIssues:
        "Si une étape n'apparaît pas côté client: vérifie qu'elle est bien liée au client/event et au planner.",
    },
    '/admin/clients/[id]/depenses': {
      title: 'Dépenses client (Admin)',
      when: 'Ajouter des dépenses (expenses) et suivre total/payé/en attente.',
      how:
        "Dans la fiche client > Dépenses: clique 'Ajouter', renseigne titre/montant/date. Tu peux marquer 'Payée' ou 'En attente'.",
      commonIssues:
        "Si les totaux semblent faux: vérifie les champs amount/status dans la collection expenses.",
    },
    '/devis': {
      title: 'Devis (Admin)',
      when: 'Créer et envoyer des devis, suivre les statuts et signatures.',
      how:
        "Menu admin: Devis. Crée un devis, puis envoie-le. Les statuts évoluent (draft/sent/accepted/signed).",
      commonIssues:
        "Si la signature DocuSign échoue: vérifier les clés/env + domaine autorisé + webhooks.",
    },
    '/factures': {
      title: 'Factures (Admin)',
      when: 'Créer/suivre les factures (invoices) et paiements.',
      how:
        "Menu admin: Factures. Consulte la liste, ouvre une facture pour voir PDF et statut. Mets à jour paid/status selon encaissement.",
      commonIssues:
        "Si un paiement reste pending: vérifier paid/montant_ttc et la réconciliation si utilisée.",
    },
    '/messages': {
      title: 'Messages (Admin)',
      when: 'Répondre aux clients, suivre les conversations et pièces jointes.',
      how:
        "Menu admin: Messages. Ouvre une conversation, écris et envoie. Les conversations se trient par dernier message.",
      commonIssues:
        "Si la conversation ne se charge pas: vérifier les droits Firestore et la présence du client_id/planner_id.",
    },
  },
};

export function resolveRelevantArticles(params: {
  role: AssistantRole;
  pathname: string;
}) {
  const { role, pathname } = params;
  const kb = role === 'admin' ? assistantKnowledge.admin : assistantKnowledge.client;

  const exact = kb[pathname];
  if (exact) return [exact];

  const entries = Object.entries(kb);

  const dynamicMatches = entries
    .filter(([k]) => k.includes('[id]'))
    .filter(([k]) => {
      const pattern = `^${k.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&').replace(/\\\[id\\\]/g, '[^/]+')}$`;
      try {
        return new RegExp(pattern).test(pathname);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b[0].length - a[0].length)
    .map(([, v]) => v);
  if (dynamicMatches.length) return dynamicMatches.slice(0, 4);

  const byPrefix = entries
    .filter(([k]) => !k.includes('[id]'))
    .filter(([k]) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b[0].length - a[0].length)
    .map(([, v]) => v);

  return byPrefix.slice(0, 4);
}
