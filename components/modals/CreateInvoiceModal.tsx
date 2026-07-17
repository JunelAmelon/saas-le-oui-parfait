'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendInvoiceCreatedEmail } from '@/lib/email-notifications';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createInvoice } from '@/lib/invoice-helpers';
import { getDocuments } from '@/lib/db';
import { Loader2, Upload } from 'lucide-react';

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInvoiceModal({ open, onOpenChange, onSuccess }: CreateInvoiceModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    number: '',
    client_id: '',
    event_id: '',
    label: '',
    amount_ttc: '',
    due_date: '',
    file_url: '',
    iban: '',
    bic: '',
    account_holder: '',
  });

  useEffect(() => {
    if (open && user) {
      fetchClients();
    }
  }, [open, user]);

  useEffect(() => {
    if (formData.client_id) {
      fetchEvents(formData.client_id);
    } else {
      setEvents([]);
    }
  }, [formData.client_id]);

  const fetchClients = async () => {
    if (!user) return;
    const clientsData = await getDocuments('clients', [
      { field: 'planner_id', operator: '==', value: user.uid },
    ]);
    setClients(clientsData);
  };

  const fetchEvents = async (clientId: string) => {
    if (!user) return;
    const eventsData = await getDocuments('events', [
      { field: 'client_id', operator: '==', value: clientId },
      { field: 'planner_id', operator: '==', value: user.uid },
    ]);
    setEvents(eventsData);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/proof', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await response.json();
      setFormData(prev => ({ ...prev, file_url: url }));
      
      toast({
        title: 'Succès',
        description: 'Facture uploadée avec succès',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'uploader la facture",
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!formData.client_id || !formData.number || !formData.label || !formData.amount_ttc || !formData.due_date || !formData.file_url) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      
      const invoiceData: any = {
        client_id: formData.client_id,
        planner_id: user.uid,
        number: formData.number,
        label: formData.label,
        amount_ttc: parseFloat(formData.amount_ttc),
        due_date: formData.due_date,
        status: 'payment_pending',
      };

      if (formData.event_id) {
        invoiceData.event_id = formData.event_id;
      }

      if (formData.file_url) {
        invoiceData.file_url = formData.file_url;
      }

      if (formData.iban && formData.bic && formData.account_holder) {
        invoiceData.bank_details = {
          iban: formData.iban,
          bic: formData.bic,
          account_holder: formData.account_holder,
        };
      }

      await createInvoice(invoiceData);

      // Envoyer email au client
      const selectedClient = clients.find(c => c.id === formData.client_id);
      if (selectedClient?.email) {
        await sendInvoiceCreatedEmail({
          client_email: selectedClient.email,
          client_name: selectedClient.name || 'Client',
          invoice_number: formData.number,
          amount: parseFloat(formData.amount_ttc),
          due_date: formData.due_date,
          invoice_url: formData.file_url,
        });
      }

      toast({
        title: 'Succès',
        description: `Facture ${formData.number} créée avec succès`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la facture',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      number: '',
      client_id: '',
      event_id: '',
      label: '',
      amount_ttc: '',
      due_date: '',
      file_url: '',
      iban: '',
      bic: '',
      account_holder: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>
            Créez une nouvelle facture pour un client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value, event_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.names || client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {events.length > 0 && (
              <div className="col-span-2">
                <Label htmlFor="event">Événement (optionnel)</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name || event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="number">Numéro de facture *</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                placeholder="Ex: F-2026-001"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="label">Libellé *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex: Prestation mariage - Acompte 1"
              />
            </div>

            <div>
              <Label htmlFor="amount">Montant TTC (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount_ttc}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_ttc: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="due_date">Date d'échéance *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="file">Facture PDF *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {formData.file_url && (
                <p className="text-sm text-green-600 mt-1">✓ Fichier uploadé</p>
              )}
            </div>

            <div className="col-span-2">
              <h3 className="font-medium mb-2">Coordonnées bancaires (optionnel)</h3>
            </div>

            <div className="col-span-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
              />
            </div>

            <div>
              <Label htmlFor="bic">BIC</Label>
              <Input
                id="bic"
                value={formData.bic}
                onChange={(e) => setFormData(prev => ({ ...prev, bic: e.target.value }))}
                placeholder="BNPAFRPPXXX"
              />
            </div>

            <div>
              <Label htmlFor="account_holder">Titulaire du compte</Label>
              <Input
                id="account_holder"
                value={formData.account_holder}
                onChange={(e) => setFormData(prev => ({ ...prev, account_holder: e.target.value }))}
                placeholder="Le Oui Parfait"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer la facture
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
