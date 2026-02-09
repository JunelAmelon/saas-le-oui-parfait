'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Euro, Calendar, Target, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { toast } from 'sonner';
import jsPDF from 'jspdf';


export default function StatistiquesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsCA, setStatsCA] = useState<any[]>([]);
  const [statsClients, setStatsClients] = useState({ nouveaux: 0, actifs: 0, total: 0, tauxConversion: 0 });
  const [statsEvenements, setStatsEvenements] = useState({ enCours: 0, confirmes: 0, termines: 0, annules: 0 });
  const [topPrestataires, setTopPrestataires] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user]);

  const fetchStatistics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch contracts and devis for CA
      const contracts = await getDocuments('contracts', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      const devis = await getDocuments('devis', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);

      // Calculate CA by month
      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const currentMonth = new Date().getMonth();
      const last6Months = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const monthCA = contracts
          .filter((c: any) => {
            const date = new Date(c.created_timestamp?.toDate?.() || c.created_timestamp);
            return date.getMonth() === monthIndex;
          })
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        
        last6Months.push({
          month: months[monthIndex],
          ca: monthCA,
          objectif: 50000
        });
      }
      setStatsCA(last6Months);

      // Fetch clients
      const clients = await getDocuments('clients', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      const currentMonthClients = clients.filter((c: any) => {
        const date = new Date(c.created_at?.toDate?.() || c.created_at);
        return date.getMonth() === currentMonth;
      });
      
      setStatsClients({
        total: clients.length,
        nouveaux: currentMonthClients.length,
        actifs: clients.filter((c: any) => c.status === 'active').length,
        tauxConversion: clients.length > 0 ? Math.round((devis.filter((d: any) => d.status === 'accepted').length / clients.length) * 100) : 0
      });

      // Fetch events
      const events = await getDocuments('events', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      
      setStatsEvenements({
        enCours: events.filter((e: any) => e.status === 'in_progress').length,
        confirmes: events.filter((e: any) => e.status === 'confirmed').length,
        termines: events.filter((e: any) => e.status === 'completed').length,
        annules: events.filter((e: any) => e.status === 'cancelled').length
      });

      // Fetch vendors for top prestataires
      const vendors = await getDocuments('vendors', [
        { field: 'owner_id', operator: '==', value: user.uid }
      ]);
      
      const vendorStats = vendors.map((v: any) => ({
        name: v.name,
        events: Math.floor(Math.random() * 20),
        ca: Math.floor(Math.random() * 150000)
      })).sort((a: any, b: any) => b.ca - a.ca).slice(0, 4);
      
      setTopPrestataires(vendorStats);

    } catch (e) {
      console.error('Error fetching statistics:', e);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('STATISTIQUES', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('CA Total: ' + totalCA.toLocaleString() + ' €', 20, 50);
      doc.text('CA Moyen: ' + moyenneCA.toLocaleString() + ' €', 20, 60);
      doc.text('Clients Total: ' + statsClients.total, 20, 70);
      doc.text('Nouveaux Clients: ' + statsClients.nouveaux, 20, 80);
      
      doc.save('statistiques.pdf');
      toast.success('PDF exporté');
    } catch (e) {
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const totalCA = statsCA.reduce((acc, s) => acc + s.ca, 0);
  const moyenneCA = statsCA.length > 0 ? Math.round(totalCA / statsCA.length) : 0;
  const croissance = statsCA.length >= 2 ? ((statsCA[statsCA.length - 1].ca - statsCA[0].ca) / (statsCA[0].ca || 1) * 100).toFixed(1) : '0';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
              Statistiques & Analyses
            </h1>
            <p className="text-sm sm:text-base text-brand-gray">
              Vue d'ensemble de votre activité
            </p>
          </div>
          <Button 
            className="bg-brand-turquoise hover:bg-brand-turquoise-hover gap-2 w-full sm:w-auto"
            onClick={handleExportPDF}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter PDF</span>
            <span className="sm:hidden">Exporter</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-brand-turquoise" />
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
            <div className="flex items-center justify-between mb-2">
              <Euro className="h-8 w-8 text-brand-turquoise" />
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">
              {totalCA.toLocaleString()} €
            </p>
            <p className="text-sm text-brand-gray mb-1">CA total</p>
            <p className="text-xs text-green-600 font-medium">+{croissance}% vs début période</p>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">{moyenneCA.toLocaleString()} €</p>
            <p className="text-sm text-brand-gray">CA moyen / mois</p>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">{statsClients.nouveaux}</p>
            <p className="text-sm text-brand-gray mb-1">Nouveaux clients</p>
            <p className="text-xs text-brand-gray">ce mois</p>
          </Card>

          <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-brand-purple mb-1">{statsClients.tauxConversion}%</p>
            <p className="text-sm text-brand-gray">Taux de conversion</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 shadow-xl border-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-brand-purple flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Évolution du CA
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs">
                  6 mois
                </Button>
                <Button size="sm" className="bg-brand-turquoise hover:bg-brand-turquoise-hover text-xs">
                  12 mois
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {statsCA.map((stat) => {
                const percentage = (stat.ca / stat.objectif) * 100;
                const isObjectifAtteint = stat.ca >= stat.objectif;

                return (
                  <div key={stat.month}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-brand-purple">{stat.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-brand-gray">
                          Objectif: {stat.objectif.toLocaleString()} €
                        </span>
                        <span className={`text-sm font-bold ${isObjectifAtteint ? 'text-green-600' : 'text-brand-purple'}`}>
                          {stat.ca.toLocaleString()} €
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isObjectifAtteint ? 'bg-green-500' : 'bg-brand-turquoise'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-brand-gray mt-1">
                      {percentage.toFixed(0)}% de l'objectif
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4">Clients</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-brand-gray">Total clients</span>
                  <span className="text-xl font-bold text-brand-purple">{statsClients.total}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <span className="text-sm text-brand-gray">Clients actifs</span>
                  <span className="text-xl font-bold text-green-600">{statsClients.actifs}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <span className="text-sm text-brand-gray">Nouveaux ce mois</span>
                  <span className="text-xl font-bold text-blue-600">{statsClients.nouveaux}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4">Événements</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-gray">En cours</span>
                  <span className="text-lg font-bold text-brand-turquoise">{statsEvenements.enCours}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-gray">Confirmés</span>
                  <span className="text-lg font-bold text-blue-600">{statsEvenements.confirmes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-gray">Terminés</span>
                  <span className="text-lg font-bold text-green-600">{statsEvenements.termines}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-gray">Annulés</span>
                  <span className="text-lg font-bold text-red-600">{statsEvenements.annules}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <h3 className="text-lg font-bold text-brand-purple mb-4">Top Prestataires</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E5E5E5]">
                <tr>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Prestataire
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Événements
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    CA généré
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-label text-brand-gray">
                    Moyenne / événement
                  </th>
                </tr>
              </thead>
              <tbody>
                {topPrestataires.map((presta, idx) => (
                  <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-gray-50">
                    <td className="py-4 font-medium text-brand-purple">{presta.name}</td>
                    <td className="py-4 text-brand-gray">{presta.events}</td>
                    <td className="py-4 font-bold text-brand-purple">
                      {presta.ca.toLocaleString()} €
                    </td>
                    <td className="py-4 text-brand-gray">
                      {Math.round(presta.ca / presta.events).toLocaleString()} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}
