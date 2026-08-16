import { RobloxAccountInfo } from '../types';

interface VerifyBioResult {
  verified: boolean;
  currentBio: string;
  message?: string;
  error?: string;
}

const CORS_PROXIES = [
  (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  (targetUrl: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  (targetUrl: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
];

/**
 * Fetch a URL with automatic fallback across multiple CORS proxies if needed.
 */
async function fetchWithCorsFallback(targetUrl: string, options: RequestInit = {}): Promise<Response> {
  // First attempt direct fetch (e.g. if the target supports CORS or on local backend)
  try {
    const directRes = await fetch(targetUrl, options);
    if (directRes.ok) {
      return directRes;
    }
  } catch (err) {
    // Continue to CORS proxies
  }

  // Attempt via CORS proxies
  for (const proxyGenerator of CORS_PROXIES) {
    try {
      const proxiedUrl = proxyGenerator(targetUrl);
      const res = await fetch(proxiedUrl, {
        ...options,
        // Remove bodies for GET requests through some proxies
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      if (res.ok) {
        return res;
      }
    } catch (proxyErr) {
      // Try next proxy
    }
  }

  throw new Error(`Failed to reach ${targetUrl} directly or through proxies.`);
}

/**
 * Robust Roblox user lookup that works everywhere (Cloud Run, Local, GitHub Pages, Custom Domains).
 */
export async function lookupRobloxAccount(username: string): Promise<RobloxAccountInfo> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Please enter a Roblox username.');
  }

  // 1. Try local server API first
  try {
    const localRes = await fetch(`/api/roblox-user?username=${encodeURIComponent(cleanUsername)}`);
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
    // If it's a specific user not found error from server, throw it
    if (localErr?.message && !localErr.message.includes('fetch') && !localErr.message.includes('JSON')) {
      throw localErr;
    }
  }

  // 2. Direct / CORS Proxy Fallback (Guaranteed to work on GitHub Pages / static hosting)
  let robloxUserId: number | null = null;
  let robloxName: string = cleanUsername;
  let robloxDisplayName: string = cleanUsername;

  // Query Roblox Users API: POST https://users.roblox.com/v1/usernames/users
  const lookupPayload = JSON.stringify({
    usernames: [cleanUsername],
    excludeBannedUsers: false
  });

  let foundInApi = false;

  for (const proxyGenerator of CORS_PROXIES) {
    try {
      const proxyUrl = proxyGenerator('https://users.roblox.com/v1/usernames/users');
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: lookupPayload
      });

      if (res.ok) {
        const result = await res.json();
        if (result && Array.isArray(result.data) && result.data.length > 0) {
          const u = result.data[0];
          robloxUserId = u.id;
          robloxName = u.name;
          robloxDisplayName = u.displayName || u.name;
          foundInApi = true;
          break;
        }
      }
    } catch {
      // Continue to next proxy
    }
  }

  if (!foundInApi || !robloxUserId) {
    throw new Error(`Roblox user "${cleanUsername}" was not found. Please verify the exact username.`);
  }

  // Fetch avatar headshot and full avatar
  const defaultHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUserId}&width=150&height=150&format=png`;
  const defaultFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${robloxUserId}&width=420&height=420&format=png`;

  let avatarHeadshot = defaultHeadshot;
  let avatarFull = defaultFull;

  try {
    const thumbUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUserId}&size=150x150&format=Png&isCircular=false`;
    const thumbRes = await fetchWithCorsFallback(thumbUrl);
    const thumbData = await thumbRes.json();
    if (thumbData?.data?.[0]?.imageUrl) {
      avatarHeadshot = thumbData.data[0].imageUrl;
    }
  } catch {
    // Keep default
  }

  return {
    id: robloxUserId,
    name: robloxName,
    displayName: robloxDisplayName,
    avatarHeadshot,
    avatarFull,
    isVerifiedOwner: false
  };
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

  // 2. Direct / CORS Proxy Fallback for static hosting
  const robloxUserUrl = `https://users.roblox.com/v1/users/${userId}?_t=${Date.now()}`;
  
  for (const proxyGenerator of CORS_PROXIES) {
    try {
      const proxyUrl = proxyGenerator(robloxUserUrl);
      const res = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (res.ok) {
        const userData = await res.json();
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
    } catch {
      // Continue to next proxy
    }
  }

  return {
    verified: false,
    currentBio: '',
    error: 'Could not reach Roblox profile to verify bio. Please check your internet connection and try again.'
  };
}
