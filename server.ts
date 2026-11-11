import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Database file path
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  homestayName: string;
  currency: string;
  resetToken?: string;
  resetTokenExpires?: number;
  createdAt: string;
}

interface ServerRoom {
  id: string;
  userId: string;
  name: string;
  type: string;
  capacity: number;
  basePrice: number;
  description?: string;
  amenities: string[];
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface ServerBooking {
  id: string;
  userId: string;
  roomId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  source: string;
  externalBookingId?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  paymentStatus: string;
  notes?: string;
  isOfflineBlock: boolean;
  createdAt: string;
  syncedAt?: string;
}

interface ServerFeed {
  id: string;
  userId: string;
  roomId: string;
  channel: string;
  name: string;
  feedUrl: string;
  lastSyncedAt?: string;
  syncStatus: string;
  errorMessage?: string;
  autoSync: boolean;
  createdAt: string;
}

interface ServerLog {
  id: string;
  userId: string;
  feedId?: string;
  channel: string;
  roomName: string;
  timestamp: string;
  status: string;
  eventsFound: number;
  bookingsAdded: number;
  bookingsUpdated: number;
  message: string;
}

interface DatabaseSchema {
  users: ServerUser[];
  data: Record<
    string,
    {
      rooms: ServerRoom[];
      bookings: ServerBooking[];
      feeds: ServerFeed[];
      logs: ServerLog[];
      lastUpdated: string;
    }
  >;
}

// Initial demo seed
function getInitialDb(): DatabaseSchema {
  const demoUserId = 'user_demo_host';
  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];
  const getOffset = (days: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    return format(d);
  };

  const demoRooms: ServerRoom[] = [
    {
      id: `room_${demoUserId}_1`,
      userId: demoUserId,
      name: 'Pine Crest Wooden Cottage',
      type: 'Deluxe Cottage',
      capacity: 3,
      basePrice: 3800,
      description: 'Handcrafted timber cottage overlooking the pine forest with private balcony.',
      amenities: ['Mountain View', 'King Bed', 'Heater', 'Wi-Fi', 'Breakfast Included'],
      color: '#059669',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: `room_${demoUserId}_2`,
      userId: demoUserId,
      name: 'Valley View Deluxe Suite',
      type: 'Master Suite',
      capacity: 4,
      basePrice: 4900,
      description: 'Spacious suite with floor-to-ceiling glass windows and panoramic sunrise views.',
      amenities: ['Valley View', '2 Queen Beds', 'Fireplace', 'En-suite Bath', 'Smart TV'],
      color: '#0284C7',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: `room_${demoUserId}_3`,
      userId: demoUserId,
      name: 'Tea Garden Studio',
      type: 'Studio Room',
      capacity: 2,
      basePrice: 2800,
      description: 'Cozy retreat right next to the heritage organic tea terrace garden.',
      amenities: ['Garden Access', 'Queen Bed', 'Work Desk', 'Hot Water', 'Tea Maker'],
      color: '#D97706',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const demoBookings: ServerBooking[] = [];
  const demoFeeds: ServerFeed[] = [];

  return {
    users: [
      {
        id: demoUserId,
        email: 'demo@homestay.com',
        passwordHash: 'password123',
        name: 'Prachurjya B. (Host)',
        homestayName: 'Highland Pinecrest Homestay',
        currency: '₹',
        createdAt: new Date().toISOString(),
      },
    ],
    data: {
      [demoUserId]: {
        rooms: demoRooms,
        bookings: demoBookings,
        feeds: demoFeeds,
        logs: [
          {
            id: `log_${Date.now()}_1`,
            userId: demoUserId,
            feedId: demoFeeds[0].id,
            channel: 'airbnb',
            roomName: demoRooms[0].name,
            timestamp: new Date().toISOString(),
            status: 'success',
            eventsFound: 1,
            bookingsAdded: 0,
            bookingsUpdated: 1,
            message: 'Multi-device sync active. Synchronized with Airbnb.',
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
    },
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json, recreating initial:', err);
  }
  const initial = getInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Ensure DB is initialized
loadDb();

// ==================== AUTH ROUTES ====================

// Login from any device
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required.' });
  }

  const db = loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'No homestay account found with this email. Please check spelling or register.',
    });
  }

  if (user.passwordHash !== password) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect password. Use the Forgot Password tab to reset if needed.',
    });
  }

  // Ensure data store exists for user
  if (!db.data[user.id]) {
    db.data[user.id] = {
      rooms: [
        {
          id: `room_${user.id}_1`,
          userId: user.id,
          name: 'Deluxe Heritage Room 101',
          type: 'Deluxe Room',
          capacity: 2,
          basePrice: 3200,
          amenities: ['Mountain View', 'En-suite Bath', 'Wi-Fi'],
          color: '#059669',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
      bookings: [],
      feeds: [],
      logs: [],
      lastUpdated: new Date().toISOString(),
    };
    saveDb(db);
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      homestayName: user.homestayName,
      currency: user.currency || '₹',
      createdAt: user.createdAt,
    },
    message: 'Authenticated successfully. Cross-device synchronization active.',
  });
});

// Signup
app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { email, password, name, homestayName, currency } = req.body;
  if (!email || !password || !homestayName) {
    return res.status(400).json({ success: false, error: 'Email, password, and homestay name are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = loadDb();

  if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'An account with this email already exists. You can log in directly from this device.',
    });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: ServerUser = {
    id: userId,
    email: cleanEmail,
    passwordHash: password,
    name: (name || 'Homestay Host').trim(),
    homestayName: homestayName.trim(),
    currency: currency || '₹',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  db.data[userId] = {
    rooms: [
      {
        id: `room_${userId}_1`,
        userId,
        name: 'Master Suite 101',
        type: 'Deluxe Cottage',
        capacity: 2,
        basePrice: 3000,
        description: 'Cozy homestay suite with scenic valley view.',
        amenities: ['Mountain View', 'King Bed', 'Hot Water 24/7', 'Wi-Fi'],
        color: '#059669',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
    bookings: [],
    feeds: [],
    logs: [],
    lastUpdated: new Date().toISOString(),
  };

  saveDb(db);

  return res.json({
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      homestayName: newUser.homestayName,
      currency: newUser.currency,
      createdAt: newUser.createdAt,
    },
  });
});

// Forgot password request code
app.post('/api/auth/request-reset', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ success: false, error: 'No account found with this email.' });
  }

  const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetToken = resetPin;
  user.resetTokenExpires = Date.now() + 3600000 * 3; // 3 hours

  saveDb(db);

  return res.json({
    success: true,
    token: resetPin,
    message: `Verification PIN generated for ${user.email}: ${resetPin}`,
  });
});

// Reset password with token
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email, token, and new password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  if (!user.resetToken || user.resetToken !== token.trim()) {
    return res.status(400).json({ success: false, error: 'Invalid recovery code.' });
  }

  if (user.resetTokenExpires && user.resetTokenExpires < Date.now()) {
    return res.status(400).json({ success: false, error: 'Recovery code has expired.' });
  }

  user.passwordHash = newPassword;
  delete user.resetToken;
  delete user.resetTokenExpires;

  saveDb(db);

  return res.json({ success: true, message: 'Password updated. You can now log in from any device.' });
});

// Update profile
app.post('/api/auth/update-profile', (req: Request, res: Response) => {
  const { userId, name, homestayName, currency } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required.' });
  }

  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  if (name) user.name = name;
  if (homestayName) user.homestayName = homestayName;
  if (currency) user.currency = currency;

  saveDb(db);
  return res.json({ success: true, user });
});

// ==================== CROSS-DEVICE DATA SYNC ROUTES ====================

// Retrieve latest homestay data for host
app.get('/api/homestay/:userId/data', (req: Request, res: Response) => {
  const { userId } = req.params;
  const db = loadDb();
  const store = db.data[userId];

  if (!store) {
    return res.status(404).json({ success: false, error: 'Homestay data not found.' });
  }

  return res.json({
    success: true,
    rooms: store.rooms || [],
    bookings: store.bookings || [],
    feeds: store.feeds || [],
    logs: store.logs || [],
    lastUpdated: store.lastUpdated,
  });
});

// Update homestay data from any device (allowed to modify any changes)
app.post('/api/homestay/:userId/data', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { rooms, bookings, feeds, logs } = req.body;

  const db = loadDb();
  if (!db.data[userId]) {
    db.data[userId] = {
      rooms: [],
      bookings: [],
      feeds: [],
      logs: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  if (rooms) db.data[userId].rooms = rooms;
  if (bookings) db.data[userId].bookings = bookings;
  if (feeds) db.data[userId].feeds = feeds;
  if (logs) db.data[userId].logs = logs;
  db.data[userId].lastUpdated = new Date().toISOString();

  saveDb(db);

  return res.json({
    success: true,
    lastUpdated: db.data[userId].lastUpdated,
    message: 'Changes saved and synced across all devices.',
  });
});

// ==================== LIVE PUBLIC ICALENDAR FEED ====================
// Serves real RFC 5545 iCalendar format for Airbnb, MakeMyTrip, Booking.com
app.get('/api/ical/export/:roomId.ics', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const db = loadDb();

  let targetRoom: ServerRoom | undefined;
  let targetBookings: ServerBooking[] = [];
  let hostHomestayName = 'Homestay';

  // Find room across all users
  for (const userId of Object.keys(db.data)) {
    const userStore = db.data[userId];
    const r = userStore.rooms.find((rm) => rm.id === roomId);
    if (r) {
      targetRoom = r;
      targetBookings = userStore.bookings.filter((b) => b.roomId === roomId);
      const u = db.users.find((usr) => usr.id === userId);
      if (u) hostHomestayName = u.homestayName;
      break;
    }
  }

  if (!targetRoom) {
    return res.status(404).send('Room not found');
  }

  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StaySync Homestay Channel Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${hostHomestayName} - ${targetRoom.name}`,
    `X-WR-CALDESC:Real-time sync feed for ${targetRoom.name}`,
    'X-WR-TIMEZONE:UTC',
  ];

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isForAirbnb =
    req.query.channel === 'airbnb' ||
    req.query.target === 'airbnb' ||
    userAgent.includes('airbnb') ||
    userAgent.includes('hanaro');

  for (const b of targetBookings) {
    // 1. Exclude legacy fake/demo seed bookings
    const isFakeSeed =
      b.externalBookingId === 'HM9302149X' ||
      b.externalBookingId === 'MMT-IND-88201' ||
      b.externalBookingId === 'DIR-2026-004' ||
      b.externalBookingId === 'BKNG-3928172' ||
      b.externalBookingId === 'MAINT-OCT-01' ||
      b.id.startsWith('bk_1794407846310_') ||
      b.guestName.includes('Liam & Emma Watson') ||
      b.guestName.includes('Rajesh & Priya') ||
      b.guestName.includes('Amit Verma (WhatsApp Walk-in)');

    if (isFakeSeed) continue;

    // 2. Prevent echo loops: If Airbnb is importing this feed, do not export Airbnb's own reservations back into Airbnb
    if (isForAirbnb && b.source === 'airbnb') {
      continue;
    }

    const dtstart = b.checkIn.replace(/-/g, '');
    const dtend = b.checkOut.replace(/-/g, '');
    const uid = b.externalBookingId || `staysync-${b.id}@homestay.local`;
    const summary = b.isOfflineBlock
      ? (b.source === 'block' ? 'Blocked - Maintenance' : `Direct Booking - ${b.guestName}`)
      : `${b.source.toUpperCase()} - ${b.guestName}`;

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${nowUtc}`);
    icsLines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    icsLines.push(`DTEND;VALUE=DATE:${dtend}`);
    icsLines.push(`SUMMARY:${summary}`);
    icsLines.push(`DESCRIPTION:Channel: ${b.source}\\nNights: ${b.nights}`);
    icsLines.push('STATUS:CONFIRMED');
    icsLines.push('END:VEVENT');
  }

  icsLines.push('END:VCALENDAR');
  const icsBody = icsLines.join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${targetRoom.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.send(icsBody);
});

// ==================== LIVE ICALENDAR PROXY FETCH ====================
// Overcomes browser CORS restrictions and headers for Airbnb, MakeMyTrip, Booking.com
app.get('/api/ical/fetch', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Feed URL is required' });
  }

  const cleanUrl = url.trim();
  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ success: false, error: 'Feed URL must start with http:// or https://' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const fetchResponse = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/calendar, text/plain, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      if (fetchResponse.status === 404) {
        return res.status(400).json({
          success: false,
          error:
            'Calendar feed returned 404 Not Found. Please check your Airbnb listing ID or regenerate the export link in Airbnb Calendar settings.',
        });
      }
      if (fetchResponse.status === 401 || fetchResponse.status === 403) {
        return res.status(400).json({
          success: false,
          error:
            'Calendar feed access was restricted (HTTP ' +
            fetchResponse.status +
            '). If using Airbnb, ensure the URL includes the secret token parameter (?s=...).',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Remote calendar returned HTTP ${fetchResponse.status} ${fetchResponse.statusText}.`,
      });
    }

    const text = await fetchResponse.text();

    if (
      text.trim().toLowerCase().startsWith('<!doctype') ||
      text.trim().toLowerCase().startsWith('<html')
    ) {
      return res.status(400).json({
        success: false,
        error:
          'The provided URL returned a webpage instead of an iCalendar (.ics) feed. Please ensure you copied the direct "Export Calendar" link from Airbnb (not the browser address bar).',
      });
    }

    if (
      !text.toUpperCase().includes('BEGIN:VCALENDAR') &&
      !text.toUpperCase().includes('BEGIN:VEVENT')
    ) {
      return res.status(400).json({
        success: false,
        error:
          'No valid iCalendar (RFC 5545) VCALENDAR or VEVENT blocks were found in the response from the provider.',
      });
    }

    return res.json({
      success: true,
      ics: text,
      url: cleanUrl,
    });
  } catch (err: any) {
    console.error('Error fetching external iCal:', err);
    return res.status(500).json({
      success: false,
      error:
        err.name === 'AbortError'
          ? 'Connection to calendar server timed out after 15 seconds. Please try again.'
          : `Failed to fetch calendar: ${err.message || 'Network error'}`,
    });
  }
});

// ==================== FRONTEND VITE INTEGRATION ====================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StaySync Channel Manager full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
