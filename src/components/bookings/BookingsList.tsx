import React, { useState } from 'react';
import { Booking, ChannelSource } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { getChannelBadge } from '../../utils/channels';
import {
  Search,
  Calendar,
  Phone,
  Mail,
  Trash2,
  Lock,
  PlusCircle,
  Tag,
  CheckCircle,
} from 'lucide-react';

interface BookingsListProps {
  onOpenDirectBlock: () => void;
}

export const BookingsList: React.FC<BookingsListProps> = ({ onOpenDirectBlock }) => {
  const { bookings, rooms, deleteBooking, purgeDemoBookings } = useData();
  const { user } = useAuth();
  const currency = user?.currency || '₹';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'current' | 'past'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const hasDemoBookings = bookings.some(
    (b) =>
      b.externalBookingId === 'HM9302149X' ||
      b.externalBookingId === 'MMT-IND-88201' ||
      b.externalBookingId === 'DIR-2026-004' ||
      b.externalBookingId === 'BKNG-3928172' ||
      b.externalBookingId === 'MAINT-OCT-01' ||
      b.id.startsWith('bk_1794407846310_') ||
      b.guestName.includes('Liam & Emma Watson') ||
      b.guestName.includes('Rajesh & Priya') ||
      b.guestName.includes('Amit Verma (WhatsApp Walk-in)') ||
      b.guestName.includes('Carlos Mendonca')
  );

  // Filtering
  const filteredBookings = bookings.filter((b) => {
    // Channel filter
    if (selectedChannel === 'offline' && !b.isOfflineBlock) return false;
    if (selectedChannel !== 'all' && selectedChannel !== 'offline' && b.source !== selectedChannel) return false;

    // Time filter
    if (timeFilter === 'current') {
      if (!(b.checkIn <= todayStr && b.checkOut > todayStr)) return false;
    } else if (timeFilter === 'upcoming') {
      if (b.checkIn <= todayStr) return false;
    } else if (timeFilter === 'past') {
      if (b.checkOut > todayStr) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const guestMatch = b.guestName.toLowerCase().includes(q);
      const extMatch = b.externalBookingId?.toLowerCase().includes(q);
      const roomMatch = rooms.find((r) => r.id === b.roomId)?.name.toLowerCase().includes(q);
      if (!guestMatch && !extMatch && !roomMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Top Controls Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              All Bookings & Channel Log
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review OTA channel reservations and direct offline blocks ({filteredBookings.length} total)
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenDirectBlock}
            className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all shrink-0 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Block / New Direct</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest name, reservation code, or room..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Channel & Time Filter buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Sources' },
              { id: 'offline', label: 'Direct Offline' },
              { id: 'airbnb', label: 'Airbnb' },
              { id: 'makemytrip', label: 'MakeMyTrip' },
              { id: 'booking', label: 'Booking.com' },
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChannel(ch.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  selectedChannel === ch.id
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'current', label: 'In-House' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'past', label: 'Past' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeFilter(tf.id as any)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  timeFilter === tf.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Purge Demo Bookings Notification Banner */}
      {hasDemoBookings && (
        <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-200">
              Sample template bookings detected. You can remove all sample stays to keep only your real Airbnb reservations.
            </span>
          </div>
          <button
            type="button"
            onClick={purgeDemoBookings}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0"
          >
            Remove Sample Bookings
          </button>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.map((bk) => {
          const room = rooms.find((r) => r.id === bk.roomId);
          const channelMeta = getChannelBadge(bk.source);
          const isCurrent = bk.checkIn <= todayStr && bk.checkOut > todayStr;
          const isUpcoming = bk.checkIn > todayStr;

          return (
            <div
              key={bk.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors"
            >
              {/* Top Row: Channel Badge & Room */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Channel Tag */}
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white tracking-wide uppercase flex items-center gap-1.5 shadow-sm"
                    style={{ backgroundColor: channelMeta.tagColor }}
                  >
                    <span>{channelMeta.name}</span>
                  </span>

                  {/* Offline Block Tag */}
                  {bk.isOfflineBlock && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Offline Direct Block
                    </span>
                  )}

                  {/* Status Indicator */}
                  {isCurrent && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Active In-House
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      Upcoming
                    </span>
                  )}
                </div>

                {/* Amount / Rate */}
                <div className="text-right shrink-0">
                  {bk.totalAmount > 0 ? (
                    <div>
                      <span className="text-sm sm:text-base font-bold text-white tabular-nums">
                        {currency}{bk.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        {bk.paymentStatus}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Maintenance</span>
                  )}
                </div>
              </div>

              {/* Guest & Room Info */}
              <div className="mb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-white">
                    {bk.guestName}
                  </h3>
                  {bk.externalBookingId && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Ref: {bk.externalBookingId}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: room?.color || '#059669' }}
                  />
                  <span>{room?.name || 'Assigned Room'}</span>
                  <span>·</span>
                  <span className="text-slate-400">{room?.type}</span>
                </div>
              </div>

              {/* Date & Stay Duration Strip */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      <strong>{bk.checkIn}</strong> to <strong>{bk.checkOut}</strong>
                    </span>
                  </div>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400 font-semibold tabular-nums">
                    {bk.nights} Night{bk.nights > 1 ? 's' : ''}
                  </span>
                </div>

                {bk.syncedAt && (
                  <span className="text-[10px] text-slate-500">
                    Synced: {new Date(bk.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Guest contact details & notes if available */}
              {(bk.guestPhone || bk.guestEmail || bk.notes) && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-3 flex-wrap">
                    {bk.guestPhone && (
                      <a
                        href={`tel:${bk.guestPhone}`}
                        className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors"
                      >
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{bk.guestPhone}</span>
                      </a>
                    )}
                    {bk.guestEmail && (
                      <a
                        href={`mailto:${bk.guestEmail}`}
                        className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors"
                      >
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{bk.guestEmail}</span>
                      </a>
                    )}
                  </div>
                  {bk.notes && (
                    <span className="italic text-[11px] text-slate-400 truncate max-w-xs">
                      "{bk.notes}"
                    </span>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="mt-3 pt-2 flex items-center justify-end gap-2">
                {confirmDeleteId === bk.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-400">Cancel this stay?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteBooking(bk.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                    >
                      Yes, Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(bk.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel / Remove</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredBookings.length === 0 && (
          <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No bookings match filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Try adjusting your search terms or filter selection.
            </p>
            <button
              type="button"
              onClick={onOpenDirectBlock}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Direct Booking</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
