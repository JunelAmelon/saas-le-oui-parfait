'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface ColorOption {
  hex: string;
  name: string;
  meaning: string;
  category: string;
}

const weddingColors: ColorOption[] = [
  // Blancs et Ivoires
  { hex: '#FFFFFF', name: 'Blanc pur', meaning: 'Pureté, innocence, élégance', category: 'Blancs' },
  { hex: '#FFFEF0', name: 'Ivoire', meaning: 'Douceur, raffinement, tradition', category: 'Blancs' },
  { hex: '#FFF5EE', name: 'Coquille d\'œuf', meaning: 'Naturel, chaleur, simplicité', category: 'Blancs' },
  { hex: '#FAF0E6', name: 'Lin', meaning: 'Naturel, champêtre, authentique', category: 'Blancs' },
  { hex: '#FDF5E6', name: 'Crème', meaning: 'Élégance, douceur, classique', category: 'Blancs' },
  
  // Roses
  { hex: '#FFB6C1', name: 'Rose clair', meaning: 'Romance, tendresse, féminité', category: 'Roses' },
  { hex: '#FFC0CB', name: 'Rose poudré', meaning: 'Douceur, délicatesse, charme', category: 'Roses' },
  { hex: '#FFE4E1', name: 'Rose pâle', meaning: 'Innocence, jeunesse, fraîcheur', category: 'Roses' },
  { hex: '#DB7093', name: 'Rose vintage', meaning: 'Nostalgie, romantisme, élégance', category: 'Roses' },
  { hex: '#FF69B4', name: 'Rose vif', meaning: 'Passion, énergie, modernité', category: 'Roses' },
  { hex: '#C71585', name: 'Rose fuchsia', meaning: 'Audace, originalité, dynamisme', category: 'Roses' },
  { hex: '#FFF0F5', name: 'Rose lavande', meaning: 'Romantisme, rêve, poésie', category: 'Roses' },
  
  // Rouges
  { hex: '#DC143C', name: 'Rouge passion', meaning: 'Amour, passion, intensité', category: 'Rouges' },
  { hex: '#8B0000', name: 'Rouge bordeaux', meaning: 'Élégance, sophistication, luxe', category: 'Rouges' },
  { hex: '#B22222', name: 'Rouge brique', meaning: 'Chaleur, tradition, authenticité', category: 'Rouges' },
  { hex: '#CD5C5C', name: 'Rouge indien', meaning: 'Terre, nature, stabilité', category: 'Rouges' },
  
  // Oranges et Corails
  { hex: '#FF7F50', name: 'Corail', meaning: 'Vitalité, optimisme, chaleur', category: 'Oranges' },
  { hex: '#FF6347', name: 'Tomate', meaning: 'Énergie, vivacité, été', category: 'Oranges' },
  { hex: '#FFA07A', name: 'Saumon clair', meaning: 'Douceur, chaleur, convivialité', category: 'Oranges' },
  { hex: '#FFE4B5', name: 'Pêche', meaning: 'Tendresse, douceur, romantisme', category: 'Oranges' },
  
  // Jaunes et Dorés
  { hex: '#FFD700', name: 'Or', meaning: 'Luxe, richesse, célébration', category: 'Dorés' },
  { hex: '#C4A26A', name: 'Or champagne', meaning: 'Élégance, raffinement, fête', category: 'Dorés' },
  { hex: '#DAA520', name: 'Or antique', meaning: 'Tradition, noblesse, prestige', category: 'Dorés' },
  { hex: '#FFFFE0', name: 'Jaune pâle', meaning: 'Joie, lumière, optimisme', category: 'Jaunes' },
  { hex: '#FFFACD', name: 'Citron', meaning: 'Fraîcheur, vitalité, été', category: 'Jaunes' },
  { hex: '#F0E68C', name: 'Kaki', meaning: 'Nature, douceur, automne', category: 'Jaunes' },
  
  // Verts
  { hex: '#98FB98', name: 'Vert menthe', meaning: 'Fraîcheur, nature, renouveau', category: 'Verts' },
  { hex: '#90EE90', name: 'Vert clair', meaning: 'Espoir, croissance, harmonie', category: 'Verts' },
  { hex: '#8FBC8F', name: 'Vert sauge', meaning: 'Sérénité, nature, équilibre', category: 'Verts' },
  { hex: '#556B2F', name: 'Vert olive', meaning: 'Paix, nature, authenticité', category: 'Verts' },
  { hex: '#2E8B57', name: 'Vert forêt', meaning: 'Nature, stabilité, croissance', category: 'Verts' },
  { hex: '#7BA89D', name: 'Vert eucalyptus', meaning: 'Fraîcheur, naturel, moderne', category: 'Verts' },
  
  // Bleus
  { hex: '#ADD8E6', name: 'Bleu ciel', meaning: 'Sérénité, paix, liberté', category: 'Bleus' },
  { hex: '#87CEEB', name: 'Bleu azur', meaning: 'Rêve, évasion, infini', category: 'Bleus' },
  { hex: '#B0E0E6', name: 'Bleu poudre', meaning: 'Douceur, calme, élégance', category: 'Bleus' },
  { hex: '#4682B4', name: 'Bleu acier', meaning: 'Modernité, force, élégance', category: 'Bleus' },
  { hex: '#191970', name: 'Bleu nuit', meaning: 'Mystère, élégance, profondeur', category: 'Bleus' },
  { hex: '#000080', name: 'Bleu marine', meaning: 'Classique, élégance, stabilité', category: 'Bleus' },
  { hex: '#6495ED', name: 'Bleu bleuet', meaning: 'Fraîcheur, naturel, romantisme', category: 'Bleus' },
  
  // Violets et Lavandes
  { hex: '#E6E6FA', name: 'Lavande', meaning: 'Romantisme, douceur, rêve', category: 'Violets' },
  { hex: '#DDA0DD', name: 'Prune', meaning: 'Élégance, mystère, raffinement', category: 'Violets' },
  { hex: '#9370DB', name: 'Violet moyen', meaning: 'Créativité, spiritualité, luxe', category: 'Violets' },
  { hex: '#8B008B', name: 'Magenta foncé', meaning: 'Passion, originalité, audace', category: 'Violets' },
  { hex: '#BA55D3', name: 'Orchidée', meaning: 'Beauté, luxe, exotisme', category: 'Violets' },
  
  // Beiges et Neutres
  { hex: '#F5F5DC', name: 'Beige', meaning: 'Naturel, simplicité, élégance', category: 'Neutres' },
  { hex: '#E8D5B7', name: 'Beige champêtre', meaning: 'Nature, douceur, authenticité', category: 'Neutres' },
  { hex: '#D2B48C', name: 'Tan', meaning: 'Terre, chaleur, naturel', category: 'Neutres' },
  { hex: '#DEB887', name: 'Bois clair', meaning: 'Nature, chaleur, rustique', category: 'Neutres' },
  { hex: '#F5DEB3', name: 'Blé', meaning: 'Nature, abondance, chaleur', category: 'Neutres' },
  
  // Gris
  { hex: '#D3D3D3', name: 'Gris clair', meaning: 'Élégance, modernité, sobriété', category: 'Gris' },
  { hex: '#C0C0C0', name: 'Argent', meaning: 'Luxe, modernité, élégance', category: 'Gris' },
  { hex: '#808080', name: 'Gris moyen', meaning: 'Équilibre, neutralité, élégance', category: 'Gris' },
  { hex: '#696969', name: 'Gris anthracite', meaning: 'Modernité, sophistication, force', category: 'Gris' },
  
  // Marrons et Terres
  { hex: '#8B4513', name: 'Marron terre', meaning: 'Nature, stabilité, authenticité', category: 'Marrons' },
  { hex: '#A0522D', name: 'Sienna', meaning: 'Terre, chaleur, rusticité', category: 'Marrons' },
  { hex: '#D2691E', name: 'Chocolat', meaning: 'Gourmandise, chaleur, confort', category: 'Marrons' },
  { hex: '#CD853F', name: 'Caramel', meaning: 'Douceur, chaleur, gourmandise', category: 'Marrons' },
  
  // Noirs
  { hex: '#000000', name: 'Noir', meaning: 'Élégance, sophistication, mystère', category: 'Noirs' },
  { hex: '#2F4F4F', name: 'Noir ardoise', meaning: 'Modernité, élégance, profondeur', category: 'Noirs' },
];

interface ColorPaletteProps {
  selectedColors: string[];
  onColorsChange: (colors: string[]) => void;
  maxColors?: number;
}

export function ColorPalette({ selectedColors, onColorsChange, maxColors = 4 }: ColorPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(weddingColors.map(c => c.category)))];

  const filteredColors = selectedCategory === 'all' 
    ? weddingColors 
    : weddingColors.filter(c => c.category === selectedCategory);

  const toggleColor = (hex: string) => {
    if (selectedColors.includes(hex)) {
      onColorsChange(selectedColors.filter(c => c !== hex));
    } else if (selectedColors.length < maxColors) {
      onColorsChange([...selectedColors, hex]);
    }
  };

  const getColorInfo = (hex: string) => {
    return weddingColors.find(c => c.hex === hex);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {selectedColors.map((color) => {
            const info = getColorInfo(color);
            return (
              <div key={color} className="relative group">
                <div
                  className="w-12 h-12 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => setIsOpen(true)}
                />
                {info && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {info.name}
                  </div>
                )}
              </div>
            );
          })}
          {selectedColors.length < maxColors && (
            <Button
              type="button"
              variant="outline"
              className="w-12 h-12 rounded-full border-2 border-dashed"
              onClick={() => setIsOpen(true)}
            >
              +
            </Button>
          )}
        </div>
        <p className="text-xs text-brand-gray">
          {selectedColors.length} / {maxColors} couleurs sélectionnées
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-brand-purple">
              Choisir vos couleurs de mariage
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className={`cursor-pointer ${selectedCategory === cat ? 'bg-brand-turquoise' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'Toutes' : cat}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredColors.map((color) => {
                const isSelected = selectedColors.includes(color.hex);
                return (
                  <div
                    key={color.hex}
                    className="relative group cursor-pointer"
                    onClick={() => toggleColor(color.hex)}
                  >
                    <div
                      className={`w-full aspect-square rounded-lg border-2 ${
                        isSelected ? 'border-brand-turquoise ring-2 ring-brand-turquoise' : 'border-gray-200'
                      } hover:scale-110 transition-transform`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 max-w-xs">
                      <p className="font-medium">{color.name}</p>
                      <p className="text-gray-300 text-[10px]">{color.meaning}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button 
              type="button"
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={() => setIsOpen(false)}
            >
              Valider
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
