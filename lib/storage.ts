/**
 * Cloudinary Upload Utility
 * Gère l'upload des fichiers vers Cloudinary avec axios comme dans ClientModal
 */

import axios from 'axios';

export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    formData
  );

  return res.data.secure_url;
};

export const uploadPdf = async (pdfBlob: Blob, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', pdfBlob, `${filename}.pdf`);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  formData.append('resource_type', 'raw');

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
    formData
  );

  return res.data.secure_url;
};

export const uploadImage = uploadFile; // Alias pour compatibilité
