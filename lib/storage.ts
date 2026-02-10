/**
 * Cloudinary Upload Utility
 * Gère l'upload des fichiers vers Cloudinary avec axios comme dans ClientModal
 */

import axios from 'axios';

const CLOUDINARY_TIMEOUT_MS = 60_000;

export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  formData.append('folder', folder);
  formData.append('resource_type', 'auto');

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData,
      { timeout: CLOUDINARY_TIMEOUT_MS }
    );

    return res.data.secure_url;
  } catch (e: any) {
    const message = e?.response?.data?.error?.message || e?.message || 'Cloudinary upload failed';
    throw new Error(message);
  }
};

export const uploadPdf = async (pdfBlob: Blob, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', pdfBlob, `${filename}.pdf`);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
      formData,
      // PDFs peuvent être plus lourds que les images: on évite un timeout trop agressif.
      // (0 = pas de timeout côté axios)
      { timeout: 0 }
    );

    return res.data.secure_url;
  } catch (e: any) {
    // Surface Cloudinary's error payload to help debug 400s (preset/format restrictions)
    console.error('Cloudinary uploadPdf error payload:', e?.response?.data);
    const message = e?.response?.data?.error?.message || e?.message || 'Cloudinary PDF upload failed';
    throw new Error(message);
  }
};

export const uploadImage = uploadFile; // Alias pour compatibilité
