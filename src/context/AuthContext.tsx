import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  User,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDocs, updateDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface AuthContextType {
  currentUser: User | null;
  user: (User & { username?: string }) | null;
  register: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const register = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await setDoc(doc(db, 'users', result.user.uid), {
      email: email.toLowerCase().trim(),
      displayName,
      password: password,
      authPassword: password,
      createdAt: serverTimestamp(),
      uid: result.user.uid,
    });
    return result;
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem('toolkit_db_user');
      return result;
    } catch (err: any) {
      // If Firebase Auth rejects with wrong password or invalid credential,
      // verify if user has updated their password in the Firestore database
      if (
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found'
      ) {
        try {
          const q = query(
            collection(db, 'users'),
            where('email', '==', email.trim().toLowerCase())
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            if (userData?.password && userData.password === password) {
              // Password matches Firestore database record!
              // Attempt to synchronize with Firebase Auth if authPassword is known
              if (userData.authPassword && userData.authPassword !== password) {
                try {
                  const authRes = await signInWithEmailAndPassword(auth, email, userData.authPassword);
                  if (auth.currentUser) {
                    await updatePassword(auth.currentUser, password);
                    await updateDoc(snap.docs[0].ref, { authPassword: password });
                  }
                  return authRes;
                } catch (syncErr) {
                  console.warn('Could not sync password to Firebase Auth:', syncErr);
                }
              }

              // Create active session matching Firebase User interface
              const syntheticUser = {
                uid: userData.uid || snap.docs[0].id,
                email: userData.email,
                displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
                emailVerified: true,
                isAnonymous: false,
                metadata: {},
                providerData: [],
                refreshToken: '',
                tenantId: null,
                delete: async () => {},
                getIdToken: async () => 'mock-token',
                getIdTokenResult: async () => ({} as any),
                reload: async () => {},
                toJSON: () => ({}),
                phoneNumber: null,
                photoURL: null,
                providerId: 'password',
              } as unknown as User;

              setCurrentUser(syntheticUser);
              localStorage.setItem('toolkit_db_user', JSON.stringify({
                uid: userData.uid || snap.docs[0].id,
                email: userData.email,
                displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
              }));

              return { user: syntheticUser } as UserCredential;
            }
          }
        } catch (dbErr) {
          console.warn('Database fallback login check failed:', dbErr);
        }
      }
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('toolkit_db_user');
    setCurrentUser(null);
    await signOut(auth);
  };

  const resetPassword = (email: string) => 
    sendPasswordResetEmail(auth, email);

  useEffect(() => {
    // Check saved database user session if Firebase Auth is not yet signed in
    const saved = localStorage.getItem('toolkit_db_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.uid && parsed?.email) {
          setCurrentUser(parsed as User);
        }
      } catch (e) {
        console.warn('Failed to parse saved db user:', e);
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        localStorage.removeItem('toolkit_db_user');
      } else {
        const savedSession = localStorage.getItem('toolkit_db_user');
        if (savedSession) {
          try {
            setCurrentUser(JSON.parse(savedSession));
          } catch (e) {}
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const user = currentUser ? Object.assign(currentUser, {
    username: currentUser.displayName || currentUser.email?.split('@')[0] || 'User'
  }) : null;

  const value: AuthContextType = { currentUser, user, register, login, logout, resetPassword, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}