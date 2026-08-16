import { RobloxAccountInfo } from '../types';

interface VerifyBioResult {
  verified: boolean;
  currentBio: string;
  message?: string;
  error?: string;
}

/**
 * Robust helper to fetch JSON via multiple GET-based CORS proxies.
 * Does not use POST so it avoids CORS preflight failures on static hosts (like bloxvote.com).
 */
async function fetchJsonWithGetProxies(targetUrl: string): Promise<any> {
  // Strategy 1: Direct fetch
  try {
    const directRes = await fetch(targetUrl);
    if (directRes.ok) {
      return await directRes.json();
    }
  } catch {
    // Continue
  }

  // Strategy 2: AllOrigins JSON API (Always responds with CORS headers for GET requests)
  try {
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&_t=${Date.now()}`;
    const res = await fetch(allOriginsUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.contents === 'string') {
        return JSON.parse(data.contents);
      }
    }
  } catch {
    // Continue
  }

  // Strategy 3: CodeTabs Proxy
  try {
    const codeTabsUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(codeTabsUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Continue
  }

  // Strategy 4: Corsproxy.io
  try {
    const corsProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Continue
  }

  throw new Error('Unable to reach Roblox API via proxies.');
}

/**
 * Robust Roblox user lookup that works everywhere (Cloud Run, Local, GitHub Pages, Custom Domains).
 */
export async function lookupRobloxAccount(input: string): Promise<RobloxAccountInfo> {
  const cleanInput = input.trim();
  if (!cleanInput) {
    throw new Error('Please enter a Roblox username or User ID.');
  }

  // 1. Try local server API first if available
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

  // Check if input is a profile URL (e.g. roblox.com/users/4320852390/profile) or direct numeric ID
  const urlMatch = cleanInput.match(/roblox\.com\/users\/(\d+)/i);
  const numericId = urlMatch ? parseInt(urlMatch[1], 10) : (/^\d+$/.test(cleanInput) ? parseInt(cleanInput, 10) : null);

  if (numericId) {
    // Lookup by User ID via GET https://users.roblox.com/v1/users/{numericId}
    try {
      const userData = await fetchJsonWithGetProxies(`https://users.roblox.com/v1/users/${numericId}`);
      if (userData && (userData.name || userData.id)) {
        const defaultHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${userData.id}&width=420&height=420&format=png`;
        const defaultFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${userData.id}&width=420&height=420&format=png`;
        return {
          id: userData.id,
          name: userData.name,
          displayName: userData.displayName || userData.name,
          avatarHeadshot: defaultHeadshot,
          avatarFull: defaultFull,
          isVerifiedOwner: false
        };
      }
    } catch {
      // If proxy fails, we can still construct a valid profile using the ID!
      const defaultHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${numericId}&width=420&height=420&format=png`;
      const defaultFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${numericId}&width=420&height=420&format=png`;
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

  // 2. Search Roblox User by username using GET https://users.roblox.com/v1/users/search?keyword=...
  const searchUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanInput)}&limit=10`;
  
  try {
    const searchData = await fetchJsonWithGetProxies(searchUrl);
    if (searchData && Array.isArray(searchData.data) && searchData.data.length > 0) {
      // Find exact case-insensitive match or first item
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

  // 1. Try local server API first
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
    // Continue to proxy fallback
  }

  // 2. Direct / GET Proxy Fallback for static hosting
  const robloxUserUrl = `https://users.roblox.com/v1/users/${userId}`;
  
  try {
    const userData = await fetchJsonWithGetProxies(robloxUserUrl);
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
