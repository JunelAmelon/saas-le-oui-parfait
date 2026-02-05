import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, Globe, Star, Award, Image as ImageIcon, Facebook, Instagram, Linkedin } from 'lucide-react';

export default function AnnuairePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-purple mb-2">
              Ma fiche annuaire
            </h1>
            <p className="text-brand-gray">
              Gérez votre présence dans l'annuaire professionnel
            </p>
          </div>
          <Button className="bg-brand-turquoise hover:bg-brand-turquoise-hover">
            Publier les modifications
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Présentation
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-sm font-medium text-brand-gray">
                    Nom commercial
                  </Label>
                  <Input
                    id="businessName"
                    defaultValue="Le Oui Parfait"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline" className="text-sm font-medium text-brand-gray">
                    Slogan
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="Votre slogan accrocheur..."
                    defaultValue="Organisatrice de mariages d'exception en Bretagne"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-brand-gray">
                    Description de votre activité
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre expertise, votre style, vos valeurs..."
                    rows={6}
                    defaultValue="Wedding planner passionnée depuis plus de 10 ans, je vous accompagne dans la création de votre mariage sur-mesure. De la conception à la coordination du jour J, je mets mon expertise au service de vos rêves pour faire de votre mariage un moment unique et inoubliable."
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gray">
                      Spécialités
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-brand-turquoise text-white">Mariages champêtres</Badge>
                      <Badge className="bg-brand-turquoise text-white">Château</Badge>
                      <Badge className="bg-brand-turquoise text-white">Destination wedding</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
                      + Ajouter une spécialité
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-brand-gray">
                      Services proposés
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-brand-turquoise text-white">Coordination jour J</Badge>
                      <Badge className="bg-brand-turquoise text-white">Planning complet</Badge>
                      <Badge className="bg-brand-turquoise text-white">Décoration</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white">
                      + Ajouter un service
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h2 className="text-xl font-bold text-brand-purple mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Coordonnées
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue="+33 6 12 34 56 78"
                      className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                    />
                  </div>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium text-brand-gray flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Site web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    defaultValue="https://www.leouiparfait.fr"
                    className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-brand-gray">
                    Réseaux sociaux
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      <Input
                        placeholder="@leouiparfait"
                        defaultValue="@leouiparfait"
                        className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <Input
                        placeholder="Le Oui Parfait"
                        defaultValue="leouiparfait"
                        className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-5 w-5 text-blue-700" />
                      <Input
                        placeholder="company/leouiparfait"
                        className="border-[#E5E5E5] focus-visible:ring-brand-turquoise"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4">
                Photo de profil
              </h3>
              <div className="mb-4 flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E5E5] bg-gray-50">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-brand-gray mb-2" />
                  <p className="text-sm text-brand-gray">
                    Aucune photo
                  </p>
                </div>
              </div>
              <Button className="w-full bg-brand-turquoise hover:bg-brand-turquoise-hover">
                Télécharger une photo
              </Button>
            </Card>

            <Card className="p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-brand-purple mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Distinctions
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-brand-purple">
                      Mariages.net Awards
                    </p>
                    <p className="text-xs text-brand-gray">2023</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-brand-purple">
                      Zankyou Awards
                    </p>
                    <p className="text-xs text-brand-gray">2023</p>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-4 border-2 border-brand-turquoise text-brand-gray hover:bg-brand-turquoise hover:text-white"
              >
                + Ajouter une distinction
              </Button>
            </Card>

            <Card className="p-6 shadow-xl border-0 bg-gradient-to-br from-brand-beige to-white">
              <div className="text-center">
                <Star className="h-8 w-8 text-yellow-500 fill-yellow-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-brand-purple mb-1">4.9/5</p>
                <p className="text-sm text-brand-gray">Note moyenne</p>
                <p className="text-xs text-brand-gray mt-1">Basée sur 47 avis</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
