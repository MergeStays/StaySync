import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Booking, ChannelSource, ICalFeed, Room, SyncLog } from '../types';
import { useAuth } from './AuthContext';
import { api, HomestaySyncData } from '../services/api';
import {
  generateId,
  getUserData,
  saveUserData,
  UserDataStore,
} from '../services/storage';
import {
  calculateNights,
  getSampleOtaFeed,
  parseICalFeed,
} from '../services/ical';

interface DataContextType {
  rooms: Room[];
  bookings: Booking[];
  feeds: ICalFeed[];
  logs: SyncLog[];
  isSyncing: boolean;
  isMultiDeviceLive: boolean;
  lastServerSync: string | null;
  refreshFromServer: () => Promise<void>;
  addRoom: (roomData: Omit<Room, 'id' | 'userId' | 'createdAt'>) => Room;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => { success: boolean; error?: string };
  addBooking: (bookingData: Omit<Booking, 'id' | 'userId' | 'createdAt'>) => {
    success: boolean;
    booking?: Booking;
    error?: string;
  };
  updateBooking: (bookingId: string, updates: Partial<Booking>) => {
    success: boolean;
    error?: string;
  };
  deleteBooking: (bookingId: string) => void;
  checkConflicts: (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ) => Booking[];
  addFeed: (feedData: Omit<ICalFeed, 'id' | 'userId' | 'createdAt' | 'syncStatus'>) => ICalFeed;
  deleteFeed: (feedId: string) => void;
  syncFeed: (feedId: string) => Promise<{ success: boolean; added: number; updated: number }>;
  syncAllFeeds: () => Promise<void>;
  importRawICal: (
    roomId: string,
    channel: ChannelSource,
    rawIcsText: string,
    feedId?: string
  ) => Promise<{ success: boolean; added: number; updated: number; message: string }>;
  clearLogs: () => void;
  purgeDemoBookings: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feeds, setFeeds] = useState<ICalFeed[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMultiDeviceLive, setIsMultiDeviceLive] = useState(true);
  const [lastServerSync, setLastServerSync] = useState<string | null>(null);

  const isUpdatingRef = useRef(false);

  // Helper to identify legacy fake/demo seed bookings
  const isFakeBooking = useCallback((b: Booking) => {
    return (
      b.externalBookingId === 'HM9302149X' ||
      b.externalBookingId === 'MMT-IND-88201' ||
      b.externalBookingId === 'DIR-2026-004' ||
      b.externalBookingId === 'BKNG-3928172' ||
      b.externalBookingId === 'MAINT-OCT-01' ||
      b.id.startsWith('bk_1794407846310_') ||
      b.guestName.includes('Liam & Emma Watson') ||
      b.guestName.includes('Rajesh & Priya') ||
      b.guestName.includes('Amit Verma (WhatsApp Walk-in)') ||
      b.guestName.includes('Carlos Mendonca') ||
      b.guestName.includes('Facility Maintenance')
    );
  }, []);

  const isFakeFeed = useCallback((f: ICalFeed) => {
    return (
      f.feedUrl.includes('49201948.ics') ||
      f.feedUrl.includes('extranet.makemytrip.com')
    );
  }, []);

  // Fetch from central server and hydrate local state
  const refreshFromServer = useCallback(async () => {
    if (!user) return;
    try {
      const serverData = await api.fetchHomestayData(user.id);
      if (serverData) {
        setIsMultiDeviceLive(true);
        setLastServerSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        
        // Filter out any legacy fake seed bookings so only real bookings remain
        const cleanBookings = (serverData.bookings || []).filter((b: Booking) => !isFakeBooking(b));
        const cleanFeeds = (serverData.feeds || []).filter((f: ICalFeed) => !isFakeFeed(f));

        // Update states
        setRooms(serverData.rooms || []);
        setBookings(cleanBookings);
        setFeeds(cleanFeeds);
        setLogs(serverData.logs || []);

        // Also update local cache for offline use
        saveUserData(user.id, {
          rooms: serverData.rooms || [],
          bookings: cleanBookings,
          feeds: cleanFeeds,
          logs: serverData.logs || [],
        });

        // If server had fake data, immediately clean it on the server
        if (cleanBookings.length !== (serverData.bookings || []).length || cleanFeeds.length !== (serverData.feeds || []).length) {
          api.saveHomestayData(user.id, {
            rooms: serverData.rooms || [],
            bookings: cleanBookings,
            feeds: cleanFeeds,
            logs: serverData.logs || [],
          }).catch(console.error);
        }
      }
    } catch {
      setIsMultiDeviceLive(false);
    }
  }, [user, isFakeBooking, isFakeFeed]);

  // Initial load on user login
  useEffect(() => {
    if (user) {
      // 1. Immediately load local cache so UI is instantaneous, filtering fake bookings
      const cached = getUserData(user.id);
      const cleanBookings = (cached.bookings || []).filter((b: Booking) => !isFakeBooking(b));
      const cleanFeeds = (cached.feeds || []).filter((f: ICalFeed) => !isFakeFeed(f));

      setRooms(cached.rooms || []);
      setBookings(cleanBookings);
      setFeeds(cleanFeeds);
      setLogs(cached.logs || []);

      // 2. Fetch latest data from server (allows different devices to immediately pick up latest changes!)
      refreshFromServer();
    } else {
      setRooms([]);
      setBookings([]);
      setFeeds([]);
      setLogs([]);
    }
  }, [user, refreshFromServer, isFakeBooking, isFakeFeed]);

  // Background polling for cross-device sync: checks server every 8s and when window gains focus
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (!isUpdatingRef.current) {
        refreshFromServer();
      }
    }, 8000);

    const handleFocus = () => {
      refreshFromServer();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, refreshFromServer]);

  // Persist helper: updates local cache AND pushes to central server for other devices
  const persist = useCallback(
    async (updated: Partial<UserDataStore>) => {
      if (!user) return;
      isUpdatingRef.current = true;

      const current = getUserData(user.id);
      const next: UserDataStore = {
        rooms: updated.rooms ?? current.rooms,
        bookings: updated.bookings ?? current.bookings,
        feeds: updated.feeds ?? current.feeds,
        logs: updated.logs ?? current.logs,
      };

      // 1. Save locally for instant offline responsiveness
      saveUserData(user.id, next);

      // 2. Push to server so any other devices logged in as this host receive the changes!
      try {
        const ok = await api.saveHomestayData(user.id, next);
        if (ok) {
          setIsMultiDeviceLive(true);
          setLastServerSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch {
        // Will sync once connection restores
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 1000);
      }
    },
    [user]
  );

  // Room operations
  const addRoom = (roomData: Omit<Room, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('User not logged in');
    const newRoom: Room = {
      ...roomData,
      id: generateId('room'),
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    const next = [...rooms, newRoom];
    setRooms(next);
    persist({ rooms: next });
    return newRoom;
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    const next = rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r));
    setRooms(next);
    persist({ rooms: next });
  };

  const deleteRoom = (roomId: string) => {
    // Check if room has active or upcoming bookings
    const today = new Date().toISOString().split('T')[0];
    const activeBookings = bookings.filter(
      (b) => b.roomId === roomId && b.checkOut >= today
    );
    if (activeBookings.length > 0) {
      return {
        success: false,
        error: `Cannot delete room: It has ${activeBookings.length} ongoing or upcoming bookings. Please cancel or reassign them first.`,
      };
    }

    const nextRooms = rooms.filter((r) => r.id !== roomId);
    const nextFeeds = feeds.filter((f) => f.roomId !== roomId);
    setRooms(nextRooms);
    setFeeds(nextFeeds);
    persist({ rooms: nextRooms, feeds: nextFeeds });
    return { success: true };
  };

  // Conflict detection
  const checkConflicts = (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ): Booking[] => {
    const targetStart = new Date(checkIn).getTime();
    const targetEnd = new Date(checkOut).getTime();

    return bookings.filter((b) => {
      if (b.roomId !== roomId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;

      const bStart = new Date(b.checkIn).getTime();
      const bEnd = new Date(b.checkOut).getTime();

      return Math.max(targetStart, bStart) < Math.min(targetEnd, bEnd);
    });
  };

  // Booking operations (allowed to modify from any device)
  const addBooking = (
    bookingData: Omit<Booking, 'id' | 'userId' | 'createdAt'>
  ): { success: boolean; booking?: Booking; error?: string } => {
    if (!user) return { success: false, error: 'User not logged in' };

    const conflicts = checkConflicts(
      bookingData.roomId,
      bookingData.checkIn,
      bookingData.checkOut
    );

    if (conflicts.length > 0) {
      const conflictMsg = `Date conflict: Room is already booked by ${conflicts[0].guestName} (${conflicts[0].checkIn} to ${conflicts[0].checkOut}).`;
      return { success: false, error: conflictMsg };
    }

    const nights = calculateNights(bookingData.checkIn, bookingData.checkOut);
    const newBooking: Booking = {
      ...bookingData,
      nights,
      id: generateId('bk'),
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    const next = [newBooking, ...bookings];
    setBookings(next);
    persist({ bookings: next });
    return { success: true, booking: newBooking };
  };

  const updateBooking = (bookingId: string, updates: Partial<Booking>) => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) return { success: false, error: 'Booking not found' };

    const nextRoomId = updates.roomId || existing.roomId;
    const nextCheckIn = updates.checkIn || existing.checkIn;
    const nextCheckOut = updates.checkOut || existing.checkOut;

    const conflicts = checkConflicts(
      nextRoomId,
      nextCheckIn,
      nextCheckOut,
      bookingId
    );

    if (conflicts.length > 0) {
      return {
        success: false,
        error: `Date conflict: Room is already booked by ${conflicts[0].guestName} (${conflicts[0].checkIn} to ${conflicts[0].checkOut}).`,
      };
    }

    const nights = calculateNights(nextCheckIn, nextCheckOut);
    const next = bookings.map((b) =>
      b.id === bookingId ? { ...b, ...updates, nights } : b
    );
    setBookings(next);
    persist({ bookings: next });
    return { success: true };
  };

  const deleteBooking = (bookingId: string) => {
    const next = bookings.filter((b) => b.id !== bookingId);
    setBookings(next);
    persist({ bookings: next });
  };

  // iCal Feeds
  const addFeed = (feedData: Omit<ICalFeed, 'id' | 'userId' | 'createdAt' | 'syncStatus'>) => {
    if (!user) throw new Error('User not logged in');
    const newFeed: ICalFeed = {
      ...feedData,
      id: generateId('feed'),
      userId: user.id,
      syncStatus: 'idle',
      createdAt: new Date().toISOString(),
    };
    const next = [...feeds, newFeed];
    setFeeds(next);
    persist({ feeds: next });
    return newFeed;
  };

  const deleteFeed = (feedId: string) => {
    const next = feeds.filter((f) => f.id !== feedId);
    setFeeds(next);
    persist({ feeds: next });
  };

  // Raw iCal text or URL parser & importer
  const importRawICal = async (
    roomId: string,
    channel: ChannelSource,
    rawIcsText: string,
    feedId?: string
  ): Promise<{ success: boolean; added: number; updated: number; message: string }> => {
    if (!user) return { success: false, added: 0, updated: 0, message: 'Not logged in' };
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return { success: false, added: 0, updated: 0, message: 'Room not found' };

    let contentToParse = rawIcsText.trim();
    if (!contentToParse) {
      return { success: false, added: 0, updated: 0, message: 'Please provide valid iCalendar text or a valid URL.' };
    }

    // If user provided a calendar URL (e.g., Airbnb calendar URL), fetch it via server proxy
    if (/^https?:\/\//i.test(contentToParse)) {
      try {
        const proxyResp = await fetch(`/api/ical/fetch?url=${encodeURIComponent(contentToParse)}`);
        const proxyResult = await proxyResp.json();
        if (proxyResult.success && proxyResult.ics) {
          contentToParse = proxyResult.ics;
        } else {
          return {
            success: false,
            added: 0,
            updated: 0,
            message: proxyResult.error || 'Failed to fetch calendar from the provided URL.',
          };
        }
      } catch (err: any) {
        return {
          success: false,
          added: 0,
          updated: 0,
          message: `Network error connecting to calendar URL: ${err.message || 'Check connection'}`,
        };
      }
    }

    const upper = contentToParse.toUpperCase();
    const hasVCalendar = upper.includes('BEGIN:VCALENDAR');
    const hasVEvent = upper.includes('BEGIN:VEVENT');

    if (!hasVCalendar && !hasVEvent) {
      return {
        success: false,
        added: 0,
        updated: 0,
        message: 'No valid RFC 5545 iCalendar content found. Content must contain BEGIN:VCALENDAR or BEGIN:VEVENT.',
      };
    }

    const parsedEvents = parseICalFeed(contentToParse);
    if (parsedEvents.length === 0) {
      // If it has BEGIN:VCALENDAR, it is a valid calendar feed that currently has 0 bookings
      if (hasVCalendar) {
        const log: SyncLog = {
          id: generateId('log'),
          userId: user.id,
          feedId,
          channel,
          roomName: targetRoom.name,
          timestamp: new Date().toISOString(),
          status: 'success',
          eventsFound: 0,
          bookingsAdded: 0,
          bookingsUpdated: 0,
          message: `Calendar feed synchronized successfully. Currently 0 active reservations found on ${channel.toUpperCase()}.`,
        };
        const nextLogs = [log, ...logs].slice(0, 50);
        setLogs(nextLogs);
        persist({ logs: nextLogs });

        return {
          success: true,
          added: 0,
          updated: 0,
          message: `Calendar feed is valid! Currently 0 reservations or blocked dates are active on this ${channel.toUpperCase()} listing.`,
        };
      }

      return {
        success: false,
        added: 0,
        updated: 0,
        message: 'No valid VEVENT blocks found in the provided iCalendar text.',
      };
    }

    let added = 0;
    let updated = 0;
    const currentBookings = [...bookings];

    for (const evt of parsedEvents) {
      const nights = calculateNights(evt.checkIn, evt.checkOut);
      const totalAmount = targetRoom.basePrice * nights;
      const externalId = evt.uid;

      // Extract guest name or clean summary
      let guest = evt.summary;
      if (guest.includes('-')) {
        guest = guest.split('-').slice(1).join('-').trim();
      }
      const isReservedKeyword =
        !guest ||
        guest.toLowerCase().includes('reserved') ||
        guest.toLowerCase().includes('not available');

      if (isReservedKeyword) {
        // Try to extract reservation confirmation code from description or uid
        const codeMatch =
          (evt.description || '').match(/code=([A-Z0-9]+)/i) ||
          (evt.description || '').match(/CONFIRMATION:\s*([A-Z0-9-]+)/i) ||
          externalId.match(/([A-Z0-9]{5,})/i);

        const guestIdentifier = codeMatch ? codeMatch[1] : externalId.slice(-6);
        guest = `${channel.toUpperCase()} Guest (${guestIdentifier})`;
      }

      const existingIndex = currentBookings.findIndex(
        (b) => b.roomId === roomId && b.externalBookingId === externalId
      );

      if (existingIndex !== -1) {
        currentBookings[existingIndex] = {
          ...currentBookings[existingIndex],
          checkIn: evt.checkIn,
          checkOut: evt.checkOut,
          nights,
          syncedAt: new Date().toISOString(),
        };
        updated++;
      } else {
        currentBookings.push({
          id: generateId('bk'),
          userId: user.id,
          roomId,
          guestName: guest,
          source: channel,
          externalBookingId: externalId,
          checkIn: evt.checkIn,
          checkOut: evt.checkOut,
          nights,
          totalAmount,
          paymentStatus: 'paid',
          notes: evt.description || `Synced from ${channel} iCal feed.`,
          isOfflineBlock: false,
          createdAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        });
        added++;
      }
    }

    const log: SyncLog = {
      id: generateId('log'),
      userId: user.id,
      feedId,
      channel,
      roomName: targetRoom.name,
      timestamp: new Date().toISOString(),
      status: 'success',
      eventsFound: parsedEvents.length,
      bookingsAdded: added,
      bookingsUpdated: updated,
      message: `Parsed ${parsedEvents.length} events from ${channel.toUpperCase()} feed. Added ${added}, updated ${updated}.`,
    };

    const nextLogs = [log, ...logs].slice(0, 50);
    setBookings(currentBookings);
    setLogs(nextLogs);
    persist({ bookings: currentBookings, logs: nextLogs });

    return {
      success: true,
      added,
      updated,
      message: `Successfully processed iCal feed! Added ${added} new reservations and updated ${updated}.`,
    };
  };

  const syncFeed = async (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId);
    if (!feed || !user) return { success: false, added: 0, updated: 0 };
    const room = rooms.find((r) => r.id === feed.roomId);
    if (!room) return { success: false, added: 0, updated: 0 };

    setFeeds((prev) =>
      prev.map((f) => (f.id === feedId ? { ...f, syncStatus: 'syncing', errorMessage: undefined } : f))
    );

    let icsContent = '';
    let fetchError: string | null = null;

    try {
      if (feed.feedUrl.startsWith('http')) {
        const resp = await fetch(`/api/ical/fetch?url=${encodeURIComponent(feed.feedUrl)}`);
        const data = await resp.json();
        if (data.success && data.ics) {
          icsContent = data.ics;
        } else {
          fetchError = data.error || 'Failed to fetch calendar feed from provider.';
        }
      } else {
        fetchError = 'Feed URL is not valid. Please provide a full http:// or https:// calendar export URL.';
      }
    } catch (err: any) {
      fetchError = `Sync connection error: ${err.message || 'Unable to connect to calendar server'}`;
    }

    if (fetchError || !icsContent) {
      const errMessage = fetchError || 'No calendar content retrieved.';
      const log: SyncLog = {
        id: generateId('log'),
        userId: user.id,
        feedId,
        channel: feed.channel,
        roomName: room.name,
        timestamp: new Date().toISOString(),
        status: 'error',
        eventsFound: 0,
        bookingsAdded: 0,
        bookingsUpdated: 0,
        message: `Sync failed for ${feed.name}: ${errMessage}`,
      };

      const nextLogs = [log, ...logs].slice(0, 50);
      setLogs(nextLogs);
      setFeeds((prev) =>
        prev.map((f) =>
          f.id === feedId
            ? {
                ...f,
                syncStatus: 'error',
                lastSyncedAt: new Date().toISOString(),
                errorMessage: errMessage,
              }
            : f
        )
      );
      persist({
        logs: nextLogs,
        feeds: feeds.map((f) =>
          f.id === feedId
            ? { ...f, syncStatus: 'error', lastSyncedAt: new Date().toISOString(), errorMessage: errMessage }
            : f
        ),
      });

      return { success: false, added: 0, updated: 0 };
    }

    const res = await importRawICal(room.id, feed.channel, icsContent, feed.id);

    setFeeds((prev) =>
      prev.map((f) =>
        f.id === feedId
          ? {
              ...f,
              syncStatus: res.success ? 'success' : 'error',
              lastSyncedAt: new Date().toISOString(),
              errorMessage: res.success ? undefined : res.message,
            }
          : f
      )
    );

    return { success: res.success, added: res.added, updated: res.updated };
  };

  const syncAllFeeds = async () => {
    if (feeds.length === 0) return;
    setIsSyncing(true);
    for (const feed of feeds) {
      await syncFeed(feed.id);
    }
    setIsSyncing(false);
  };

  const clearLogs = () => {
    setLogs([]);
    persist({ logs: [] });
  };

  const purgeDemoBookings = () => {
    const cleanBookings = bookings.filter((b) => !isFakeBooking(b));
    const cleanFeeds = feeds.filter((f) => !isFakeFeed(f));
    setBookings(cleanBookings);
    setFeeds(cleanFeeds);
    persist({ bookings: cleanBookings, feeds: cleanFeeds });
  };

  return (
    <DataContext.Provider
      value={{
        rooms,
        bookings,
        feeds,
        logs,
        isSyncing,
        isMultiDeviceLive,
        lastServerSync,
        refreshFromServer,
        addRoom,
        updateRoom,
        deleteRoom,
        addBooking,
        updateBooking,
        deleteBooking,
        checkConflicts,
        addFeed,
        deleteFeed,
        syncFeed,
        syncAllFeeds,
        importRawICal,
        clearLogs,
        purgeDemoBookings,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
