import { RobloxAccountInfo } from '../types';

interface VerifyBioResult {
  verified: boolean;
  currentBio: string;
  message?: string;
  error?: string;
}

/**
 * Check if running on a static hosting environment (like GitHub Pages or custom domain bloxvote.com)
 * to avoid unnecessary 404 console errors from /api routes.
 */
function isStaticHosting(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.includes('bloxvote.com') ||
    host.endsWith('github.io') ||
    host.endsWith('pages.dev') ||
    host.endsWith('netlify.app') ||
    host.endsWith('vercel.app')
  );
}

/**
 * Helper to fetch JSON across resilient endpoints and CORS proxies.
 */
async function fetchWithResilientFallbacks(urls: string[]): Promise<any> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' }
      });
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
      // Fetch error, try next url
    }
  }
  throw new Error('All connection strategies exhausted.');
}

/**
 * Search Roblox players matching or close to the search query.
 * Returns a list of players with avatar thumbnails, usernames, display names, and IDs.
 */
export async function searchRobloxUsers(query: string): Promise<RobloxAccountInfo[]> {
  const cleanInput = query.trim();
  if (!cleanInput) {
    return [];
  }

  const results: RobloxAccountInfo[] = [];
  const seenIds = new Set<number>();

  // Helper to add player cleanly
  const addPlayer = (id: number, name: string, displayName?: string, isVerifiedBadge?: boolean) => {
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    results.push({
      id,
      name: name || `User_${id}`,
      displayName: displayName || name || `User #${id}`,
      avatarHeadshot: `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=420&height=420&format=png`,
      avatarFull: `https://www.roblox.com/avatar-thumbnail/image?userId=${id}&width=420&height=420&format=png`,
      hasVerifiedBadge: Boolean(isVerifiedBadge),
      isVerifiedOwner: false
    });
  };

  // 1. If query is numeric ID or profile URL, fetch that exact user first
  const urlMatch = cleanInput.match(/roblox\.com\/users\/(\d+)/i);
  const numericId = urlMatch ? parseInt(urlMatch[1], 10) : (/^\d+$/.test(cleanInput) ? parseInt(cleanInput, 10) : null);

  if (numericId) {
    try {
      const userData = await fetchWithResilientFallbacks([
        `https://users.roproxy.com/v1/users/${numericId}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`
      ]);

      if (userData && (userData.name || userData.id)) {
        addPlayer(userData.id || numericId, userData.name, userData.displayName, userData.hasVerifiedBadge);
        return results;
      }
    } catch {
      addPlayer(numericId, `User_${numericId}`, `User #${numericId}`);
      return results;
    }
  }

  // 2. Try exact username match first (prioritize exact match at top)
  try {
    const postRes = await fetch('https://users.roproxy.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        usernames: [cleanInput],
        excludeBannedUsers: false
      })
    });

    if (postRes.ok) {
      const result = await postRes.json();
      if (result && Array.isArray(result.data)) {
        for (const u of result.data) {
          if (u.id) addPlayer(u.id, u.name, u.displayName, u.hasVerifiedBadge);
        }
      }
    }
  } catch {
    // Continue to fuzzy search
  }

  // 3. Search multi-player endpoint for all players close to or with that username
  try {
    const searchData = await fetchWithResilientFallbacks([
      `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=20`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=20`)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=20`)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=20`)}`
    ]);

    if (searchData && Array.isArray(searchData.data)) {
      for (const u of searchData.data) {
        if (u.id) {
          addPlayer(u.id, u.name, u.displayName, u.hasVerifiedBadge);
        }
      }
    }
  } catch (searchErr) {
    console.warn('Roblox player search warning:', searchErr);
  }

  // 4. If no results found yet and not on static hosting, try server route
  if (results.length === 0 && !isStaticHosting()) {
    try {
      const localRes = await fetch(`/api/roblox-user?username=${encodeURIComponent(cleanInput)}`);
      if (localRes.ok) {
        const data = await localRes.json();
        if (data.success && data.user) {
          addPlayer(data.user.id, data.user.name, data.user.displayName, data.user.hasVerifiedBadge);
        }
      }
    } catch {
      // ignore
    }
  }

  return results;
}

/**
 * Robust Roblox user lookup that works everywhere (Cloud Run, Local, GitHub Pages, bloxvote.com).
 */
export async function lookupRobloxAccount(input: string): Promise<RobloxAccountInfo> {
  const cleanInput = input.trim();
  if (!cleanInput) {
    throw new Error('Please enter a Roblox username or User ID.');
  }

  const players = await searchRobloxUsers(cleanInput);
  if (players.length > 0) {
    // Find exact match or return first player
    const exact = players.find(
      p => p.name.toLowerCase() === cleanInput.toLowerCase() || p.displayName.toLowerCase() === cleanInput.toLowerCase()
    );
    return exact || players[0];
  }

  throw new Error(`Roblox user "${cleanInput}" was not found. Please verify the exact username or enter your numeric Roblox User ID.`);
}

/**
 * Robust Roblox Bio verification that verifies the code exists in the live Roblox bio.
 * Works seamlessly on Cloud Run, Local Dev, and static hosts (GitHub Pages, bloxvote.com).
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

  // 1. Try local server API first if not on static hosting
  if (!isStaticHosting()) {
    try {
      const localRes = await fetch('/api/verify-roblox-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: cleanCode })
      });
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
  }

  // 2. Fetch user profile description via RoProxy and CORS proxies
  try {
    const userData = await fetchWithResilientFallbacks([
      `https://users.roproxy.com/v1/users/${userId}?_t=${Date.now()}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://users.roblox.com/v1/users/${userId}?_t=${Date.now()}`)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${userId}?_t=${Date.now()}`)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${userId}`)}`
    ]);

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

