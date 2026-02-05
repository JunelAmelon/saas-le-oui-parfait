import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react';

export default function AgencyPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-purple mb-1 sm:mb-2">
            Mon Agence
          </h1>
          <p className="text-sm sm:text-base text-brand-gray">
            Gérez les informations de votre agence Le Oui Parfait
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations générales
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-brand-gray">
                      Nom de l'agence
                    </Label>
                    <Input
                      id="name"
                      defaultValue="Le Oui Parfait"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siret" className="text-sm font-medium text-brand-gray">
                      SIRET
                    </Label>
                    <Input
                      id="siret"
                      placeholder="XXX XXX XXX XXXXX"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-brand-gray">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre activité..."
                    rows={4}
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue="contact@leouiparfait.fr"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+33 X XX XX XX XX"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Site web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.leouiparfait.fr"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresse
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-brand-gray">
                    Adresse
                  </Label>
                  <Input
                    id="address"
                    placeholder="123 rue de la République"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-sm font-medium text-brand-gray">
                      Code postal
                    </Label>
                    <Input
                      id="postalCode"
                      placeholder="35000"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-brand-gray">
                      Ville
                    </Label>
                    <Input
                      id="city"
                      placeholder="Rennes"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium text-brand-gray">
                      Pays
                    </Label>
                    <Input
                      id="country"
                      defaultValue="France"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4">
                Logo de l'agence
              </h3>
              <div className="mb-4 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E5E5] bg-gray-50">
                <div className="text-center">
                  <Building2 className="mx-auto h-12 w-12 text-brand-gray mb-2" />
                  <p className="text-sm text-brand-gray">
                    Aucun logo
                  </p>
                </div>
              </div>
              <Button className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover">
                Télécharger un logo
              </Button>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                >
                  Conditions générales
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                >
                  Mentions légales
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
                >
                  Contrats types
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" className="border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
            Annuler
          </Button>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
