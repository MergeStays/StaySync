export type ChannelSource = 
  | 'airbnb' 
  | 'makemytrip' 
  | 'booking' 
  | 'agoda' 
  | 'vrbo' 
  | 'direct' 
  | 'block';

export interface User {
  id: string;
  email: string;
  name: string;
  homestayName: string;
  currency: string;
  createdAt: string;
}

export interface Room {
  id: string;
  userId: string;
  name: string;
  type: string; // e.g. "Deluxe Cottage", "Mountain Suite", "Standard Room"
  capacity: number; // max guests
  basePrice: number; // default per night
  description?: string;
  amenities: string[];
  color: string; // hex code for calendar badges
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  roomId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  source: ChannelSource;
  externalBookingId?: string; // OTA booking reference or iCal UID
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial' | 'blocked';
  notes?: string;
  isOfflineBlock: boolean; // True if blocked by host for direct booking or maintenance
  createdAt: string;
  syncedAt?: string;
}

export interface ICalFeed {
  id: string;
  userId: string;
  roomId: string;
  channel: ChannelSource;
  name: string; // e.g. "Airbnb - Teak Suite"
  feedUrl: string;
  lastSyncedAt?: string;
  syncStatus: 'idle' | 'success' | 'error' | 'syncing';
  errorMessage?: string;
  autoSync: boolean;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  userId: string;
  feedId?: string;
  channel: ChannelSource;
  roomName: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  eventsFound: number;
  bookingsAdded: number;
  bookingsUpdated: number;
  message: string;
}

export interface ChannelMeta {
  id: ChannelSource;
  name: string;
  shortName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  tagColor: string;
  logoPlaceholder: string;
}
