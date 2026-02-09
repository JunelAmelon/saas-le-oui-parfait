/**
 * Helper functions pour la gestion des comptes utilisateurs
 * Création de comptes Firebase Auth avec custom claims
 */

import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from './firebase';

export interface CreateClientAccountResult {
  success: boolean;
  uid?: string;
  error?: string;
}

/**
 * Crée un compte Firebase Auth pour un client
 * @param email Email du client
 * @param password Mot de passe défini par le planner
 * @returns UID du compte créé ou erreur
 */
export async function createClientAccount(
  email: string,
  password: string
): Promise<CreateClientAccountResult> {
  try {
    const auth = getAuth(app);
    
    // Créer le compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Note: Les custom claims doivent être définis côté serveur (Cloud Function ou Admin SDK)
    // Pour l'instant, on retourne juste l'UID
    // Le custom claim { "role": "client" } devra être ajouté manuellement ou via Cloud Function

    return {
      success: true,
      uid: user.uid
    };
  } catch (error: any) {
    console.error('Error creating client account:', error);
    
    let errorMessage = 'Erreur lors de la création du compte';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Cet email est déjà utilisé';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email invalide';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Valide le format du mot de passe
 * @param password Mot de passe à valider
 * @returns true si valide, message d'erreur sinon
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return {
      valid: false,
      error: 'Le mot de passe doit contenir au moins 6 caractères'
    };
  }

  // Optionnel : ajouter plus de règles de validation
  // if (!/[A-Z]/.test(password)) {
  //   return {
  //     valid: false,
  //     error: 'Le mot de passe doit contenir au moins une majuscule'
  //   };
  // }

  return { valid: true };
}

/**
 * Génère un mot de passe aléatoire sécurisé
 * @param length Longueur du mot de passe (défaut: 12)
 * @returns Mot de passe généré
 */
export function generateSecurePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Assurer au moins un caractère de chaque type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Remplir le reste
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mélanger les caractères
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
