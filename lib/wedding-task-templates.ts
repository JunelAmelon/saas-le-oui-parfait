export interface WeddingTaskTemplate {
  key: string;
  title: string;
  description: string;
  category: 'bride' | 'groom' | 'both';
  offsetDays: number;
  priority: 'normal' | 'urgent';
  reminderOffsets: number[];
  emailTemplateKey: string;
}

export const WEDDING_TASK_TEMPLATES: WeddingTaskTemplate[] = [
  {
    key: 'robe_recherche',
    title: 'Recherche robe',
    description:
      'Définir le style, le budget et prendre les premiers rendez-vous dans les boutiques.',
    category: 'bride',
    offsetDays: -365,
    priority: 'normal',
    reminderOffsets: [-7, 0, 3, 7, 14],
    emailTemplateKey: 'robe_recherche',
  },
  {
    key: 'robe_essayages',
    title: 'Essayages robe en cours',
    description:
      'Vérifier que les rendez-vous sont pris et que le choix de la robe avance.',
    category: 'bride',
    offsetDays: -304,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7],
    emailTemplateKey: 'robe_essayages',
  },
  {
    key: 'robe_commande',
    title: 'Commande robe',
    description:
      'Commander la robe idéalement maintenant pour conserver le temps de fabrication et de retouches.',
    category: 'bride',
    offsetDays: -274,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7, 31],
    emailTemplateKey: 'robe_commande',
  },
  {
    key: 'costume_recherche',
    title: 'Recherche costume',
    description:
      'Définir le style, la couleur, les chaussures et choisir entre sur-mesure et prêt-à-porter.',
    category: 'groom',
    offsetDays: -183,
    priority: 'normal',
    reminderOffsets: [-7, 0, 3, 7],
    emailTemplateKey: 'costume_recherche',
  },
  {
    key: 'costume_commande',
    title: 'Accessoires + commande costume',
    description:
      'Commander le costume de cérémonie et commencer à préparer les accessoires.',
    category: 'groom',
    offsetDays: -122,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7, 14],
    emailTemplateKey: 'costume_commande',
  },
  {
    key: 'accessoires_mariee',
    title: 'Accessoires de la mariée',
    description:
      'Chaussures, voile, bijoux et lingerie : commencer les recherches et les achats.',
    category: 'bride',
    offsetDays: -122,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7],
    emailTemplateKey: 'accessoires_mariee',
  },
  {
    key: 'robe_retouches',
    title: 'Retouches / essayages robe',
    description:
      'Planifier les retouches et effectuer les essayages pour un ajustement parfait.',
    category: 'bride',
    offsetDays: -91,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7],
    emailTemplateKey: 'robe_retouches',
  },
  {
    key: 'essayage_accessoires',
    title: 'Essayage avec accessoires',
    description:
      'Essayer la robe avec les chaussures, la lingerie, le voile et les bijoux pour vérifier l’ensemble.',
    category: 'bride',
    offsetDays: -61,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7],
    emailTemplateKey: 'essayage_accessoires',
  },
  {
    key: 'essayage_complet',
    title: 'Essayage complet des deux',
    description:
      'Essayage final de la robe et du costume : dernières retouches, vérification des accessoires.',
    category: 'both',
    offsetDays: -30,
    priority: 'normal',
    reminderOffsets: [-7, -3, 0, 3, 7],
    emailTemplateKey: 'essayage_complet',
  },
  {
    key: 'recuperation_tenues',
    title: 'Récupération robe/costume',
    description:
      'Essayage final et récupération de la robe et du costume : vérifier que tout est complet.',
    category: 'both',
    offsetDays: -14,
    priority: 'normal',
    reminderOffsets: [-3, 0, 3, 7],
    emailTemplateKey: 'recuperation_tenues',
  },
  {
    key: 'controle_final',
    title: 'Contrôle final complet',
    description:
      'Vérifier une dernière fois la robe, le costume, les chaussures, les alliances, les bijoux, le voile et les accessoires.',
    category: 'both',
    offsetDays: -4,
    priority: 'normal',
    reminderOffsets: [-2, 0, 2],
    emailTemplateKey: 'controle_final',
  },
];
