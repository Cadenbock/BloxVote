import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// In-memory cache for PKCE OAuth states
const oauthStates = new Map<string, { codeVerifier: string; clientId: string; createdAt: number }>();

// Clean up stale states (> 15 minutes) periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.createdAt > 15 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // API Route: Fetch Roblox game info from URL or place ID
  app.get('/api/roblox-info', async (req, res) => {
    try {
      const urlParam = req.query.url as string;
      if (!urlParam) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      const match = urlParam.match(/games\/(\d+)/i);
      if (!match) {
        return res.status(400).json({ error: 'Invalid Roblox URL format. Must contain /games/PLACE_ID' });
      }

      const placeId = match[1];

      // Fetch universe ID from place ID
      const universeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
      if (!universeRes.ok) {
        throw new Error(`Failed to fetch universe ID from Roblox API: ${universeRes.statusText}`);
      }

      const universeData = await universeRes.json() as any;
      const universeId = universeData?.universeId;
      if (!universeId) {
        throw new Error(`Could not resolve a universe ID for place ID ${placeId}`);
      }

      // Fetch game details from universe ID
      const gamesRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
      if (!gamesRes.ok) {
        throw new Error(`Failed to fetch game details from Roblox API: ${gamesRes.statusText}`);
      }

      const gamesData = await gamesRes.json() as any;
      if (!gamesData?.data || gamesData.data.length === 0) {
        throw new Error(`No game details found for universe ID ${universeId}`);
      }

      const details = gamesData.data[0];
      const name = details.name || '';
      const description = details.description || '';
      const creator = details.creator?.name || '';
      const creatorId = details.creator?.id || null;
      const creatorType = details.creator?.type || null;

      // Now fetch game icon thumbnail if universeId exists
      let imageUrl = '';
      if (universeId) {
        const thumbRes = await fetch(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
        );
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json() as any;
          if (thumbData?.data?.length > 0) {
            imageUrl = thumbData.data[0].imageUrl;
          }
        }
      }

      // Fallback to asset-thumbnail if not found
      if (!imageUrl) {
        imageUrl = `https://www.roblox.com/asset-thumbnail/image?assetId=${placeId}&width=420&height=420&format=png`;
      }

      return res.json({
        name,
        creator,
        creatorId,
        creatorType,
        description,
        imageUrl,
        success: true
      });
    } catch (error: any) {
      console.error('Error fetching Roblox info:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // In-memory cache for Roblox player searches (5 min TTL)
  const playerSearchCache = new Map<string, { data: any[]; timestamp: number }>();

  // API Route: High-Speed Roblox Player Search (Exact match + keyword fuzzy search + thumbnail batching)
  app.get(['/api/roblox/search-users', '/api/roblox-search'], async (req, res) => {
    try {
      const keyword = (req.query.keyword as string || req.query.query as string || req.query.q as string || '').trim();
      if (!keyword) {
        return res.json({ success: true, data: [] });
      }

      const cacheKey = keyword.toLowerCase();
      const cached = playerSearchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return res.json({ success: true, data: cached.data });
      }

      const results: any[] = [];
      const seenIds = new Set<number>();

      const addPlayer = (id: number, name: string, displayName?: string, hasVerifiedBadge?: boolean) => {
        if (!id || seenIds.has(id)) return;
        seenIds.add(id);
        results.push({
          id,
          name: name || `User_${id}`,
          displayName: displayName || name || `User #${id}`,
          avatarHeadshot: `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=150&height=150&format=png`,
          avatarFull: `https://www.roblox.com/avatar-thumbnail/image?userId=${id}&width=420&height=420&format=png`,
          hasVerifiedBadge: Boolean(hasVerifiedBadge),
          isVerifiedOwner: false
        });
      };

      // 1. If query is numeric ID or profile URL, fetch that exact user
      const urlMatch = keyword.match(/roblox\.com\/users\/(\d+)/i);
      const numericId = urlMatch ? parseInt(urlMatch[1], 10) : (/^\d+$/.test(keyword) ? parseInt(keyword, 10) : null);

      if (numericId) {
        try {
          const userRes = await fetch(`https://users.roblox.com/v1/users/${numericId}`);
          if (userRes.ok) {
            const user = await userRes.json() as any;
            addPlayer(user.id || numericId, user.name, user.displayName, user.hasVerifiedBadge);
          } else {
            addPlayer(numericId, `User_${numericId}`, `User #${numericId}`);
          }
        } catch {
          addPlayer(numericId, `User_${numericId}`, `User #${numericId}`);
        }
      }

      // 2. Perform exact username lookup + fuzzy keyword search in parallel
      const cleanUsername = keyword.replace(/^@/, '');
      const [exactRes, searchRes] = await Promise.allSettled([
        fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernames: [cleanUsername],
            excludeBannedUsers: false
          })
        }),
        fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(cleanUsername)}&limit=20`)
      ]);

      if (exactRes.status === 'fulfilled' && exactRes.value.ok) {
        try {
          const exactData = await exactRes.value.json() as any;
          if (exactData && Array.isArray(exactData.data)) {
            for (const u of exactData.data) {
              if (u.id) addPlayer(u.id, u.name, u.displayName, u.hasVerifiedBadge);
            }
          }
        } catch {}
      }

      if (searchRes.status === 'fulfilled' && searchRes.value.ok) {
        try {
          const searchData = await searchRes.value.json() as any;
          if (searchData && Array.isArray(searchData.data)) {
            for (const u of searchData.data) {
              if (u.id) addPlayer(u.id, u.name, u.displayName, u.hasVerifiedBadge);
            }
          }
        } catch {}
      }

      // Fetch avatar headshots for top 20 players in batch
      if (results.length > 0) {
        const topIds = results.slice(0, 20).map(r => r.id);
        try {
          const thumbRes = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${topIds.join(',')}&size=150x150&format=Png&isCircular=false`
          );
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json() as any;
            if (thumbData?.data && Array.isArray(thumbData.data)) {
              const map = new Map<number, string>();
              for (const item of thumbData.data) {
                if (item.targetId && item.imageUrl) {
                  map.set(item.targetId, item.imageUrl);
                }
              }
              for (const r of results) {
                if (map.has(r.id)) {
                  r.avatarHeadshot = map.get(r.id)!;
                }
              }
            }
          }
        } catch {}
      }

      // Cache results
      playerSearchCache.set(cacheKey, { data: results, timestamp: Date.now() });

      return res.json({ success: true, data: results });
    } catch (error: any) {
      console.error('Error searching Roblox users:', error);
      return res.status(500).json({ error: error.message || 'Internal server error while searching Roblox users' });
    }
  });

  // API Route: Fetch Roblox User Profile and Avatars (Headshot + Full 3D render)
  app.get('/api/roblox-user', async (req, res) => {
    try {
      const usernameParam = (req.query.username as string || '').trim();
      const userIdParam = (req.query.userId as string || '').trim();

      if (!usernameParam && !userIdParam) {
        return res.status(400).json({ error: 'Missing username or userId query parameter' });
      }

      let userId: number | null = null;
      let rawName = '';
      let rawDisplayName = '';

      if (userIdParam && /^\d+$/.test(userIdParam)) {
        userId = parseInt(userIdParam, 10);
      } else if (usernameParam) {
        // If user typed a Roblox profile URL (e.g. https://www.roblox.com/users/12345/profile)
        const profileMatch = usernameParam.match(/roblox\.com\/users\/(\d+)/i);
        if (profileMatch) {
          userId = parseInt(profileMatch[1], 10);
        } else {
          // Clean username (remove leading @ if present)
          const cleanUsername = usernameParam.replace(/^@/, '');
          const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usernames: [cleanUsername],
              excludeBannedUsers: false
            })
          });

          if (!lookupRes.ok) {
            throw new Error(`Roblox user search failed: ${lookupRes.statusText}`);
          }

          const lookupData = await lookupRes.json() as any;
          if (!lookupData?.data || lookupData.data.length === 0) {
            return res.status(404).json({ error: `Roblox user "${cleanUsername}" was not found.` });
          }

          const foundUser = lookupData.data[0];
          userId = foundUser.id;
          rawName = foundUser.name;
          rawDisplayName = foundUser.displayName;
        }
      }

      if (!userId) {
        return res.status(400).json({ error: 'Could not resolve Roblox User ID.' });
      }

      // Fetch user profile details (bio, join date, verified badge)
      const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      let userDetails: any = {};
      if (userRes.ok) {
        userDetails = await userRes.json();
      }

      const name = userDetails.name || rawName || `User_${userId}`;
      const displayName = userDetails.displayName || rawDisplayName || name;
      const description = userDetails.description || '';
      const created = userDetails.created || '';
      const isBanned = !!userDetails.isBanned;
      const hasVerifiedBadge = !!userDetails.hasVerifiedBadge;

      // Fetch avatar headshot and full avatar thumbnail in parallel
      let avatarHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;
      let avatarFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;

      try {
        const [headshotRes, fullRes] = await Promise.all([
          fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`),
          fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`)
        ]);

        if (headshotRes.ok) {
          const headshotData = await headshotRes.json() as any;
          if (headshotData?.data?.[0]?.imageUrl) {
            avatarHeadshot = headshotData.data[0].imageUrl;
          }
        }

        if (fullRes.ok) {
          const fullData = await fullRes.json() as any;
          if (fullData?.data?.[0]?.imageUrl) {
            avatarFull = fullData.data[0].imageUrl;
          }
        }
      } catch (thumbErr) {
        console.warn('Could not fetch Roblox avatar thumbnails from API, using fallback:', thumbErr);
      }

      return res.json({
        success: true,
        user: {
          id: userId,
          name,
          displayName,
          description,
          created,
          isBanned,
          hasVerifiedBadge,
          avatarHeadshot,
          avatarFull,
          profileUrl: `https://www.roblox.com/users/${userId}/profile`
        }
      });
    } catch (error: any) {
      console.error('Error fetching Roblox user info:', error);
      return res.status(500).json({ error: error.message || 'Internal server error while fetching Roblox user' });
    }
  });

  // API Route: Verify verification code in Roblox user's Bio / About Me
  const verifyBioHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ error: 'Missing userId or verification code' });
      }

      // Query Roblox user API with cache buster header and query param
      const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!userRes.ok) {
        return res.status(404).json({ error: 'Could not fetch Roblox profile to verify' });
      }

      const userDetails = await userRes.json() as any;
      const description = userDetails.description || '';
      const cleanCode = String(code).trim().toUpperCase();

      const isVerified = description.toUpperCase().includes(cleanCode);

      return res.json({
        success: true,
        verified: isVerified,
        currentBio: description,
        message: isVerified
          ? 'Roblox account ownership successfully verified!'
          : `Code "${cleanCode}" was not found in your Roblox "About" section yet.`
      });
    } catch (error: any) {
      console.error('Error verifying Roblox bio:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };

  app.post('/api/verify-roblox-bio', verifyBioHandler);
  app.post('/api/roblox-verify-bio', verifyBioHandler);

  // API Route: Check Roblox OAuth configuration and get official authorize.roblox.com sign-in URL
  app.get('/api/roblox/oauth/config', (req, res) => {
    const defaultClientId = process.env.ROBLOX_CLIENT_ID || '6105930285419261461';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/roblox/oauth/callback`;

    return res.json({
      hasOAuthConfig: Boolean(process.env.ROBLOX_CLIENT_ID),
      clientId: defaultClientId,
      redirectUri,
      authorizeEndpoint: '/api/roblox/oauth/authorize'
    });
  });

  // API Route: Initiate Official Roblox OAuth 2.0 Authorization on authorize.roblox.com
  app.get('/api/roblox/oauth/authorize', (req, res) => {
    const clientId = (req.query.client_id as string) || process.env.ROBLOX_CLIENT_ID || '6105930285419261461';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/roblox/oauth/callback`;

    // Generate PKCE code verifier and S256 code challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('base64url');

    // Store state in-memory for the callback exchange
    oauthStates.set(state, {
      codeVerifier,
      clientId,
      createdAt: Date.now()
    });

    const robloxAuthUrl = `https://authorize.roblox.com/?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20user.social%3Aread&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&step=accountConfirm`;
    
    return res.redirect(robloxAuthUrl);
  });

  // API Route: Roblox OAuth 2.0 Callback
  app.get('/api/roblox/oauth/callback', async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;
    const errorDesc = req.query.error_description as string;

    if (error || !code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Roblox Sign-In Error</title></head>
          <body style="background:#09090b;color:#f43f5e;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;padding:24px;text-align:center;">
            <div style="background:#18181b;border:1px solid #27272a;padding:32px;border-radius:16px;max-width:480px;">
              <h2 style="margin:0 0 12px 0;color:#ef4444;font-size:20px;">Roblox Authorization Notice</h2>
              <p style="margin:0 0 16px 0;color:#a1a1aa;font-size:14px;line-height:1.5;">${errorDesc || error || 'Authorization was cancelled or encountered an error on Roblox.'}</p>
              <button onclick="window.close()" style="background:#27272a;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;cursor:pointer;">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'ROBLOX_OAUTH_ERROR', error: '${error || "Authorization cancelled"}' }, '*');
                setTimeout(() => window.close(), 3000);
              }
            </script>
          </body>
        </html>
      `);
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/api/roblox/oauth/callback`;

    const storedState = state ? oauthStates.get(state) : null;
    const clientId = storedState?.clientId || process.env.ROBLOX_CLIENT_ID || '6105930285419261461';
    const codeVerifier = storedState?.codeVerifier;
    const clientSecret = process.env.ROBLOX_CLIENT_SECRET;

    if (state) {
      oauthStates.delete(state);
    }

    try {
      // Exchange code for tokens at Roblox token endpoint
      const bodyParams: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri
      };

      if (codeVerifier) {
        bodyParams.code_verifier = codeVerifier;
      }
      if (clientSecret) {
        bodyParams.client_secret = clientSecret;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      if (clientSecret) {
        headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
      }

      const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
        method: 'POST',
        headers,
        body: new URLSearchParams(bodyParams).toString()
      });

      if (!tokenRes.ok) {
        const tokenErr = await tokenRes.text();
        throw new Error(`Failed to exchange token: ${tokenErr}`);
      }

      const tokenData = await tokenRes.json() as any;
      const accessToken = tokenData.access_token;

      // Fetch user profile from OpenID Connect UserInfo endpoint
      const userinfoRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!userinfoRes.ok) {
        throw new Error('Failed to fetch user profile from Roblox');
      }

      const userinfo = await userinfoRes.json() as any;
      const userId = parseInt(userinfo.sub, 10);
      const name = userinfo.preferred_username || userinfo.name || `User_${userId}`;
      const displayName = userinfo.nickname || userinfo.name || name;

      let avatarHeadshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;
      let avatarFull = `https://www.roblox.com/avatar-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;

      try {
        const [headshotRes, fullRes] = await Promise.all([
          fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`),
          fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`)
        ]);

        if (headshotRes.ok) {
          const headshotData = await headshotRes.json() as any;
          if (headshotData?.data?.[0]?.imageUrl) {
            avatarHeadshot = headshotData.data[0].imageUrl;
          }
        }

        if (fullRes.ok) {
          const fullData = await fullRes.json() as any;
          if (fullData?.data?.[0]?.imageUrl) {
            avatarFull = fullData.data[0].imageUrl;
          }
        }
      } catch (thumbErr) {
        console.warn('Could not fetch Roblox avatar thumbnails:', thumbErr);
      }

      const robloxAccount = {
        id: userId,
        name,
        displayName,
        avatarHeadshot,
        avatarFull,
        profileUrl: `https://www.roblox.com/users/${userId}/profile`,
        isVerifiedOwner: true
      };

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Roblox Sign-In Successful</title>
            <style>
              body { background: #09090b; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
              .card { background: #18181b; border: 1px solid #27272a; padding: 32px; border-radius: 20px; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
              .avatar { width: 80px; height: 80px; border-radius: 20px; border: 2px solid #ef4444; margin-bottom: 16px; object-fit: cover; }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="${avatarHeadshot}" class="avatar" alt="${name}" />
              <h2 style="margin: 0 0 8px 0; font-size: 20px;">Authenticated as ${displayName}</h2>
              <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Completing sign-in and redirecting...</p>
            </div>
            <script>
              const userData = ${JSON.stringify(robloxAccount)};
              if (window.opener) {
                window.opener.postMessage({ type: 'ROBLOX_OAUTH_SUCCESS', user: userData }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Roblox OAuth callback error:', err);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Roblox Sign-In</title></head>
          <body style="background:#09090b;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;padding:24px;text-align:center;">
            <div style="background:#18181b;border:1px solid #27272a;padding:32px;border-radius:16px;max-width:480px;">
              <h3 style="margin:0 0 8px 0;color:#ef4444;">Roblox Token Exchange</h3>
              <p style="margin:0 0 16px 0;color:#a1a1aa;font-size:13px;line-height:1.5;">${err.message || 'Error communicating with Roblox OAuth API.'}</p>
              <button onclick="window.close()" style="background:#393b44;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;">Return to App</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'ROBLOX_OAUTH_ERROR', error: '${err.message || "Failed"}' }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  // Dedicated Privacy Policy Route (Required for OAuth 2.0 apps)
  app.get('/privacy', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Privacy Policy - BloxVote</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; line-height: 1.6; margin: 0; padding: 40px 20px; }
            .container { max-width: 760px; margin: 0 auto; background: #121318; padding: 40px; border-radius: 16px; border: 1px solid #27272a; }
            h1 { color: #fff; font-size: 28px; margin-top: 0; }
            h2 { color: #e4e4e7; font-size: 18px; margin-top: 28px; border-bottom: 1px solid #27272a; padding-bottom: 8px; }
            p, li { color: #a1a1aa; font-size: 14px; }
            a { color: #3b82f6; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .badge { display: inline-block; background: #27272a; color: #a1a1aa; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">BloxVote Legal</div>
            <h1>Privacy Policy</h1>
            <p><strong>Effective Date:</strong> January 1, 2026</p>
            
            <h2>1. Information We Collect</h2>
            <p>When you use BloxVote and authenticate with Roblox OpenID Connect (OAuth 2.0), we only receive public profile information authorized by you:</p>
            <ul>
              <li>Roblox User ID and Username</li>
              <li>Roblox Display Name</li>
              <li>Roblox Avatar Headshot & Thumbnail</li>
            </ul>
            <p>We do NOT collect, request, or store your Roblox password, credentials, Robux balance, or billing data.</p>

            <h2>2. How We Use Information</h2>
            <p>We use your public identity strictly to:</p>
            <ul>
              <li>Display your Roblox avatar and username on votes, comments, and leaderboards.</li>
              <li>Store your community voting history and streak progress securely in our cloud database.</li>
              <li>Verify account ownership to prevent automated vote manipulation.</li>
            </ul>

            <h2>3. Third-Party Services</h2>
            <p>Authentication is processed via Roblox Corporation's official OpenID Connect endpoint (<code>authorize.roblox.com</code>). Roblox's collection and handling of your credentials is governed by the <a href="https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy" target="_blank">Roblox Privacy Policy</a>.</p>

            <h2>4. Data Retention &amp; Deletion</h2>
            <p>You can unlink your account or delete your profile data at any time through the in-app profile settings or by contacting the application administrator.</p>

            <h2>5. Contact</h2>
            <p>For inquiries regarding privacy, contact support via the BloxVote portal.</p>
            
            <p style="margin-top: 40px; font-size: 12px; color: #71717a;">
              <a href="/">← Return to BloxVote</a> &nbsp;|&nbsp; <a href="/terms">Terms of Service</a>
            </p>
          </div>
        </body>
      </html>
    `);
  });

  // Dedicated Terms of Service Route (Required for OAuth 2.0 apps)
  app.get('/terms', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Terms of Service - BloxVote</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; line-height: 1.6; margin: 0; padding: 40px 20px; }
            .container { max-width: 760px; margin: 0 auto; background: #121318; padding: 40px; border-radius: 16px; border: 1px solid #27272a; }
            h1 { color: #fff; font-size: 28px; margin-top: 0; }
            h2 { color: #e4e4e7; font-size: 18px; margin-top: 28px; border-bottom: 1px solid #27272a; padding-bottom: 8px; }
            p, li { color: #a1a1aa; font-size: 14px; }
            a { color: #3b82f6; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .badge { display: inline-block; background: #27272a; color: #a1a1aa; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">BloxVote Legal</div>
            <h1>Terms of Service</h1>
            <p><strong>Effective Date:</strong> January 1, 2026</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using BloxVote, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.</p>

            <h2>2. Community Guidelines &amp; Voting</h2>
            <p>BloxVote is a community-driven rating and discovery platform for Roblox experiences. Users agree to:</p>
            <ul>
              <li>Submit genuine ratings, votes, and community comments.</li>
              <li>Refrain from automated botting, harassment, profanity, or malicious behavior.</li>
              <li>Respect intellectual property rights and developer creations.</li>
            </ul>

            <h2>3. Disclaimers &amp; Trademark Notice</h2>
            <p>BloxVote is an independent community application and is not affiliated, sponsored, or endorsed by Roblox Corporation. Roblox, the Roblox logo, and Powering Imagination are registered trademarks of Roblox Corporation.</p>

            <h2>4. Modifications &amp; Termination</h2>
            <p>We reserve the right to modify these terms or suspend access to users violating community rules without prior notice.</p>
            
            <p style="margin-top: 40px; font-size: 12px; color: #71717a;">
              <a href="/">← Return to BloxVote</a> &nbsp;|&nbsp; <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        </body>
      </html>
    `);
  });

  // Vite middleware for development vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use((req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    // Catch missing asset files explicitly so they return 404 instead of index.html
    app.use('/assets', (req, res) => {
      res.status(404).send('Asset not found');
    });
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
