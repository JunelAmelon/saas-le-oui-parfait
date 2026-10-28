/**
 * Exports PDF réels (jsPDF, sans rendu DOM) :
 * - fiche traiteur : tables, convives, sièges spéciaux, régimes en rouge
 * - escort cards : cartes découpables Nom → Table
 * Fonctions pures côté client : reçoivent les données, émettent un .pdf.
 */

import jsPDF from 'jspdf';
import type { PlanTable, PlanGuest } from './types';

const PURPLE: [number, number, number] = [75, 68, 86];
const TURQ: [number, number, number] = [136, 183, 181];
const RED: [number, number, number] = [180, 60, 60];
const GRAY: [number, number, number] = [120, 115, 130];

const KIND_LABEL: Record<string, string> = { bebe: 'chaise bébé', pmr: 'PMR', vip: 'VIP' };

export function exportTraiteurPdf(tables: PlanTable[], guests: PlanGuest[], coupleName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PURPLE);
  doc.text('Plan de table : fiche traiteur', 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const seated = tables.reduce((n, t) => n + t.seats.filter((s) => s.guest_id).length, 0);
  doc.text(`${coupleName} · ${seated} invités placés · ${tables.length} tables`, 14, y);
  y += 10;

  const byId = new Map(guests.map((g) => [g.id, g]));

  for (const t of tables) {
    const seatedSeats = t.seats.filter((s) => s.guest_id);
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    // bandeau table
    doc.setFillColor(...TURQ);
    doc.roundedRect(14, y - 4, W - 28, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${t.name}  ·  ${seatedSeats.length}/${t.seatCount} places`, 18, y + 1.5);
    y += 10;
    doc.setTextColor(...PURPLE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const s of seatedSeats) {
      const g = byId.get(s.guest_id!);
      if (!g) continue;
      let line = `  ${s.index + 1}. ${g.name}`;
      if (s.kind !== 'standard') line += `  (${KIND_LABEL[s.kind] || s.kind})`;
      doc.text(line, 18, y);
      y += 5.2;
      if (g.diet) {
        doc.setTextColor(...RED);
        doc.text(`      régime : ${g.diet}`, 18, y);
        doc.setTextColor(...PURPLE);
        y += 5.2;
      }
      if (y > 278) {
        doc.addPage();
        y = 18;
      }
    }
    const diets = seatedSeats.map((s) => byId.get(s.guest_id!)).filter((g): g is PlanGuest => !!g?.diet);
    if (diets.length) {
      y += 1;
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...RED);
      doc.setFontSize(9);
      doc.text(`Régimes : ${diets.map((g) => `${g.name} (${g.diet})`).join(' · ')}`, 18, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...PURPLE);
      y += 6;
    }
    y += 4;
  }

  doc.save(`fiche-traiteur-${coupleName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportEscortCardsPdf(tables: PlanTable[], guests: PlanGuest[], coupleName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const byId = new Map(guests.map((g) => [g.id, g]));
  // grille 3 × 8 cartes de ~62×32 mm
  const cw = 62;
  const ch = 32;
  const mx = 14;
  const my = 16;
  let i = 0;
  for (const t of tables) {
    for (const s of t.seats) {
      const g = s.guest_id ? byId.get(s.guest_id) : null;
      if (!g) continue;
      const col = i % 3;
      const row = Math.floor(i / 3) % 8;
      if (i > 0 && Math.floor(i / 3) % 8 === 0) doc.addPage();
      const x = mx + col * cw;
      const y = my + row * ch;
      doc.setDrawColor(...GRAY);
      doc.setLineWidth(0.2);
      doc.roundedRect(x + 1, y + 1, cw - 4, ch - 4, 2, 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...PURPLE);
      doc.text(g.name, x + cw / 2 - 1, y + 13, { align: 'center', maxWidth: cw - 10 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...TURQ);
      doc.text(t.name, x + cw / 2 - 1, y + 20, { align: 'center', maxWidth: cw - 10 });
      i++;
    }
  }
  doc.save(`escort-cards-${coupleName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
