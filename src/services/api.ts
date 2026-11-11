import { Booking, ICalFeed, Room, SyncLog, User } from '../types';

export interface HomestaySyncData {
  rooms: Room[];
  bookings: Booking[];
  feeds: ICalFeed[];
  logs: SyncLog[];
  lastUpdated?: string;
}

// Multi-device API client
export const api = {
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Network error connecting to homestay server.' };
    }
  },

  async signup(
    email: string,
    password: string,
    name: string,
    homestayName: string,
    currency = '₹'
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, homestayName, currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed.' };
      }
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Network error connecting to homestay server.' };
    }
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Reset request failed.' };
      }
      return { success: true, token: data.token };
    } catch {
      return { success: false, error: 'Network error connecting to homestay server.' };
    }
  },

  async resetPassword(
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Password reset failed.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error connecting to homestay server.' };
    }
  },

  async updateProfile(
    userId: string,
    name: string,
    homestayName: string,
    currency: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, homestayName, currency }),
      });
      const data = await res.json();
      return { success: res.ok, user: data.user };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  // Fetch central homestay data for this host (allows seamless cross-device synchronization)
  async fetchHomestayData(userId: string): Promise<HomestaySyncData | null> {
    try {
      const res = await fetch(`/api/homestay/${userId}/data`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          rooms: data.rooms || [],
          bookings: data.bookings || [],
          feeds: data.feeds || [],
          logs: data.logs || [],
          lastUpdated: data.lastUpdated,
        };
      }
    } catch {
      // Offline fallback
    }
    return null;
  },

  // Save changes to central server (instantly shared with all other devices logged in as this host)
  async saveHomestayData(userId: string, data: HomestaySyncData): Promise<boolean> {
    try {
      const res = await fetch(`/api/homestay/${userId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
