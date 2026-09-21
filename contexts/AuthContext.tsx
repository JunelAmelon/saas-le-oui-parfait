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
import { getClientFullData } from '@/lib/client-helpers';

interface UserProfile {
  uid: string;
  email: string;
  role: 'planner' | 'client' | 'vendor';
  full_name?: string;
  vendor_id?: string;
  planner_id?: string;
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

          if (!profile || profile.disabled === true) {
            console.error(profile ? 'Account disabled:' : 'No profile found for user:', firebaseUser.uid);
            await firebaseSignOut(auth);
            setUser(null);
            document.cookie = 'user_role=; path=/; max-age=0';
            router.push('/login');
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              role: profile.role,
              full_name: profile.full_name,
              vendor_id: profile.vendor_id,
              planner_id: profile.planner_id,
            });
            // Set role cookie for middleware route protection
            document.cookie = `user_role=${profile.role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          await firebaseSignOut(auth);
          setUser(null);
          document.cookie = 'user_role=; path=/; max-age=0';
          router.push('/login');
        }
      } else {
        setUser(null);
        // Clear role cookie on logout
        document.cookie = 'user_role=; path=/; max-age=0';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Fetch profile to determine role and redirect
    const profile = await getDocument('profiles', userCredential.user.uid) as any;

    if (!profile || profile.disabled === true) {
      await firebaseSignOut(auth);
      setUser(null);
      document.cookie = 'user_role=; path=/; max-age=0';
      throw new Error(profile ? 'account_disabled' : 'account_not_found');
    }

    if (profile.role === 'client') {
      const clientData = await getClientFullData(userCredential.user.uid);
      if (!clientData) {
        await firebaseSignOut(auth);
        setUser(null);
        document.cookie = 'user_role=; path=/; max-age=0';
        throw new Error('account_not_found');
      }
      router.push('/espace-client');
    } else if (profile.role === 'vendor') {
      router.push('/espace-pro');
    } else {
      router.push('/');
    }
  };

  const signOut = async () => {
    // Clear role cookie before sign out
    document.cookie = 'user_role=; path=/; max-age=0';
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
