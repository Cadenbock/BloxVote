// Chat Filter Utility for BloxVote Global Chat
// Protects community guidelines by filtering profanity, slurs, and spam

const PROFANITY_PATTERNS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy', 'bastard',
  'slut', 'whore', 'faggot', 'nigger', 'nigga', 'retard', 'cock', 'penis',
  'vagina', 'dumbass', 'jackass', 'motherfucker', 'stfu', 'wtf', 'bs',
  'kys', 'nazi', 'hitler', 'douche', 'dipshit', 'prick', 'goon', 'gooner',
  'fat', 'fatty', 'ugly', 'loser', 'hoe', 'thot', 'idiot', 'moron'
];

// Common leetspeak substitutions
const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '+': 't',
  '7': 't',
};

/**
 * Normalizes text by converting leetspeak symbols to standard letters
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  for (const [symbol, char] of Object.entries(LEET_MAP)) {
    normalized = normalized.replaceAll(symbol, char);
  }
  return normalized;
}

/**
 * Filters and sanitizes text message.
 * Replaces profane/harassing words with asterisks (e.g. ****).
 */
export function filterChatMessage(input: string): {
  cleanText: string;
  hasProfanity: boolean;
  isOnlyProfanity: boolean;
  hasSpam: boolean;
  flaggedWords: string[];
} {
  if (!input || typeof input !== 'string') {
    return { cleanText: '', hasProfanity: false, isOnlyProfanity: false, hasSpam: false, flaggedWords: [] };
  }

  let cleanText = input;
  let hasProfanity = false;
  const flaggedWords: string[] = [];

  // 1. Check for spam/repetitive characters (e.g. "aaaaa", "hhhhhh")
  const repeatRegex = /(.)\1{9,}/gi;
  const hasSpam = repeatRegex.test(input);
  if (hasSpam) {
    cleanText = cleanText.replace(/(.)\1{7,}/gi, '$1$1$1');
  }

  // 2. Normalize for profanity detection
  const normalized = normalizeText(input);

  // 3. Scan and replace profane words using word boundary checks
  PROFANITY_PATTERNS.forEach((badWord) => {
    // Word boundary check for short words like 'fat', 'goon', 'bs'
    const isShortWord = badWord.length <= 4;
    const regex = isShortWord 
      ? new RegExp(`\\b${badWord}\\b`, 'gi')
      : new RegExp(`\\b${badWord}\\b|${badWord}`, 'gi');

    if (regex.test(normalized)) {
      hasProfanity = true;
      if (!flaggedWords.includes(badWord)) {
        flaggedWords.push(badWord);
      }
      
      // Replace matching word in cleanText with asterisks
      const targetRegex = isShortWord
        ? new RegExp(`\\b${badWord}\\b`, 'gi')
        : new RegExp(`\\b${badWord}\\b|${badWord}`, 'gi');

      cleanText = cleanText.replace(targetRegex, (match) => '*'.repeat(match.length));
    }
  });

  // Check if message was essentially only profanity/banned words
  const isOnlyProfanity = hasProfanity && (cleanText.replace(/[\s\*!.,?]/g, '').length === 0);

  return {
    cleanText,
    hasProfanity,
    isOnlyProfanity,
    hasSpam,
    flaggedWords,
  };
}
