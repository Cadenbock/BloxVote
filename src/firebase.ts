import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile, 
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { RobloxAccountInfo } from './types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signIn = signInWithGoogle; // backward compatibility

// Helper to broadcast custom Roblox session changes
const notifyRobloxAuthChange = (user: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bloxvote_roblox_auth_change', { detail: user }));
  }
};

export const getStoredRobloxUser = (): RobloxAccountInfo | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('bloxvote_active_roblox_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const signInWithRoblox = async (robloxUser: RobloxAccountInfo): Promise<void> => {
  const preferredDisplayName = robloxUser.displayName || robloxUser.name;
  const avatarUrl = robloxUser.avatarHeadshot || `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUser.id}&width=420&height=420&format=png`;

  const fullRobloxProfile = {
    ...robloxUser,
    displayName: preferredDisplayName,
    avatarHeadshot: avatarUrl,
    isVerifiedOwner: true
  };

  // Always save local active Roblox profile
  localStorage.setItem('bloxvote_active_roblox_user', JSON.stringify(fullRobloxProfile));

  // Sync to Firestore under roblox_ ID document
  const virtualUid = `roblox_${robloxUser.id}`;
  try {
    const virtualUserRef = doc(db, 'users', virtualUid);
    const existingSnap = await getDoc(virtualUserRef);
    const payload: any = {
      displayName: preferredDisplayName,
      photoURL: avatarUrl,
      robloxUsername: robloxUser.name,
      robloxId: robloxUser.id,
      robloxDisplayName: robloxUser.displayName || robloxUser.name,
      robloxAvatarHeadshot: avatarUrl,
      robloxAvatarFull: robloxUser.avatarFull || '',
      robloxProfileUrl: `https://www.roblox.com/users/${robloxUser.id}/profile`,
      authProvider: 'roblox',
      isRobloxVerified: true,
      robloxAccount: fullRobloxProfile,
    };

    if (!existingSnap.exists()) {
      payload.coins = 50;
      payload.equippedColor = 'default';
      payload.purchasedColors = ['default'];
      payload.equippedTheme = 'default';
      payload.purchasedThemes = ['default'];
      payload.equippedFont = 'default';
      payload.purchasedFonts = ['default'];
      payload.equippedTitle = 'default';
      payload.purchasedTitles = ['default'];
    }

    await setDoc(virtualUserRef, payload, { merge: true });
  } catch (err) {
    console.warn("Virtual roblox user doc sync notice:", err);
  }

  let currentUser = auth.currentUser;
  
  if (!currentUser) {
    // 1. Try Synthetic Email/Password account (works without Google popup)
    const syntheticEmail = `roblox_${robloxUser.id}@bloxvote.internal`;
    const syntheticPass = `BloxVote_Auth2026_${robloxUser.id}!`;

    try {
      const userCred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPass);
      currentUser = userCred.user;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPass);
          currentUser = newCred.user;
        } catch {
          // If creation fails, try anonymous next
        }
      }
    }

    // 2. If email auth wasn't possible, try anonymous
    if (!currentUser) {
      try {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      } catch (anonErr: any) {
        console.warn("Anonymous auth notice:", anonErr?.message);
      }
    }
  }

  if (currentUser) {
    try {
      await updateProfile(currentUser, {
        displayName: preferredDisplayName,
        photoURL: avatarUrl,
      });
    } catch (err) {
      console.warn("Could not update auth user profile:", err);
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const existingDoc = await getDoc(userRef);

      const payload: any = {
        displayName: preferredDisplayName,
        photoURL: avatarUrl,
        robloxUsername: robloxUser.name,
        robloxId: robloxUser.id,
        robloxDisplayName: robloxUser.displayName || robloxUser.name,
        robloxAvatarHeadshot: avatarUrl,
        robloxAvatarFull: robloxUser.avatarFull || '',
        robloxProfileUrl: `https://www.roblox.com/users/${robloxUser.id}/profile`,
        authProvider: 'roblox',
        isRobloxVerified: true,
        robloxAccount: fullRobloxProfile,
      };

      if (!existingDoc.exists()) {
        payload.coins = 50;
        payload.equippedColor = 'default';
        payload.purchasedColors = ['default'];
        payload.equippedTheme = 'default';
        payload.purchasedThemes = ['default'];
        payload.equippedFont = 'default';
        payload.purchasedFonts = ['default'];
        payload.equippedTitle = 'default';
        payload.purchasedTitles = ['default'];
      }

      await setDoc(userRef, payload, { merge: true });
    } catch (docErr) {
      console.warn("Could not sync user document to Firestore:", docErr);
    }
  }

  notifyRobloxAuthChange(fullRobloxProfile);
};

export const linkRobloxAccount = async (robloxUser: RobloxAccountInfo): Promise<void> => {
  if (auth.currentUser) {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, {
      robloxUsername: robloxUser.name,
      robloxId: robloxUser.id,
      robloxDisplayName: robloxUser.displayName,
      robloxAvatarHeadshot: robloxUser.avatarHeadshot,
      robloxAvatarFull: robloxUser.avatarFull || '',
      robloxProfileUrl: `https://www.roblox.com/users/${robloxUser.id}/profile`,
      isRobloxVerified: !!robloxUser.isVerifiedOwner,
      robloxAccount: robloxUser,
    }, { merge: true });
  }

  localStorage.setItem('bloxvote_active_roblox_user', JSON.stringify(robloxUser));
  notifyRobloxAuthChange(robloxUser);
};

export const unlinkRobloxAccount = async (): Promise<void> => {
  if (auth.currentUser) {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, {
      robloxUsername: '',
      robloxId: null,
      robloxDisplayName: '',
      robloxAvatarHeadshot: '',
      robloxAvatarFull: '',
      robloxProfileUrl: '',
      isRobloxVerified: false,
      robloxAccount: null,
    }, { merge: true });
  }
  localStorage.removeItem('bloxvote_active_roblox_user');
  notifyRobloxAuthChange(null);
};

export const logout = async () => {
  localStorage.removeItem('bloxvote_active_roblox_user');
  notifyRobloxAuthChange(null);
  await signOut(auth);
};
