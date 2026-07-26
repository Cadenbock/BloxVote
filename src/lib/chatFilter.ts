// Chat Filter Utility for BloxVote Global Chat & Direct Messages
// Protects community guidelines by filtering profanity, slurs, spam, links, and custom admin-defined words

export const DEFAULT_PROFANITY_PATTERNS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy', 'bastard',
  'slut', 'whore', 'faggot', 'nigger', 'nigga', 'retard', 'cock', 'penis',
  'vagina', 'dumbass', 'jackass', 'motherfucker', 'stfu', 'wtf', 'bs',
  'kys', 'nazi', 'hitler', 'douche', 'dipshit', 'prick', 'goon', 'gooner',
  'fat', 'fatty', 'ugly', 'loser', 'hoe', 'thot', 'idiot', 'moron'
];

// Regex for URLs, domains, and web links
export const URL_REGEX = /(?:https?:\/\/|ftps?:\/\/|www\.)[^\s]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|io|gg|co|me|app|dev|xyz|ca|uk|us|de|tv|link|info|biz|site|online|store|tech|live|top|pro|edu|gov|ru|cn|jp)(?::\d+)?(?:\/[^\s]*)?/gi;

/**
 * Checks whether a given string contains a URL or website domain link
 */
export function containsLink(text: string): boolean {
  if (!text) return false;
  return new RegExp(URL_REGEX.source, 'gi').test(text);
}

let customBannedWords: string[] = [];

/**
 * Update the global list of custom banned words in memory
 */
export function setCustomBannedWords(words: string[]): void {
  if (Array.isArray(words)) {
    customBannedWords = words
      .map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : ''))
      .filter(Boolean);
  }
}

/**
 * Get current list of custom banned words
 */
export function getCustomBannedWords(): string[] {
  return [...customBannedWords];
}

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

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Filters and sanitizes text message.
 * Replaces profane/harassing words with asterisks (e.g. ****) and removes links.
 */
export function filterChatMessage(input: string, extraCustomWords?: string[]): {
  cleanText: string;
  hasProfanity: boolean;
  isOnlyProfanity: boolean;
  hasSpam: boolean;
  hasLink: boolean;
  flaggedWords: string[];
} {
  if (!input || typeof input !== 'string') {
    return { cleanText: '', hasProfanity: false, isOnlyProfanity: false, hasSpam: false, hasLink: false, flaggedWords: [] };
  }

  let cleanText = input;
  let hasProfanity = false;
  const flaggedWords: string[] = [];

  // 1. Check for links / URLs
  const activeUrlRegex = new RegExp(URL_REGEX.source, 'gi');
  const hasLink = activeUrlRegex.test(input);
  if (hasLink) {
    cleanText = cleanText.replace(activeUrlRegex, '[link removed]');
  }

  // Combine default, global custom, and any passed extra words
  const allPatterns = Array.from(new Set([
    ...DEFAULT_PROFANITY_PATTERNS,
    ...customBannedWords,
    ...(extraCustomWords || [])
  ]));

  // 2. Check for spam/repetitive characters (e.g. "aaaaa", "hhhhhh")
  const repeatRegex = /(.)\1{9,}/gi;
  const hasSpam = repeatRegex.test(input);
  if (hasSpam) {
    cleanText = cleanText.replace(/(.)\1{7,}/gi, '$1$1$1');
  }

  // 3. Normalize for profanity detection
  const normalized = normalizeText(input);

  // 4. Scan and replace profane words (including when embedded inside another word/phrase)
  allPatterns.forEach((badWord) => {
    if (!badWord) return;
    const escaped = escapeRegExp(badWord);
    // Matches any non-whitespace word or phrase block that contains badWord anywhere inside it
    const wordContainingRegex = new RegExp(`\\S*${escaped}\\S*`, 'gi');

    if (wordContainingRegex.test(normalized) || wordContainingRegex.test(cleanText)) {
      hasProfanity = true;
      if (!flaggedWords.includes(badWord)) {
        flaggedWords.push(badWord);
      }

      // Replace the entire containing word/phrase with asterisks
      cleanText = cleanText.replace(wordContainingRegex, (match) => '*'.repeat(match.length));
    }
  });

  // Check if message was essentially only profanity/banned words
  const isOnlyProfanity = hasProfanity && (cleanText.replace(/[\s\*!.,?]/g, '').length === 0);

  return {
    cleanText,
    hasProfanity,
    isOnlyProfanity,
    hasSpam,
    hasLink,
    flaggedWords,
  };
}

