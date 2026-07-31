/**
 * Utilitaires pour l'affichage intelligent des dates dans la messagerie
 */

/**
 * Formate un timestamp de manière intelligente :
 * - "14:32" si aujourd'hui
 * - "Hier 14:32" si hier
 * - "Lun 27 jan" si cette semaine
 * - "27/01/2026" si plus ancien
 */
export function formatSmartTimestamp(date: Date | null | undefined): string {
  if (!date) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDate = new Date(date);
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  const timeStr = messageDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  // Aujourd'hui : juste l'heure
  if (messageDateOnly.getTime() === today.getTime()) {
    return timeStr;
  }
  
  // Hier
  if (messageDateOnly.getTime() === yesterday.getTime()) {
    return `Hier ${timeStr}`;
  }
  
  // Cette semaine (7 derniers jours)
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  if (messageDateOnly >= weekAgo) {
    const dayName = messageDate.toLocaleDateString('fr-FR', { weekday: 'short' });
    const day = messageDate.getDate();
    const month = messageDate.toLocaleDateString('fr-FR', { month: 'short' });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} ${month}`;
  }
  
  // Plus ancien : date complète
  return messageDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formate une date complète pour les tooltips
 */
export function formatFullTimestamp(date: Date | null | undefined): string {
  if (!date) return '';
  
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Groupe les messages par date pour afficher des séparateurs
 */
export interface MessageWithDate {
  id: string;
  created_at?: Date | null;
  [key: string]: any;
}

export interface GroupedMessages<T extends MessageWithDate> {
  date: Date;
  label: string;
  messages: T[];
}

export function groupMessagesByDate<T extends MessageWithDate>(messages: T[]): GroupedMessages<T>[] {
  if (!messages.length) return [];

  const groups = new Map<string, T[]>();
  
  messages.forEach((msg) => {
    if (!msg.created_at) return;
    
    const date = new Date(msg.created_at);
    const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(msg);
  });
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return Array.from(groups.entries())
    .map(([dateKey, msgs]) => {
      const date = new Date(dateKey);
      let label = '';
      
      if (date.getTime() === today.getTime()) {
        label = "Aujourd'hui";
      } else if (date.getTime() === yesterday.getTime()) {
        label = 'Hier';
      } else {
        label = date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }
      
      return {
        date,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        messages: msgs,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
