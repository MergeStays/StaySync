import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { calculateNights } from '../../services/ical';
import {
  X,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface DirectBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedRoomId?: string;
  preselectedCheckIn?: string;
  preselectedCheckOut?: string;
}

export const DirectBookingModal: React.FC<DirectBookingModalProps> = ({
  isOpen,
  onClose,
  preselectedRoomId,
  preselectedCheckIn,
  preselectedCheckOut,
}) => {
  const { rooms, addBooking, checkConflicts } = useData();
  const { user } = useAuth();

  const [bookingMode, setBookingMode] = useState<'direct' | 'block'>('direct');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');

  // Guest fields
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'pending' | 'blocked'>('paid');
  const [notes, setNotes] = useState<string>('');

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 2);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      setCheckIn(preselectedCheckIn || todayStr);
      setCheckOut(preselectedCheckOut || tomorrowStr);

      const targetRoom =
        rooms.find((r) => r.id === preselectedRoomId) || rooms[0];
      if (targetRoom) {
        setSelectedRoomId(targetRoom.id);
        const nights = calculateNights(
          preselectedCheckIn || todayStr,
          preselectedCheckOut || tomorrowStr
        );
        setTotalAmount(targetRoom.basePrice * nights);
      }

      setBookingMode('direct');
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setPaymentStatus('paid');
      setNotes('');
      setConflictWarning(null);
      setSubmitError(null);
    }
  }, [isOpen, preselectedRoomId, preselectedCheckIn, preselectedCheckOut, rooms]);

  // Recalculate price and conflict whenever room or dates change
  useEffect(() => {
    if (!selectedRoomId || !checkIn || !checkOut) return;

    const currentRoom = rooms.find((r) => r.id === selectedRoomId);
    const nights = calculateNights(checkIn, checkOut);

    if (bookingMode === 'direct' && currentRoom) {
      setTotalAmount(currentRoom.basePrice * nights);
    } else if (bookingMode === 'block') {
      setTotalAmount(0);
      setPaymentStatus('blocked');
    }

    // Check conflicts
    if (checkIn && checkOut && new Date(checkOut) > new Date(checkIn)) {
      const conflicts = checkConflicts(selectedRoomId, checkIn, checkOut);
      if (conflicts.length > 0) {
        const c = conflicts[0];
        setConflictWarning(
          `Conflict: Already booked by ${c.guestName} (${c.source.toUpperCase()}) from ${c.checkIn} to ${c.checkOut}.`
        );
      } else {
        setConflictWarning(null);
      }
    }
  }, [selectedRoomId, checkIn, checkOut, bookingMode, rooms, checkConflicts]);

  if (!isOpen) return null;

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1;
  const currency = user?.currency || '₹';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedRoomId) {
      setSubmitError('Please select a room.');
      return;
    }

    if (!checkIn || !checkOut) {
      setSubmitError('Please select both check-in and check-out dates.');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setSubmitError('Check-out date must be after check-in date.');
      return;
    }

    const finalGuestName =
      bookingMode === 'block'
        ? guestName.trim() || 'Blocked - Maintenance / Personal'
        : guestName.trim();

    if (bookingMode === 'direct' && !finalGuestName) {
      setSubmitError('Please provide the guest name for direct booking.');
      return;
    }

    const res = addBooking({
      roomId: selectedRoomId,
      guestName: finalGuestName,
      guestPhone: guestPhone.trim() || undefined,
      guestEmail: guestEmail.trim() || undefined,
      source: bookingMode === 'block' ? 'block' : 'direct',
      checkIn,
      checkOut,
      nights,
      totalAmount: bookingMode === 'block' ? 0 : Number(totalAmount),
      paymentStatus: bookingMode === 'block' ? 'blocked' : paymentStatus,
      notes: notes.trim() || undefined,
      isOfflineBlock: true,
    });

    if (!res.success) {
      setSubmitError(res.error || 'Failed to save booking.');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {bookingMode === 'direct' ? 'Direct Offline Booking' : 'Block Dates (Offline)'}
            </h2>
            <p className="text-xs text-slate-400">
              Directly reserve room & sync dates across all channels
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setBookingMode('direct')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                bookingMode === 'direct'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Direct Guest Booking</span>
            </button>
            <button
              type="button"
              onClick={() => setBookingMode('block')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                bookingMode === 'block'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Maintenance Block</span>
            </button>
          </div>

          {/* Conflict Alert */}
          {conflictWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {submitError}
            </div>
          )}

          {/* Room Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Room / Unit *
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.type} · Max {room.capacity} guests · {currency}
                  {room.basePrice.toLocaleString()}/night)
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Check-in Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Check-out Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Duration: <strong className="text-white">{nights} Night{nights > 1 ? 's' : ''}</strong>
            </span>
            <span>
              Turnover: check-out noon
            </span>
          </div>

          {/* Conditional Guest Info vs Blockout Details */}
          {bookingMode === 'direct' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Guest Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@mail.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Total Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(
                        e.target.value as 'paid' | 'partial' | 'pending' | 'blocked'
                      )
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="paid">Paid in Full</option>
                    <option value="partial">Advance Received</option>
                    <option value="pending">Payment Pending</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Blockout Reason / Label
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Owner Stay / Roof Painting / Deep Cleaning"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Host Notes & Special Requests
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra mattress requested, arrived via local cab."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {bookingMode === 'direct'
                  ? 'Confirm Direct Booking'
                  : 'Block Room Dates'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
