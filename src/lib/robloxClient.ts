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
 * Robust Roblox user lookup that works everywhere (Cloud Run, Local, GitHub Pages, bloxvote.com).
 */
export async function lookupRobloxAccount(input: string): Promise<RobloxAccountInfo> {
  const cleanInput = input.trim();
  if (!cleanInput) {
    throw new Error('Please enter a Roblox username or User ID.');
  }

  // 1. Try local server API first (only if on local dev or Cloud Run backend)
  if (!isStaticHosting()) {
    try {
      const localRes = await fetch(`/api/roblox-user?username=${encodeURIComponent(cleanInput)}`);
      const contentType = localRes.headers.get('content-type') || '';
      if (localRes.ok && contentType.includes('application/json')) {
        const data = await localRes.json();
        if (data.success && data.user) {
          return data.user;
        }
        if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (localErr: any) {
      if (localErr?.message && !localErr.message.includes('fetch') && !localErr.message.includes('JSON')) {
        throw localErr;
      }
    }
  }

  // 2. Check if input is a direct numeric ID or profile URL (e.g. roblox.com/users/4320852390/profile)
  const urlMatch = cleanInput.match(/roblox\.com\/users\/(\d+)/i);
  const numericId = urlMatch ? parseInt(urlMatch[1], 10) : (/^\d+$/.test(cleanInput) ? parseInt(cleanInput, 10) : null);

  if (numericId) {
    const defaultHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${numericId}&width=420&height=420&format=png`;
    const defaultFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${numericId}&width=420&height=420&format=png`;

    try {
      const userData = await fetchWithResilientFallbacks([
        `https://users.roproxy.com/v1/users/${numericId}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(`https://users.roblox.com/v1/users/${numericId}`)}`
      ]);

      if (userData && (userData.name || userData.id)) {
        return {
          id: userData.id || numericId,
          name: userData.name || `User_${numericId}`,
          displayName: userData.displayName || userData.name || `User #${numericId}`,
          avatarHeadshot: defaultHeadshot,
          avatarFull: defaultFull,
          isVerifiedOwner: false
        };
      }
    } catch {
      // Fallback with standard direct avatar thumbnail URL
      return {
        id: numericId,
        name: `User_${numericId}`,
        displayName: `User #${numericId}`,
        avatarHeadshot: defaultHeadshot,
        avatarFull: defaultFull,
        isVerifiedOwner: false
      };
    }
  }

  // 3. Username Lookup via RoProxy Users API (Native CORS enabled for web apps)
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
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        const u = result.data[0];
        const defaultHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${u.id}&width=420&height=420&format=png`;
        const defaultFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${u.id}&width=420&height=420&format=png`;

        return {
          id: u.id,
          name: u.name,
          displayName: u.displayName || u.name,
          avatarHeadshot: defaultHeadshot,
          avatarFull: defaultFull,
          isVerifiedOwner: false
        };
      }
    }
  } catch {
    // Continue to next search strategy
  }

  // 4. Search fallback via GET search endpoints
  try {
    const searchData = await fetchWithResilientFallbacks([
      `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=10`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=10`)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=10`)}`
    ]);

    if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
      const exactMatch = searchData.data.find(
        (u: any) => u.name?.toLowerCase() === cleanInput.toLowerCase() || u.displayName?.toLowerCase() === cleanInput.toLowerCase()
      ) || searchData.data[0];

      if (exactMatch && exactMatch.id) {
        const defaultHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${exactMatch.id}&width=420&height=420&format=png`;
        const defaultFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${exactMatch.id}&width=420&height=420&format=png`;

        return {
          id: exactMatch.id,
          name: exactMatch.name,
          displayName: exactMatch.displayName || exactMatch.name,
          avatarHeadshot: defaultHeadshot,
          avatarFull: defaultFull,
          isVerifiedOwner: false
        };
      }
    }
  } catch (searchErr) {
    console.warn('Roblox search notice:', searchErr);
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
