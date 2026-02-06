'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  type: string;
  dateRequested: string;
  timeRequested: string;
  notes: string;
  status: 'pending' | 'accepted' | 'refused' | 'completed';
  clientId: string;
  createdAt: string;
  adminResponse?: string;
  confirmedDate?: string;
  confirmedTime?: string;
}

interface AppointmentRequestProps {
  clientId: string;
  isAdmin?: boolean;
  appointments: Appointment[];
  onUpdate?: (appointments: Appointment[]) => void;
}

export function AppointmentRequest({ clientId, isAdmin = false, appointments: initialAppointments, onUpdate }: AppointmentRequestProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newRequest, setNewRequest] = useState({
    type: '',
    dateRequested: '',
    timeRequested: '',
    notes: '',
  });
  const [adminResponse, setAdminResponse] = useState({
    status: 'accepted' as 'accepted' | 'refused',
    message: '',
    confirmedDate: '',
    confirmedTime: '',
  });
  const { toast } = useToast();

  const appointmentTypes = [
    'Rendez-vous fleuriste',
    'Essayage robe/costume',
    'Dégustation traiteur',
    'Visite du lieu',
    'Rendez-vous photographe',
    'Rendez-vous DJ/Musiciens',
    'Réunion planning',
    'Autre',
  ];

  const handleRequestAppointment = () => {
    if (!newRequest.type || !newRequest.dateRequested || !newRequest.timeRequested) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    const appointment: Appointment = {
      id: Date.now().toString(),
      type: newRequest.type,
      dateRequested: newRequest.dateRequested,
      timeRequested: newRequest.timeRequested,
      notes: newRequest.notes,
      status: 'pending',
      clientId,
      createdAt: new Date().toISOString(),
    };

    const updated = [...appointments, appointment];
    setAppointments(updated);
    onUpdate?.(updated);
    setIsRequestModalOpen(false);
    setNewRequest({ type: '', dateRequested: '', timeRequested: '', notes: '' });

    toast({
      title: 'Demande envoyée',
      description: 'Votre demande de rendez-vous a été envoyée à votre wedding planner',
    });
  };

  const handleAdminResponse = () => {
    if (!selectedAppointment) return;

    if (adminResponse.status === 'accepted' && (!adminResponse.confirmedDate || !adminResponse.confirmedTime)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez confirmer la date et l\'heure du rendez-vous',
        variant: 'destructive',
      });
      return;
    }

    const updated = appointments.map(apt =>
      apt.id === selectedAppointment.id
        ? {
            ...apt,
            status: adminResponse.status,
            adminResponse: adminResponse.message,
            confirmedDate: adminResponse.status === 'accepted' ? adminResponse.confirmedDate : undefined,
            confirmedTime: adminResponse.status === 'accepted' ? adminResponse.confirmedTime : undefined,
          }
        : apt
    );

    setAppointments(updated);
    onUpdate?.(updated);
    setIsResponseModalOpen(false);
    setSelectedAppointment(null);
    setAdminResponse({ status: 'accepted', message: '', confirmedDate: '', confirmedTime: '' });

    toast({
      title: 'Réponse envoyée',
      description: `La demande a été ${adminResponse.status === 'accepted' ? 'acceptée' : 'refusée'}`,
    });
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Accepté</Badge>;
      case 'refused':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="h-3 w-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-700"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-purple">Demandes de rendez-vous</h3>
        {!isAdmin && (
          <Button
            size="sm"
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
            onClick={() => setIsRequestModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Demander un RDV
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {appointments.length === 0 ? (
          <Card className="p-6 text-center">
            <Calendar className="h-12 w-12 text-brand-gray mx-auto mb-2" />
            <p className="text-brand-gray">Aucune demande de rendez-vous</p>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-brand-purple">{appointment.type}</h4>
                      <div className="flex items-center gap-2 text-sm text-brand-gray mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>{appointment.dateRequested}</span>
                        <Clock className="h-4 w-4 ml-2" />
                        <span>{appointment.timeRequested}</span>
                      </div>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                  
                  {appointment.notes && (
                    <p className="text-sm text-brand-gray mb-2">{appointment.notes}</p>
                  )}

                  {appointment.status === 'accepted' && appointment.confirmedDate && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-700">Rendez-vous confirmé</p>
                      <p className="text-sm text-green-600">
                        {appointment.confirmedDate} à {appointment.confirmedTime}
                      </p>
                    </div>
                  )}

                  {appointment.status === 'refused' && appointment.adminResponse && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-700">Demande refusée</p>
                      <p className="text-sm text-red-600">{appointment.adminResponse}</p>
                    </div>
                  )}

                  {isAdmin && appointment.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setAdminResponse({ ...adminResponse, status: 'accepted' });
                          setIsResponseModalOpen(true);
                        }}
                      >
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setAdminResponse({ ...adminResponse, status: 'refused' });
                          setIsResponseModalOpen(true);
                        }}
                      >
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal demande client */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander un rendez-vous</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Type de rendez-vous *</Label>
              <Select value={newRequest.type} onValueChange={(value) => setNewRequest({ ...newRequest, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date souhaitée *</Label>
                <Input
                  id="date"
                  type="date"
                  value={newRequest.dateRequested}
                  onChange={(e) => setNewRequest({ ...newRequest, dateRequested: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time">Heure souhaitée *</Label>
                <Input
                  id="time"
                  type="time"
                  value={newRequest.timeRequested}
                  onChange={(e) => setNewRequest({ ...newRequest, timeRequested: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={newRequest.notes}
                onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestModalOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-brand-turquoise hover:bg-brand-turquoise-hover"
              onClick={handleRequestAppointment}
            >
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal réponse admin */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adminResponse.status === 'accepted' ? 'Accepter' : 'Refuser'} la demande
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {adminResponse.status === 'accepted' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="confirmedDate">Date confirmée *</Label>
                    <Input
                      id="confirmedDate"
                      type="date"
                      value={adminResponse.confirmedDate}
                      onChange={(e) => setAdminResponse({ ...adminResponse, confirmedDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmedTime">Heure confirmée *</Label>
                    <Input
                      id="confirmedTime"
                      type="time"
                      value={adminResponse.confirmedTime}
                      onChange={(e) => setAdminResponse({ ...adminResponse, confirmedTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Message (optionnel)</Label>
                  <Textarea
                    id="message"
                    value={adminResponse.message}
                    onChange={(e) => setAdminResponse({ ...adminResponse, message: e.target.value })}
                    placeholder="Message pour le client..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="refusalMessage">Raison du refus *</Label>
                <Textarea
                  id="refusalMessage"
                  value={adminResponse.message}
                  onChange={(e) => setAdminResponse({ ...adminResponse, message: e.target.value })}
                  placeholder="Expliquez pourquoi vous refusez cette demande..."
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResponseModalOpen(false)}>
              Annuler
            </Button>
            <Button
              className={adminResponse.status === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              onClick={handleAdminResponse}
            >
              {adminResponse.status === 'accepted' ? 'Confirmer' : 'Refuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
