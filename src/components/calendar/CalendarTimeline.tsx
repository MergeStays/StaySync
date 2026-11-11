import React, { useState } from 'react';
import { Booking, ChannelSource, Room } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { getChannelBadge } from '../../utils/channels';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Phone,
  Mail,
  ShieldAlert,
} from 'lucide-react';

interface CalendarTimelineProps {
  onOpenDirectBlockWithSelection: (roomId: string, dateStr: string) => void;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  onOpenDirectBlockWithSelection,
}) => {
  const { rooms, bookings, deleteBooking, updateBooking } = useData();
  const { user } = useAuth();
  const currency = user?.currency || '₹';

  // Date window state (starts today or offset)
  const [startOffsetDays, setStartOffsetDays] = useState(0);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null);

  // Generate 14-day window
  const daysCount = 14;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + startOffsetDays);

  const datesList: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
  const todayIso = new Date().toISOString().split('T')[0];

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    datesList.push({
      date: d,
      dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: dateStr === todayIso,
    });
  }

  const handlePrevDays = () => setStartOffsetDays((prev) => prev - 7);
  const handleNextDays = () => setStartOffsetDays((prev) => prev + 7);
  const handleJumpToday = () => setStartOffsetDays(0);

  // Filter bookings if channel filter is active
  const filteredBookings = bookings.filter((b) => {
    if (selectedChannelFilter === 'all') return true;
    if (selectedChannelFilter === 'offline') return b.isOfflineBlock;
    return b.source === selectedChannelFilter;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Date Controls & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <button
            type="button"
            onClick={handlePrevDays}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Previous 7 days"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleJumpToday}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handleNextDays}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Next 7 days"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-slate-200 ml-1">
            {datesList[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {datesList[datesList.length - 1]?.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'offline', label: 'Direct / Offline' },
            { id: 'airbnb', label: 'Airbnb' },
            { id: 'makemytrip', label: 'MMT' },
            { id: 'booking', label: 'Booking.com' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedChannelFilter(item.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedChannelFilter === item.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Gantt Timeline Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Header: Date Row */}
            <div className="grid grid-cols-[160px_repeat(14,minmax(48px,1fr))] border-b border-slate-800 bg-slate-950/70 sticky top-0 z-20">
              <div className="p-3 text-xs font-bold text-slate-400 flex items-center border-r border-slate-800">
                Rooms & Cottages
              </div>
              {datesList.map((col) => (
                <div
                  key={col.dateStr}
                  className={`p-2 text-center border-r border-slate-800/60 last:border-r-0 ${
                    col.isToday ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <div className={`text-[10px] uppercase font-semibold ${col.isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {col.dayName}
                  </div>
                  <div
                    className={`text-xs font-bold mt-0.5 inline-block w-6 h-6 leading-6 rounded-full ${
                      col.isToday ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-200'
                    }`}
                  >
                    {col.dayNum}
                  </div>
                </div>
              ))}
            </div>

            {/* Room Rows */}
            {rooms.map((room) => {
              const roomBookings = filteredBookings.filter((b) => b.roomId === room.id);

              return (
                <div
                  key={room.id}
                  className="grid grid-cols-[160px_repeat(14,minmax(48px,1fr))] border-b border-slate-800/80 last:border-b-0 min-h-[72px] relative group hover:bg-slate-800/50 transition-colors duration-150"
                >
                  {/* Left Room Title Column */}
                  <div className="p-3 border-r border-slate-800 bg-slate-900/95 group-hover:bg-slate-850 sticky left-0 z-10 flex flex-col justify-center transition-colors duration-150">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: room.color }}
                      />
                      <span className="text-xs font-bold text-white truncate" title={room.name}>
                        {room.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {currency}{room.basePrice.toLocaleString()} · Max {room.capacity}g
                    </span>
                  </div>

                  {/* 14 Date Cells (Clickable to Block Date) */}
                  {datesList.map((col) => {
                    return (
                      <button
                        key={col.dateStr}
                        type="button"
                        onClick={() => onOpenDirectBlockWithSelection(room.id, col.dateStr)}
                        title={`Click to block dates or create direct booking on ${col.dateStr}`}
                        className={`border-r border-slate-800/40 last:border-r-0 p-1 flex items-center justify-center relative hover:bg-slate-700/40 hover:backdrop-brightness-125 transition-colors duration-150 group/cell ${
                          col.isToday ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}

                  {/* Overlay Booking Bars */}
                  {roomBookings.map((bk) => {
                    const startIdx = datesList.findIndex((d) => d.dateStr === bk.checkIn);
                    const endIdx = datesList.findIndex((d) => d.dateStr === bk.checkOut);

                    // Calculate if visible in current 14-day window
                    const windowStartStr = datesList[0].dateStr;
                    const windowEndStr = datesList[datesList.length - 1].dateStr;

                    if (bk.checkOut <= windowStartStr || bk.checkIn > windowEndStr) {
                      return null; // out of current view
                    }

                    // Compute span
                    let effectiveColStart = startIdx >= 0 ? startIdx + 2 : 2; // +2 offset for room column
                    let effectiveColEnd =
                      endIdx >= 0 ? endIdx + 2 : datesList.length + 2;

                    if (effectiveColEnd <= effectiveColStart) {
                      effectiveColEnd = effectiveColStart + 1;
                    }

                    const badge = getChannelBadge(bk.source);

                    return (
                      <div
                        key={bk.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedBooking(bk);
                        }}
                        style={{
                          gridColumnStart: effectiveColStart,
                          gridColumnEnd: effectiveColEnd,
                        }}
                        className={`absolute inset-y-2 mx-1 rounded-xl p-2 cursor-pointer shadow-md z-10 flex items-center justify-between gap-1 overflow-hidden transition-all duration-150 hover:scale-[1.015] hover:brightness-140 hover:shadow-lg hover:shadow-black/50 border ${badge.borderColor} ${badge.bgColor}`}
                      >
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white tracking-wider shrink-0"
                            style={{ backgroundColor: badge.tagColor }}
                          >
                            {badge.logoPlaceholder}
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {bk.isOfflineBlock && bk.source === 'block'
                              ? 'Blocked: Maintenance'
                              : bk.guestName}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-300 shrink-0 font-medium hidden sm:inline tabular-nums">
                          {bk.nights}n
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Guide */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 font-medium">Channel Indicators:</span>
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF385C]" /> Airbnb
          </span>
          <span className="flex items-center gap-1 text-red-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA2330]" /> MakeMyTrip
          </span>
          <span className="flex items-center gap-1 text-sky-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#003580]" /> Booking.com
          </span>
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Direct Offline
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]" /> Maintenance Block
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Tip: Tap any empty date block to directly reserve or block dates.
        </div>
      </div>

      {/* Booking Details Modal */}
      {inspectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded text-white tracking-wider"
                  style={{ backgroundColor: getChannelBadge(inspectedBooking.source).tagColor }}
                >
                  {getChannelBadge(inspectedBooking.source).name}
                </span>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {inspectedBooking.guestName}
                </h3>
                <p className="text-xs text-slate-400">
                  {rooms.find((r) => r.id === inspectedBooking.roomId)?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedBooking(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stay Dates */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Check-in</span>
                <span className="font-bold text-white">{inspectedBooking.checkIn}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Check-out</span>
                <span className="font-bold text-white">{inspectedBooking.checkOut}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
                <span>Duration: {inspectedBooking.nights} Nights</span>
                <span className="font-bold text-emerald-400">
                  {inspectedBooking.totalAmount > 0
                    ? `${currency}${inspectedBooking.totalAmount.toLocaleString()} (${inspectedBooking.paymentStatus.toUpperCase()})`
                    : 'Blocked / Non-revenue'}
                </span>
              </div>
            </div>

            {/* Contact details */}
            {(inspectedBooking.guestPhone || inspectedBooking.guestEmail) && (
              <div className="space-y-1.5 text-xs text-slate-300">
                {inspectedBooking.guestPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{inspectedBooking.guestPhone}</span>
                  </div>
                )}
                {inspectedBooking.guestEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{inspectedBooking.guestEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {inspectedBooking.notes && (
              <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-slate-300 block mb-0.5">Notes:</span>
                {inspectedBooking.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  deleteBooking(inspectedBooking.id);
                  setInspectedBooking(null);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel / Remove</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectedBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
