'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export function NewInvoiceModal({ isOpen, onClose }: NewInvoiceModalProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'deposit'>('invoice');

  // Fetch clients from Firebase
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
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.partner ? `${c.name} & ${c.partner}` : c.name,
        email: c.email || '',
      }));
      setClients(mapped);
    } catch (e) {
      console.error('Error fetching clients:', e);
      sonnerToast.error('Erreur lors du chargement des clients');
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTTC = totalHT * 1.2;
    return { totalHT, totalTTC };
  };

  const handleSubmit = async () => {
    if (!user || !selectedClient) {
      sonnerToast.error('Veuillez sélectionner un client');
      return;
    }

    if (!dueDate) {
      sonnerToast.error('Veuillez indiquer une date d\'échéance');
      return;
    }

    setLoading(true);
    try {
      const { totalHT, totalTTC } = calculateTotal();
      const client = clients.find(c => c.id === selectedClient);
      
      const invoiceData = {
        planner_id: user.uid,
        reference: `${invoiceType === 'deposit' ? 'ACOMPTE' : 'FACT'}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        client: client?.name || '',
        client_email: client?.email || '',
        date: new Date().toLocaleDateString('fr-FR'),
        due_date: dueDate,
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        paid: 0,
        status: 'pending',
        type: invoiceType,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
        notes: notes,
        created_at: new Date(),
      };

      await addDocument('invoices', invoiceData);
      
      sonnerToast.success(`Facture de ${totalTTC.toLocaleString()}€ TTC créée pour ${client?.name}`);
      
      // Reset form
      setSelectedClient('');
      setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
      setDueDate('');
      setNotes('');
      setInvoiceType('invoice');
      
      onClose();
    } catch (e) {
      console.error('Error creating invoice:', e);
      sonnerToast.error('Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  const { totalHT, totalTTC } = calculateTotal();
  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-brand-purple">Créer une nouvelle facture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="client">Client *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientData && (
                <p className="text-xs text-brand-gray mt-1">Email: {selectedClientData.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={invoiceType} onValueChange={(v: any) => setInvoiceType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="deposit">Acompte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dueDate">Date d'échéance *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Prestations</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-12 md:col-span-5">
                    <Input
                      placeholder="Description de la prestation"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Qté"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Input
                      type="number"
                      placeholder="Prix unitaire HT"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-center justify-center">
                    <p className="text-sm font-medium text-brand-purple">
                      {(item.quantity * item.unitPrice).toFixed(2)}€
                    </p>
                  </div>
                  <div className="col-span-12 md:col-span-1 flex items-center justify-center">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-beige/20 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray">Total HT</span>
              <span className="font-medium text-brand-purple">{totalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray">TVA (20%)</span>
              <span className="font-medium text-brand-purple">{(totalTTC - totalHT).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span className="text-brand-purple">Total TTC</span>
              <span className="text-brand-turquoise">{totalTTC.toFixed(2)} €</span>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes / Conditions de paiement</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paiement à 30 jours, modalités, etc."
              rows={3}
            />
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
            {loading ? 'Création...' : 'Créer la facture'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
