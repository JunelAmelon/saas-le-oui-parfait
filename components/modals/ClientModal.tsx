'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, User, X } from 'lucide-react';
import { addDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import axios from 'axios';

interface ClientModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    client?: {
        id: string;
        names: string;
        email: string;
        phone: string;
        eventDate: string;
        eventLocation: string;
        budget: number;
        guests: number;
        photo?: string;
    };
    userId: string;
    onSuccess: () => void;
}

export function ClientModal({ open, onOpenChange, mode, client, userId, onSuccess }: ClientModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(client?.photo || null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const removePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const uploadPhotoToCloudinary = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

        const res = await axios.post(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
            formData
        );

        return res.data.secure_url;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const name = formData.get('name') as string;
        const partner = formData.get('partner') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const eventDate = formData.get('eventDate') as string;
        const eventLocation = formData.get('eventLocation') as string;
        const budget = formData.get('budget') as string;
        const guests = formData.get('guests') as string;

        if (!name || !partner || !email) {
            toast.error('Veuillez remplir les champs obligatoires');
            return;
        }

        setIsSaving(true);

        try {
            let photoUrl = client?.photo || '';
            if (photoFile) {
                photoUrl = await uploadPhotoToCloudinary(photoFile);
            } else if (!photoPreview) {
                photoUrl = '';
            }

            const data = {
                name,
                partner,
                email,
                phone: phone || '',
                event_date: eventDate || '',
                event_location: eventLocation || '',
                budget: budget || '0',
                guests: guests || '0',
                photo: photoUrl,
            };

            if (mode === 'create') {
                await addDocument('clients', {
                    ...data,
                    status: 'En cours',
                    planner_id: userId,
                    created_at: new Date().toISOString(),
                });
                toast.success('Client créé avec succès');
            } else if (client) {
                await updateDocument('clients', client.id, data);
                toast.success('Client mis à jour');
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error(`Erreur lors de ${mode === 'create' ? 'la création' : 'la mise à jour'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const [name1, name2] = client?.names.split(' & ') || ['', ''];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-brand-purple font-semibold">
                        {mode === 'create' ? 'Nouvelle fiche client' : 'Modifier la fiche'}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        {mode === 'create' ? 'Créez une nouvelle fiche pour vos mariés' : 'Modifiez les informations du client'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6 py-6">
                        {/* Photo Section - Améliorée */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700">Photo du couple</Label>

                            <div className="flex flex-col items-center gap-4">
                                {/* Photo Preview ou Placeholder */}
                                <div className="relative group">
                                    <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center transition-all duration-200 hover:border-brand-turquoise hover:shadow-lg">
                                        {photoPreview ? (
                                            <>
                                                <img
                                                    src={photoPreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removePhoto}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-lg"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <div className="w-16 h-16 rounded-full bg-white shadow-inner flex items-center justify-center">
                                                    <User className="h-8 w-8 text-gray-300" />
                                                </div>
                                                <p className="text-xs font-medium text-gray-500">Aucune photo</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex flex-col items-center gap-2">
                                    <input
                                        type="file"
                                        id="photo-upload"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('photo-upload')?.click()}
                                        className="border-brand-turquoise text-brand-turquoise hover:bg-brand-turquoise hover:text-white transition-colors duration-200"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {photoPreview ? 'Changer la photo' : 'Télécharger une photo'}
                                    </Button>
                                    <p className="text-xs text-gray-500">JPG, PNG ou WEBP (max. 5MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-200"></div>

                        {/* Informations des partenaires */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informations du couple</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Partenaire 1 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        name="name"
                                        placeholder="Prénom Nom"
                                        className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                        required
                                        defaultValue={mode === 'edit' ? name1 : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Partenaire 2 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        name="partner"
                                        placeholder="Prénom Nom"
                                        className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                        required
                                        defaultValue={mode === 'edit' ? name2 : ''}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        name="email"
                                        type="email"
                                        placeholder="email@example.com"
                                        className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                        required
                                        defaultValue={client?.email || ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Téléphone</Label>
                                    <Input
                                        name="phone"
                                        type="tel"
                                        placeholder="+33 6 12 34 56 78"
                                        className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                        defaultValue={client?.phone || ''}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-200"></div>

                        {/* Détails de l'événement */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Détails de l'événement</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Date de l'événement</Label>
                                    <Input
                                        name="eventDate"
                                        type="date"
                                        className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                        defaultValue={client?.eventDate ? new Date(client.eventDate.split('/').reverse().join('-')).toISOString().split('T')[0] : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Nombre d'invités</Label>
                                    <Input
                                        name="guests"
                                        type="number"
                                        placeholder="100"
                                        className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                        defaultValue={client?.guests || ''}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Lieu de réception</Label>
                                <Input
                                    name="eventLocation"
                                    placeholder="Nom du lieu, Ville"
                                    className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                    defaultValue={client?.eventLocation || ''}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Budget estimé (€)</Label>
                                <Input
                                    name="budget"
                                    type="number"
                                    placeholder="25 000"
                                    className="border-gray-300 focus:border-brand-purple focus:ring-brand-purple"
                                    defaultValue={client?.budget || ''}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                            className="border-gray-300 hover:bg-gray-50"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            className="bg-brand-turquoise hover:bg-brand-turquoise-hover text-white shadow-md hover:shadow-lg transition-all duration-200"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {mode === 'create' ? 'Création...' : 'Mise à jour...'}
                                </>
                            ) : (
                                mode === 'create' ? 'Créer la fiche' : 'Enregistrer'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}