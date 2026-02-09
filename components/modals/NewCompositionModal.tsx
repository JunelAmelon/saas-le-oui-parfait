'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Flower2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface FlowerItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface NewCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompositionCreated?: () => void;
}

interface Client {
  id: string;
  name: string;
}

const flowersCatalog = [
  { name: 'Roses blanches', unit: 'tige', price: 2.5 },
  { name: 'Pivoines', unit: 'tige', price: 4 },
  { name: 'Lisianthus', unit: 'tige', price: 3 },
  { name: 'Gypsophile', unit: 'bouquet', price: 8 },
  { name: 'Eucalyptus', unit: 'botte', price: 12 },
  { name: 'Feuillage', unit: 'kg', price: 15 },
];

export function NewCompositionModal({ isOpen, onClose, onCompositionCreated }: NewCompositionModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [compositionName, setCompositionName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<FlowerItem[]>([
    { id: '1', name: '', quantity: 1, unitPrice: 0 }
  ]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [sendToClient, setSendToClient] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchClients();
    }
  }, [isOpen, user]);

  const fetchClients = async () => {
    if (!user) return;
    try {
      const data = await getDocuments('clients', [
        { field: 'planner_id', operator: '==', value: user.uid }
      ]);
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.partner ? `${d.name} & ${d.partner}` : d.name,
      }));
      setClients(mapped as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FlowerItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'name') {
          const flower = flowersCatalog.find(f => f.name === value);
          if (flower) {
            updatedItem.unitPrice = flower.price;
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotalCost = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateMargin = () => {
    const cost = calculateTotalCost();
    const price = parseFloat(sellingPrice) || 0;
    return price - cost;
  };

  const handleSubmit = async () => {
    if (!compositionName || !selectedClient || !sellingPrice) {
      sonnerToast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const hasEmptyItems = items.some(item => !item.name || item.quantity <= 0);
    if (hasEmptyItems) {
      sonnerToast.error('Veuillez compléter toutes les fleurs');
      return;
    }

    if (!user) {
      sonnerToast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      const selectedClientData = clients.find(c => c.id === selectedClient);
      const flowers = items.map(item => `${item.name} (${item.quantity})`);
      const cost = calculateTotalCost();
      const price = parseFloat(sellingPrice);
      const margin = price - cost;

      await addDocument('compositions', {
        name: compositionName,
        client_id: selectedClient,
        client_name: selectedClientData?.name || '',
        flowers,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice
        })),
        cost,
        price,
        margin,
        send_to_client: sendToClient,
        planner_id: user.uid,
        created_at: new Date(),
      });

      sonnerToast.success(
        sendToClient 
          ? `La composition "${compositionName}" a été créée et envoyée au client`
          : `La composition "${compositionName}" a été créée avec succès`
      );

      // Reset form
      setCompositionName('');
      setSelectedClient('');
      setItems([{ id: '1', name: '', quantity: 1, unitPrice: 0 }]);
      setSellingPrice('');
      setSendToClient(false);
      
      if (onCompositionCreated) {
        onCompositionCreated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating composition:', error);
      sonnerToast.error('Erreur lors de la création de la composition');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = calculateTotalCost();
  const margin = calculateMargin();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-pink-500" />
            Nouvelle composition florale
          </DialogTitle>
          <DialogDescription>
            Créez une composition et calculez automatiquement les coûts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nom de la composition *</Label>
              <Input
                placeholder="Ex: Bouquet de mariée classique"
                value={compositionName}
                onChange={(e) => setCompositionName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Client associé *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Fleurs et quantités *</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItem}
                className="gap-2"
              >
                <Plus className="h-3 w-3" />
                Ajouter une fleur
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      value={item.name}
                      onValueChange={(value) => updateItem(item.id, 'name', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une fleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {flowersCatalog.map((flower) => (
                          <SelectItem key={flower.name} value={flower.name}>
                            {flower.name} - {flower.price}€/{flower.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Prix"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      disabled
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-xs">Coût total</Label>
              <p className="text-2xl font-bold text-brand-purple">{totalCost.toFixed(2)} €</p>
            </div>
            <div>
              <Label className="text-xs">Prix de vente *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Marge</Label>
              <p className={`text-2xl font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margin.toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
            <Checkbox
              id="sendToClient"
              checked={sendToClient}
              onCheckedChange={(checked) => setSendToClient(checked as boolean)}
            />
            <label
              htmlFor="sendToClient"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Envoyer cette composition au client (il pourra la voir dans son espace)
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer la composition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
