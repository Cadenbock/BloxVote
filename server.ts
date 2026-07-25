import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Vite middleware for development vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use((req, res, next) => {
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
