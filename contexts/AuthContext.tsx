'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { getDocument } from '@/lib/db';

interface UserProfile {
  uid: string;
  email: string;
  role: 'planner' | 'client';
  full_name?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const profile = await getDocument('profiles', firebaseUser.uid) as any;

          if (profile) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              role: profile.role,
              full_name: profile.full_name,
            });
          } else {
            // Fallback or handle missing profile
            // For now, let's assume if no profile, we might need to create one or just set basic info
            // But existing users (if any) might not have profiles yet. 
            // Since this is a migration, we expect profiles to be created on signup.
            console.error('No profile found for user:', firebaseUser.uid);
            // Potentially sign out or handle error
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Fetch profile to determine role and redirect
      const profile = await getDocument('profiles', userCredential.user.uid) as any;

      if (profile) {
        if (profile.role === 'client') {
          router.push('/espace-client');
        } else {
          router.push('/');
        }
      } else {
        // If no profile, default to home or handle error
        router.push('/');
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
