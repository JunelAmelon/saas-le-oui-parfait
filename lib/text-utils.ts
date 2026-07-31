/**
 * Utilitaires pour le traitement du texte dans les messages
 */

import React from 'react';

/**
 * Détecte les URLs dans un texte et les convertit en liens cliquables
 * Retourne un tableau de React nodes (texte + liens)
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex pour détecter les URLs (http, https, www, domaines)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  urlRegex.lastIndex = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;

    // Ajouter le texte avant l'URL
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    // Construire l'URL complète
    let href = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      href = 'https://' + url;
    }

    // Ajouter le lien cliquable
    parts.push(
      React.createElement(
        'a',
        {
          key: `link-${startIndex}`,
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'underline hover:opacity-80 transition-opacity',
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
        },
        url
      )
    );

    lastIndex = startIndex + url.length;
  }

  // Ajouter le texte restant
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
