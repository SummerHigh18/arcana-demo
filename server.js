const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const frontendRoot = path.join(__dirname, 'frontend');

const restaurants = [
  {
    id: 'komorebi-dining-guide',
    name: 'Komorebi Dining Guide',
    neighborhood: 'Tiong Bahru',
    cuisine: ['Japanese', 'Small plates'],
    spice: 'mild',
    budget: 'moderate',
    rating: 4.8,
    description: 'A cozy, modern spot with elevated comfort food and beautiful plating.'
  },
  {
    id: 'satay-by-the-bay',
    name: 'Satay by the Bay',
    neighborhood: 'Marina Bay',
    cuisine: ['Local', 'Grill'],
    spice: 'medium',
    budget: 'moderate',
    rating: 4.6,
    description: 'Great for a lively night out with grilled skewers and waterfront views.'
  },
  {
    id: 'laksa-lane',
    name: 'Laksa Lane',
    neighborhood: 'Little India',
    cuisine: ['Peranakan', 'Soup'],
    spice: 'hot',
    budget: 'budget',
    rating: 4.7,
    description: 'A fan-favorite for rich, spicy noodles and bold flavors.'
  },
  {
    id: 'bao-bloom',
    name: 'Bao Bloom',
    neighborhood: 'Joo Chiat',
    cuisine: ['Bakery', 'Street food'],
    spice: 'mild',
    budget: 'budget',
    rating: 4.5,
    description: 'Perfect for a casual snack stop with fluffy buns and local bites.'
  }
];

const genericRestaurants = [
  {
    id: 'demo-marina-bay',
    name: 'Marina Bay Street Eats',
    neighborhood: 'Marina Bay',
    cuisine: ['Local', 'Street food'],
    spice: 'medium',
    budget: 'budget',
    rating: 4.4,
    description: 'A lively neighborhood stop for casual sharing plates and local favorites.'
  },
  {
    id: 'demo-tiong-bahru',
    name: 'Tiong Bahru Comfort House',
    neighborhood: 'Tiong Bahru',
    cuisine: ['Cafe', 'Comfort food'],
    spice: 'mild',
    budget: 'moderate',
    rating: 4.5,
    description: 'A cozy pick for brunch, coffee, and easygoing comfort bites.'
  },
  {
    id: 'demo-little-india',
    name: 'Little India Spice Corner',
    neighborhood: 'Little India',
    cuisine: ['Indian', 'Street food'],
    spice: 'hot',
    budget: 'budget',
    rating: 4.3,
    description: 'A bold, flavor-packed option for spice lovers and street food fans.'
  },
  {
    id: 'demo-joo-chiat',
    name: 'Joo Chiat Night Market',
    neighborhood: 'Joo Chiat',
    cuisine: ['Bakery', 'Snacks'],
    spice: 'mild',
    budget: 'budget',
    rating: 4.2,
    description: 'A cheerful casual spot great for snacks, pastries, and quick bites.'
  },
  {
    id: 'demo-chinatown',
    name: 'Chinatown Food Hall',
    neighborhood: 'Chinatown',
    cuisine: ['Local', 'Hawker'],
    spice: 'medium',
    budget: 'moderate',
    rating: 4.6,
    description: 'A festive crowd-pleaser with a wide range of classic Singapore flavors.'
  }
];

const profiles = [];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 500, { error: 'Unable to read requested file.' });
      return;
    }

    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
}

function resolveFrontendRoute(requestPath) {
  const routeMap = {
    '/': 'welcome_to_sg_foodie_guide/code.html',
    '/welcome': 'welcome_to_sg_foodie_guide/code.html',
    '/home': 'welcome_to_sg_foodie_guide/code.html',
    '/taste-profile': 'personalize_your_taste_profile/code.html',
    '/profile': 'personalize_your_taste_profile/code.html',
    '/guide': 'your_curated_food_guide/code.html',
    '/curated': 'your_curated_food_guide/code.html',
    '/admin': 'admin_dashboard/code.html',
    '/restaurants': 'restaurant_details_review/code.html',
    '/restaurant': 'restaurant_details_review/code.html',
    '/journey': 'your_food_journey/code.html',
    '/app': 'sg_foodie_guide_app/code.html',
    '/day-2': 'day_2_modern_marina_bay/code.html'
  };

  if (routeMap[requestPath]) {
    return path.join(frontendRoot, routeMap[requestPath]);
  }

  const cleanedPath = requestPath.replace(/^\/+/, '');
  const candidate = path.resolve(frontendRoot, cleanedPath);
  const relativeToRoot = path.relative(frontendRoot, candidate);

  if (!relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  return null;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk.toString();
      });
      response.on('end', () => {
        if (response.statusCode >= 400) {
          reject(new Error(`Request failed with status ${response.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    request.on('error', reject);
  });
}

function inferBudgetLevel(preferences = {}) {
  const budget = (preferences.budget || 'moderate').toLowerCase();
  if (budget.includes('budget')) return 'budget';
  if (budget.includes('expensive')) return 'expensive';
  return 'moderate';
}

function inferSpiceLevel(preferences = {}) {
  const spice = (preferences.spiceLevel || preferences.spice || 'medium').toLowerCase();
  if (spice.includes('extra')) return 'hot';
  if (spice.includes('spicy') || spice.includes('hot')) return 'hot';
  if (spice.includes('mild')) return 'mild';
  return 'medium';
}

function getFallbackRestaurants(preferences = {}) {
  const spice = (preferences.spiceLevel || preferences.spice || 'medium').toLowerCase();
  const budget = (preferences.budget || 'moderate').toLowerCase();
  const preferredLocation = (preferences.preferredLocation || preferences.neighborhood || '').trim().toLowerCase();
  const restrictions = Array.isArray(preferences.restrictions) ? preferences.restrictions : [];
  const interests = Array.isArray(preferences.interests) ? preferences.interests : [];

  const candidates = [...restaurants, ...genericRestaurants]
    .map((restaurant) => {
      const locationMatches = !preferredLocation || restaurant.neighborhood.toLowerCase().includes(preferredLocation);
      const spiceMatches = !spice || restaurant.spice === spice || (spice === 'medium' && restaurant.spice === 'mild');
      const budgetMatches = !budget || restaurant.budget === budget || (budget === 'moderate' && restaurant.budget === 'budget');
      const interestMatches = !interests.length || interests.some((interest) => {
        const interestText = interest.toLowerCase();
        return restaurant.name.toLowerCase().includes(interestText)
          || restaurant.description.toLowerCase().includes(interestText)
          || restaurant.cuisine.some((cuisine) => cuisine.toLowerCase().includes(interestText));
      });
      const restrictionMatches = !restrictions.length || restrictions.every((restriction) => {
        const restrictionText = restriction.toLowerCase();
        if (restrictionText.includes('halal')) return true;
        if (restrictionText.includes('vegetarian') || restrictionText.includes('vegan')) return true;
        return true;
      });

      const score = (locationMatches ? 3 : 0) + (spiceMatches ? 2 : 0) + (budgetMatches ? 1 : 0) + (interestMatches ? 2 : 0) + (restrictionMatches ? 1 : 0);
      return { restaurant, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.restaurant.rating - a.restaurant.rating)
    .slice(0, 5)
    .map(({ restaurant }) => ({ ...restaurant, source: 'fallback' }));

  return candidates.length ? candidates : genericRestaurants.slice(0, 5).map((restaurant) => ({ ...restaurant, source: 'fallback' }));
}

async function getNearbyRestaurants(preferences = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const location = preferences.preferredLocation || preferences.neighborhood || 'Singapore';

  if (apiKey) {
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geocodeData = await fetchJson(geocodeUrl);
      const locationResult = geocodeData.results?.[0];

      if (locationResult?.geometry?.location) {
        const { lat, lng } = locationResult.geometry.location;
        const keyword = (preferences.interests || []).join(' ') || 'restaurant';
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=4000&type=restaurant&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;
        const nearbyData = await fetchJson(nearbyUrl);

        return (nearbyData.results || []).slice(0, 6).map((place) => ({
          id: place.place_id,
          name: place.name,
          neighborhood: place.vicinity || location,
          cuisine: (place.types || []).filter((type) => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(type)).slice(0, 2) || ['Local'],
          spice: inferSpiceLevel(preferences),
          budget: inferBudgetLevel(preferences),
          rating: place.rating || 4.2,
          description: place.types?.join(', ') || 'Popular nearby restaurant',
          address: place.vicinity || '',
          source: 'google-places'
        }));
      }
    } catch (error) {
      console.warn('Google Places lookup failed, falling back to local recommendations.', error.message);
    }
  }

  return getFallbackRestaurants(preferences);
}

async function getRecommendations(preferences = {}) {
  return getNearbyRestaurants(preferences);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      message: 'Makan Mate backend is running',
      routes: ['/', '/welcome', '/taste-profile', '/guide', '/restaurants', '/journey', '/api/restaurants', '/api/recommendations']
    });
    return;
  }

  if (pathname === '/api/restaurants' && req.method === 'GET') {
    const query = requestUrl.searchParams;
    const neighborhood = query.get('neighborhood') || '';
    const budget = query.get('budget') || '';
    const spice = query.get('spice') || '';

    const filtered = restaurants.filter((restaurant) => {
      const matchesNeighborhood = !neighborhood || restaurant.neighborhood.toLowerCase().includes(neighborhood.toLowerCase());
      const matchesBudget = !budget || restaurant.budget.toLowerCase() === budget.toLowerCase();
      const matchesSpice = !spice || restaurant.spice.toLowerCase() === spice.toLowerCase();
      return matchesNeighborhood && matchesBudget && matchesSpice;
    });

    sendJson(res, 200, { restaurants: filtered });
    return;
  }

  if (pathname === '/api/recommendations' && req.method === 'GET') {
    const recommendations = await getRecommendations({
      spice: requestUrl.searchParams.get('spice') || '',
      budget: requestUrl.searchParams.get('budget') || '',
      neighborhood: requestUrl.searchParams.get('neighborhood') || ''
    });

    sendJson(res, 200, { recommendations });
    return;
  }

  if (pathname === '/api/nearby-restaurants' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const profile = req.method === 'POST' ? await parseJsonBody(req) : {
        preferredLocation: requestUrl.searchParams.get('neighborhood') || requestUrl.searchParams.get('location') || '',
        spiceLevel: requestUrl.searchParams.get('spice') || '',
        budget: requestUrl.searchParams.get('budget') || ''
      };
      const restaurants = await getNearbyRestaurants(profile);
      sendJson(res, 200, { restaurants, profile });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname === '/api/profile' && req.method === 'POST') {
    try {
      const profile = await parseJsonBody(req);
      profiles.push(profile);
      const recommendations = await getRecommendations(profile);
      sendJson(res, 200, {
        message: 'Profile received',
        profile,
        recommendations
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname === '/api/profiles' && req.method === 'GET') {
    sendJson(res, 200, { profiles });
    return;
  }

  const filePath = resolveFrontendRoute(pathname);
  if (filePath) {
    serveFile(res, filePath);
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

function startServer(port, attempts = 0) {
  const currentPort = Number(port);
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempts < 5) {
      console.warn(`Port ${currentPort} is busy. Trying ${currentPort + 1}...`);
      startServer(currentPort + 1, attempts + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(currentPort, () => {
    console.log(`Makan Mate backend running at http://localhost:${currentPort}`);
    console.log(`Open http://localhost:${currentPort}/ to view the frontend`);
  });
}

startServer(PORT);
