'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, addDocument } from '@/lib/db';
import { toast as sonnerToast } from 'sonner';
import axios from 'axios';

interface DevisItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface NewDevisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevisCreated?: () => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export function NewDevisModal({ isOpen, onClose, onDevisCreated }: NewDevisModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [items, setItems] = useState<DevisItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch clients
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
        email: d.email || '',
      }));
      setClients(mapped);
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  const uploadPdfToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
      formData
    );

    return res.data.secure_url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      toast({
        title: 'Fichier ajouté',
        description: `${e.target.files[0].name} a été sélectionné`,
      });
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof DevisItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTTC = totalHT * 1.2; // TVA 20%
    return { totalHT, totalTTC };
  };

  const handleSubmit = async () => {
    if (!user || !selectedClient) {
      sonnerToast.error('Veuillez sélectionner un client');
      return;
    }

    setLoading(true);
    try {
      const { totalHT, totalTTC } = calculateTotal();
      const client = clients.find(c => c.id === selectedClient);
      
      let pdfUrl = '';
      if (pdfFile) {
        pdfUrl = await uploadPdfToCloudinary(pdfFile);
      }

      const devisData = {
        planner_id: user.uid,
        reference: `DEVIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        client: client?.name || '',
        client_email: client?.email || '',
        date: new Date().toLocaleDateString('fr-FR'),
        montant_ht: totalHT,
        montant_ttc: totalTTC,
        tva: 20,
        status: 'draft',
        valid_until: validUntil,
        description: notes,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
        pdf_url: pdfUrl,
        created_at: new Date(),
      };

      await addDocument('devis', devisData);
      
      sonnerToast.success(`Devis de ${totalTTC.toLocaleString()}€ TTC créé pour ${client?.name}`);
      
      if (onDevisCreated) {
        onDevisCreated();
      }
      
      onClose();
    } catch (e) {
      console.error('Error creating devis:', e);
      sonnerToast.error('Erreur lors de la création du devis');
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
          <DialogTitle className="text-brand-purple">Créer un nouveau devis</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="validUntil">Valide jusqu'au</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Importer un devis PDF (optionnel)</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-turquoise transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-brand-gray mb-2" />
                <p className="text-sm text-brand-gray">
                  {pdfFile ? pdfFile.name : 'Cliquez pour importer un PDF'}
                </p>
              </label>
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
              {items.map((item, index) => (
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
            <Label htmlFor="notes">Notes / Conditions (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions de paiement, délais, etc."
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
            disabled={!selectedClient || loading}
          >
            {loading ? 'Création...' : 'Créer le devis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
