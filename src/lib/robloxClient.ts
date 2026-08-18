import { RobloxAccountInfo } from '../types';

interface VerifyBioResult {
  verified: boolean;
  currentBio: string;
  message?: string;
  error?: string;
}

/**
 * Fetch with strict AbortController timeout to prevent hanging requests.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper to fetch JSON across resilient endpoints and CORS proxies with strict timeouts.
 */
async function fetchWithResilientFallbacks(urls: string[], timeoutMs = 2500): Promise<any> {
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: { Accept: 'application/json' }
      }, timeoutMs);

      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          // Check if it's AllOrigins wrapper
          if (parsed && typeof parsed.contents === 'string') {
            return JSON.parse(parsed.contents);
          }
          return parsed;
        } catch {
          // JSON parse failed, try next
        }
      }
    } catch {
      // Timeout or network error, proceed quickly to next
    }
  }
  throw new Error('All connection strategies exhausted.');
}

/**
 * Search Roblox players matching or close to the search query.
 * Fast, reliable, and uses parallel strategies with limit=10.
 */
export async function searchRobloxUsers(query: string): Promise<RobloxAccountInfo[]> {
  const cleanInput = query.trim();
  if (!cleanInput) {
    return [];
  }

  const cleanUsername = cleanInput.replace(/^@/, '').trim();
  const lowerQuery = cleanUsername.toLowerCase();
  const results: RobloxAccountInfo[] = [];
  const seenIds = new Set<number>();

  const addPlayer = (id: number, name: string, displayName?: string, isVerifiedBadge?: boolean) => {
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    results.push({
      id,
      name: name || `User_${id}`,
      displayName: displayName || name || `User #${id}`,
      avatarHeadshot: `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=150&height=150&format=png`,
      avatarFull: `https://www.roblox.com/avatar-thumbnail/image?userId=${id}&width=420&height=420&format=png`,
      hasVerifiedBadge: Boolean(isVerifiedBadge),
      isVerifiedOwner: false
    });
  };

  // Special case for famous keyword "roblox"
  if (lowerQuery === 'roblox') {
    addPlayer(1, 'Roblox', 'Roblox', true);
  }

  // If numeric ID or profile URL, resolve directly
  const urlMatch = cleanInput.match(/roblox\.com\/users\/(\d+)/i);
  const numericId = urlMatch ? parseInt(urlMatch[1], 10) : (/^\d+$/.test(cleanInput) ? parseInt(cleanInput, 10) : null);

  if (numericId) {
    try {
      const userData = await fetchWithResilientFallbacks([
        `https://users.roproxy.com/v1/users/${numericId}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`
      ], 2000);

      if (userData && (userData.name || userData.id)) {
        addPlayer(userData.id || numericId, userData.name, userData.displayName, userData.hasVerifiedBadge);
        return results;
      }
    } catch {
      addPlayer(numericId, `User_${numericId}`, `User #${numericId}`);
      return results;
    }
  }

  // 1. Primary Strategy: Try backend endpoint first
  try {
    const apiRes = await fetchWithTimeout(`/api/roblox/search-users?keyword=${encodeURIComponent(cleanUsername)}`, {}, 2500);
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        for (const item of json.data) {
          if (item.id) addPlayer(item.id, item.name, item.displayName, item.hasVerifiedBadge);
        }
        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch {
    // Continue to proxy strategy
  }

  // 2. Secondary Strategy: Multi-Proxy parallel query with valid limit=10
  const searchUrls = [
    `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(cleanUsername)}&limit=10`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanUsername)}&limit=10`)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanUsername)}&limit=10`)}`
  ];

  await Promise.allSettled(
    searchUrls.map(async (url) => {
      try {
        const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 3000);
        if (!res.ok) return;
        const text = await res.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
          if (parsed && typeof parsed.contents === 'string') {
            parsed = JSON.parse(parsed.contents);
          }
        } catch {
          return;
        }

        if (parsed && Array.isArray(parsed.data)) {
          for (const u of parsed.data) {
            if (u.id) {
              addPlayer(u.id, u.name, u.displayName, u.hasVerifiedBadge);
            }
          }
        }
      } catch {}
    })
  );

  // Sort exact match to top if present
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQuery || a.displayName.toLowerCase() === lowerQuery;
    const bExact = b.name.toLowerCase() === lowerQuery || b.displayName.toLowerCase() === lowerQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  return results;
}

/**
 * Robust Roblox user lookup that works everywhere.
 */
export async function lookupRobloxAccount(input: string): Promise<RobloxAccountInfo> {
  const cleanInput = input.trim();
  if (!cleanInput) {
    throw new Error('Please enter a Roblox username or User ID.');
  }

  const players = await searchRobloxUsers(cleanInput);
  if (players.length > 0) {
    const exact = players.find(
      p => p.name.toLowerCase() === cleanInput.toLowerCase() || p.displayName.toLowerCase() === cleanInput.toLowerCase()
    );
    return exact || players[0];
  }

  throw new Error(`Roblox user "${cleanInput}" was not found. Please verify the exact username or enter your numeric Roblox User ID.`);
}

/**
 * Robust Roblox Bio verification that verifies the code exists in the live Roblox bio.
 */
export async function verifyRobloxBioOwnership(userId: number, code: string): Promise<VerifyBioResult> {
  const cleanCode = code.trim();
  if (!cleanCode) {
    return {
      verified: false,
      currentBio: '',
      error: 'Verification code is required.'
    };
  }

  // 1. Try local server API first
  try {
    const localRes = await fetchWithTimeout('/api/verify-roblox-bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code: cleanCode })
    }, 4000);

    const contentType = localRes.headers.get('content-type') || '';
    if (localRes.ok && contentType.includes('application/json')) {
      const data = await localRes.json();
      return {
        verified: Boolean(data.verified),
        currentBio: data.currentBio || '',
        message: data.message,
        error: data.error
      };
    }
  } catch {
    // Continue to client proxy fallback
  }

  // 2. Client-side fallback via CORS proxies
  try {
    const userData = await fetchWithResilientFallbacks([
      `https://users.roproxy.com/v1/users/${userId}?_t=${Date.now()}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${userId}?_t=${Date.now()}`)}`
    ], 3000);

    if (userData) {
      const liveBio = userData.description || '';
      const cleanBio = liveBio.replace(/\s+/g, ' ').trim();
      const isVerified = cleanBio.toLowerCase().includes(cleanCode.toLowerCase());

      return {
        verified: isVerified,
        currentBio: liveBio,
        message: isVerified
          ? 'Roblox account ownership verified successfully!'
          : `Code "${cleanCode}" was not found in your Roblox "About" section yet.`
      };
    }
  } catch (err: any) {
    console.warn('Bio verification fallback notice:', err);
  }

  return {
    verified: false,
    currentBio: '',
    error: 'Could not reach Roblox profile to verify bio. Please check your internet connection or verify your username/ID and try again.'
  };
}

