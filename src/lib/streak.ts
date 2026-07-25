import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserStreakData {
  streakCount: number;
  highestStreak: number;
  lastVotedDate: string; // YYYY-MM-DD
  totalDaysVoted: number;
}

/**
 * Helper to format date as YYYY-MM-DD in user's local timezone
 */
export function getFormattedDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's date string YYYY-MM-DD
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getFormattedDate(yesterday);
}

/**
 * Updates user voting streak when a vote is cast
 * Returns object with new streakCount and whether a new streak milestone was reached
 */
export async function recordUserVotingStreak(userId: string): Promise<{
  streakCount: number;
  isNewStreakDay: boolean;
  highestStreak: number;
}> {
  if (!userId) return { streakCount: 0, isNewStreakDay: false, highestStreak: 0 };

  const userRef = doc(db, 'users', userId);
  const todayStr = getFormattedDate();
  const yesterdayStr = getYesterdayDateString();

  try {
    const userDoc = await getDoc(userRef);
    let currentStreak = 1;
    let highestStreak = 1;
    let totalDaysVoted = 1;
    let isNewStreakDay = false;

    if (userDoc.exists()) {
      const data = userDoc.data();
      const lastDate = data.lastVotedDate || '';
      const prevStreak = data.streakCount || 0;
      const prevHighest = data.highestStreak || 0;
      const prevTotalDays = data.totalDaysVoted || 0;

      if (lastDate === todayStr) {
        // Already voted today, streak stays the same
        currentStreak = prevStreak > 0 ? prevStreak : 1;
        highestStreak = Math.max(prevHighest, currentStreak);
        totalDaysVoted = prevTotalDays;
        isNewStreakDay = false;
      } else if (lastDate === yesterdayStr) {
        // Voted yesterday, streak increases by 1!
        currentStreak = prevStreak + 1;
        highestStreak = Math.max(prevHighest, currentStreak);
        totalDaysVoted = prevTotalDays + 1;
        isNewStreakDay = true;
      } else {
        // Streak broken or first vote ever
        currentStreak = 1;
        highestStreak = Math.max(prevHighest, 1);
        totalDaysVoted = prevTotalDays + 1;
        isNewStreakDay = true;
      }
    } else {
      isNewStreakDay = true;
    }

    // Save updated streak info
    await setDoc(userRef, {
      streakCount: currentStreak,
      highestStreak,
      lastVotedDate: todayStr,
      totalDaysVoted,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return {
      streakCount: currentStreak,
      isNewStreakDay,
      highestStreak
    };
  } catch (err) {
    console.warn('Failed to update voting streak:', err);
    return { streakCount: 1, isNewStreakDay: false, highestStreak: 1 };
  }
}
