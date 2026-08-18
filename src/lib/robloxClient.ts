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
 * Fast, reliable, and uses backend search endpoint with caching.
 */
export async function searchRobloxUsers(query: string): Promise<RobloxAccountInfo[]> {
  const cleanInput = query.trim();
  if (!cleanInput) {
    return [];
  }

  // 1. Primary Strategy: Call our high-speed Node server endpoint (/api/roblox/search-users)
  try {
    const apiRes = await fetchWithTimeout(`/api/roblox/search-users?keyword=${encodeURIComponent(cleanInput)}`, {}, 4000);
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (apiErr) {
    // Continue to fallback
  }

  // 2. Secondary Strategy: If local /api/roblox-user is available
  try {
    const localRes = await fetchWithTimeout(`/api/roblox-user?username=${encodeURIComponent(cleanInput)}`, {}, 3000);
    if (localRes.ok) {
      const data = await localRes.json();
      if (data.success && data.user) {
        return [{
          id: data.user.id,
          name: data.user.name,
          displayName: data.user.displayName,
          avatarHeadshot: data.user.avatarHeadshot || `https://www.roblox.com/headshot-thumbnail/image?userId=${data.user.id}&width=150&height=150&format=png`,
          avatarFull: data.user.avatarFull || `https://www.roblox.com/avatar-thumbnail/image?userId=${data.user.id}&width=420&height=420&format=png`,
          hasVerifiedBadge: Boolean(data.user.hasVerifiedBadge),
          isVerifiedOwner: false
        }];
      }
    }
  } catch {
    // Continue to client proxy fallback
  }

  // 3. Fallback Strategy: Client-side proxies with strict short timeouts
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

  try {
    const searchData = await fetchWithResilientFallbacks([
      `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=20`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=20`)}`
    ], 2500);

    if (searchData && Array.isArray(searchData.data)) {
      for (const u of searchData.data) {
        if (u.id) {
          addPlayer(u.id, u.name, u.displayName, u.hasVerifiedBadge);
        }
      }
    }
  } catch (searchErr) {
    // If all else fails, return whatever we have
  }

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

