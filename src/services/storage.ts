import { Booking, ICalFeed, Room, SyncLog, User } from '../types';

export interface UserAccount extends User {
  passwordHash: string;
  resetToken?: string;
  resetTokenExpires?: number;
}

export interface UserDataStore {
  rooms: Room[];
  bookings: Booking[];
  feeds: ICalFeed[];
  logs: SyncLog[];
}

const USERS_KEY = 'staysync_registered_users';
const CURRENT_USER_KEY = 'staysync_active_session_user_id';

// Helper for unique ids
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Initial demo seed data for the first-time demo user
export const DEMO_USER_ID = 'user_demo_host';
export const DEMO_USER_EMAIL = 'demo@homestay.com';

function createDemoSeedData(userId: string): UserDataStore {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];

  const getRelativeDate = (offset: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return format(d);
  };

  const rooms: Room[] = [
    {
      id: `room_${userId}_1`,
      userId,
      name: 'Pine Crest Wooden Cottage',
      type: 'Deluxe Cottage',
      capacity: 3,
      basePrice: 3800,
      description: 'Handcrafted timber cottage overlooking the pine forest with private balcony.',
      amenities: ['Mountain View', 'King Bed', 'Heater', 'Wi-Fi', 'Breakfast Included'],
      color: '#059669', // Emerald
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: `room_${userId}_2`,
      userId,
      name: 'Valley View Deluxe Suite',
      type: 'Master Suite',
      capacity: 4,
      basePrice: 4900,
      description: 'Spacious suite with floor-to-ceiling glass windows and panoramic sunrise views.',
      amenities: ['Valley View', '2 Queen Beds', 'Fireplace', 'En-suite Bath', 'Smart TV'],
      color: '#0284C7', // Sky
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: `room_${userId}_3`,
      userId,
      name: 'Tea Garden Studio',
      type: 'Studio Room',
      capacity: 2,
      basePrice: 2800,
      description: 'Cozy retreat right next to the heritage organic tea terrace garden.',
      amenities: ['Garden Access', 'Queen Bed', 'Work Desk', 'Hot Water', 'Tea Maker'],
      color: '#D97706', // Amber
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const bookings: Booking[] = [];
  const feeds: ICalFeed[] = [];
  const logs: SyncLog[] = [];

  return { rooms, bookings, feeds, logs };
}

// Retrieve all registered accounts
export function getRegisteredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      // Seed default demo user
      const demoAccount: UserAccount = {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        passwordHash: 'password123', // In real prod hashed, here verified locally
        name: 'Prachurjya B. (Host)',
        homestayName: 'Highland Pinecrest Homestay',
        currency: '₹',
        createdAt: new Date().toISOString(),
      };
      const initial = [demoAccount];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      
      // Seed demo data
      const demoData = createDemoSeedData(DEMO_USER_ID);
      saveUserData(DEMO_USER_ID, demoData);
      
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to get registered users:', err);
    return [];
  }
}

// Save registered accounts list
export function saveRegisteredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users:', err);
  }
}

// Get active session user
export function getActiveSessionUserId(): string | null {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

// Set active session user
export function setActiveSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(CURRENT_USER_KEY, userId);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to set active session user:', err);
  }
}

// Fetch user data store isolated by userId
export function getUserData(userId: string): UserDataStore {
  try {
    const key = `staysync_data_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Initialize fresh store for new user
      const freshStore: UserDataStore = {
        rooms: [
          {
            id: generateId('room'),
            userId,
            name: 'Master Suite 101',
            type: 'Deluxe Room',
            capacity: 2,
            basePrice: 3000,
            description: 'Cozy room with double bed and mountain view.',
            amenities: ['Wi-Fi', 'Private Bath', 'Tea Kettle'],
            color: '#059669',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ],
        bookings: [],
        feeds: [],
        logs: [],
      };
      saveUserData(userId, freshStore);
      return freshStore;
    }
    const parsed: UserDataStore = JSON.parse(raw);
    const cleanBookings = (parsed.bookings || []).filter((b) =>
      b.externalBookingId !== 'HM9302149X' &&
      b.externalBookingId !== 'MMT-IND-88201' &&
      b.externalBookingId !== 'DIR-2026-004' &&
      b.externalBookingId !== 'BKNG-3928172' &&
      b.externalBookingId !== 'MAINT-OCT-01' &&
      !b.id.startsWith('bk_1794407846310_') &&
      !b.guestName.includes('Liam & Emma Watson') &&
      !b.guestName.includes('Rajesh & Priya') &&
      !b.guestName.includes('Amit Verma (WhatsApp Walk-in)') &&
      !b.guestName.includes('Carlos Mendonca') &&
      !b.guestName.includes('Facility Maintenance')
    );
    const cleanFeeds = (parsed.feeds || []).filter((f) =>
      !f.feedUrl.includes('49201948.ics') &&
      !f.feedUrl.includes('extranet.makemytrip.com')
    );
    if (cleanBookings.length !== (parsed.bookings || []).length || cleanFeeds.length !== (parsed.feeds || []).length) {
      parsed.bookings = cleanBookings;
      parsed.feeds = cleanFeeds;
      saveUserData(userId, parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load user data:', err);
    return { rooms: [], bookings: [], feeds: [], logs: [] };
  }
}

// Save user data store isolated by userId
export function saveUserData(userId: string, data: UserDataStore): void {
  try {
    const key = `staysync_data_${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save user data:', err);
  }
}
