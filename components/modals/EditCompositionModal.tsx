'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Flower2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

interface FlowerItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface CatalogItem {
  name: string;
  unit: string;
  price: number;
}

export interface CompositionDoc {
  id: string;
  name: string;
  client_id: string;
  client_name?: string;
  planner_id: string;
  send_to_client?: boolean;
  items?: Array<{ name: string; quantity: number; unit_price: number }>;
  flowers?: string[];
  cost?: number;
  price?: number;
  margin?: number;
}

interface Client {
  id: string;
  name: string;
}

interface EditCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  composition: CompositionDoc | null;
}

const fallbackCatalog: CatalogItem[] = [
  { name: 'Roses blanches', unit: 'tige', price: 2.5 },
  { name: 'Pivoines', unit: 'tige', price: 4 },
  { name: 'Lisianthus', unit: 'tige', price: 3 },
  { name: 'Gypsophile', unit: 'bouquet', price: 8 },
  { name: 'Eucalyptus', unit: 'botte', price: 12 },
  { name: 'Feuillage', unit: 'kg', price: 15 },
];

function toItemRows(comp: CompositionDoc | null): FlowerItem[] {
  const rows = (comp?.items || []).map((it, idx) => ({
    id: `${idx + 1}`,
    name: it.name || '',
    quantity: Number(it.quantity ?? 1) || 1,
    unitPrice: Number(it.unit_price ?? 0) || 0,
  }));

  if (rows.length > 0) return rows;

  const flowers = (comp?.flowers || []).map((s, idx) => {
    const m = String(s || '').match(/\((\d+)\)/);
    const qty = m ? Number(m[1]) : 1;
    const name = String(s || '').replace(/\s*\(\d+\)\s*$/, '').trim();
    return { id: `${idx + 1}`, name, quantity: qty || 1, unitPrice: 0 };
  });

  return flowers.length > 0 ? flowers : [{ id: '1', name: '', quantity: 1, unitPrice: 0 }];
}

export function EditCompositionModal({ isOpen, onClose, onUpdated, composition }: EditCompositionModalProps) {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>(fallbackCatalog);

  const [compositionName, setCompositionName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState<FlowerItem[]>([{ id: '1', name: '', quantity: 1, unitPrice: 0 }]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [sendToClient, setSendToClient] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    if (!user?.uid) return;
    try {
      const data = await getDocuments('clients', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      const mapped = (data as any[]).map((d: any) => ({
        id: d.id,
        name: d.partner ? `${d.name} & ${d.partner}` : d.name,
      }));
      setClients(mapped as Client[]);
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  const fetchCatalog = async () => {
    if (!user?.uid) return;
    try {
      const data = await getDocuments('flowers_catalog', [{ field: 'planner_id', operator: '==', value: user.uid }]);
      const mapped = (data as any[])
        .map((d: any) => ({
          name: d?.name || '',
          unit: d?.unit || '',
          price: Number(d?.price ?? 0) || 0,
        }))
        .filter((x) => Boolean(x.name));

      if (mapped.length > 0) setCatalog(mapped as CatalogItem[]);
      else setCatalog(fallbackCatalog);
    } catch (e) {
      console.error('Error fetching flower catalog:', e);
      setCatalog(fallbackCatalog);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void fetchClients();
    void fetchCatalog();
    if (composition) {
      setCompositionName(composition.name || '');
      setSelectedClient(composition.client_id || '');
      setItems(toItemRows(composition));
      setSellingPrice(String(composition.price ?? ''));
      setSendToClient(Boolean(composition.send_to_client));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, composition?.id, user?.uid]);

  const addItem = () => {
    setItems((prev) => [...prev, { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== id) : prev));
  };

  const updateItem = (id: string, field: keyof FlowerItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value } as FlowerItem;
        if (field === 'name') {
          const flower = catalog.find((f) => f.name === value);
          if (flower) updated.unitPrice = flower.price;
        }
        return updated;
      })
    );
  };

  const calculateTotalCost = () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalCost = calculateTotalCost();

  const margin = useMemo(() => {
    const price = Number(sellingPrice) || 0;
    return price - totalCost;
  }, [sellingPrice, totalCost]);

  const handleSubmit = async () => {
    if (!composition?.id) return;
    if (!user?.uid) {
      toast.error('Vous devez être connecté');
      return;
    }
    if (!compositionName.trim() || !selectedClient || !sellingPrice) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const hasEmptyItems = items.some((item) => !item.name || item.quantity <= 0);
    if (hasEmptyItems) {
      toast.error('Veuillez compléter toutes les fleurs');
      return;
    }

    setLoading(true);
    try {
      const selectedClientData = clients.find((c) => c.id === selectedClient);
      const flowers = items.map((item) => `${item.name} (${item.quantity})`);
      const price = Number(sellingPrice) || 0;

      await updateDocument('compositions', composition.id, {
        name: compositionName.trim(),
        client_id: selectedClient,
        client_name: selectedClientData?.name || composition.client_name || '',
        flowers,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        cost: totalCost,
        price,
        margin: price - totalCost,
        send_to_client: sendToClient,
        planner_id: user.uid,
        updated_at: new Date(),
      });

      toast.success('Composition modifiée avec succès');
      onUpdated?.();
      onClose();
    } catch (e) {
      console.error('Error updating composition:', e);
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple flex items-center gap-2">
            <Flower2 className="h-5 w-5 text-pink-500" />
            Modifier la composition
          </DialogTitle>
          <DialogDescription>Modifiez la composition et mettez à jour automatiquement les coûts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nom de la composition *</Label>
              <Input value={compositionName} onChange={(e) => setCompositionName(e.target.value)} className="mt-1" />
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
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-2">
                <Plus className="h-3 w-3" />
                Ajouter une fleur
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={item.name} onValueChange={(value) => updateItem(item.id, 'name', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une fleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.map((flower) => (
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
                    <Input type="number" step="0.01" placeholder="Prix" value={item.unitPrice} disabled />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
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
              <Input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Marge</Label>
              <p className={`text-2xl font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin.toFixed(2)} €</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
            <Checkbox id="sendToClientEdit" checked={sendToClient} onCheckedChange={(checked) => setSendToClient(checked as boolean)} />
            <label htmlFor="sendToClientEdit" className="text-sm font-medium leading-none">
              Envoyer cette composition au client (il pourra la voir dans son espace)
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover" onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
