import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Activity } from '../types';

export async function logActivity(
  type: Activity['type'],
  title: string,
  description: string,
  extraData: {
    gameId?: string;
    gameName?: string;
  } = {}
) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'activities'), {
      type,
      title,
      description,
      userDisplayName: user?.displayName || 'Anonymous Voter',
      userEmail: user?.email || '',
      userPhotoURL: user?.photoURL || '',
      userId: user?.uid || 'guest',
      gameId: extraData.gameId || '',
      gameName: extraData.gameName || '',
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
}
