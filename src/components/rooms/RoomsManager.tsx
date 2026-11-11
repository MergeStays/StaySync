import React, { useState } from 'react';
import { Room } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { downloadICalFile } from '../../services/ical';
import { RoomModal } from './RoomModal';
import {
  BedDouble,
  Users,
  Plus,
  Trash2,
  Edit2,
  Download,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface RoomsManagerProps {
  onOpenDirectBlock: (roomId?: string) => void;
}

export const RoomsManager: React.FC<RoomsManagerProps> = ({ onOpenDirectBlock }) => {
  const { rooms, bookings, addRoom, updateRoom, deleteRoom } = useData();
  const { user } = useAuth();
  const currency = user?.currency || '₹';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleSaveRoom = (data: Omit<Room, 'id' | 'userId' | 'createdAt'>) => {
    if (editingRoom) {
      updateRoom(editingRoom.id, data);
    } else {
      addRoom(data);
    }
  };

  const handleDelete = (roomId: string) => {
    setDeleteError(null);
    const res = deleteRoom(roomId);
    if (!res.success) {
      setDeleteError(res.error || 'Failed to remove room.');
    } else {
      setDeleteConfirmRoomId(null);
    }
  };

  const handleCopyICalLink = (room: Room) => {
    const fakeUrl = `${window.location.origin}/api/ical/${room.id}.ics`;
    navigator.clipboard.writeText(fakeUrl);
    setCopiedRoomId(room.id);
    setTimeout(() => setCopiedRoomId(null), 2500);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header & Add Room CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-emerald-400" />
            <span>Room & Inventory Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your homestay cottages, suites, base pricing, and iCal sync exports
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {deleteError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Rooms List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.roomId === room.id);
          const currentGuest = roomBookings.find(
            (b) => b.checkIn <= todayStr && b.checkOut > todayStr
          );
          const upcomingCount = roomBookings.filter(
            (b) => b.checkIn > todayStr
          ).length;

          return (
            <div
              key={room.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group"
            >
              {/* Room color indicator bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: room.color }}
              />

              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: room.color }}
                      />
                      <h3 className="text-base font-bold text-white truncate">
                        {room.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{room.type}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Max {room.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                      {currency}{room.basePrice.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-500 block">/ night</span>
                  </div>
                </div>

                {/* Description */}
                {room.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 my-2">
                    {room.description}
                  </p>
                )}

                {/* Status & Live Occupancy */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 my-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Today's Status: </span>
                    {currentGuest ? (
                      <span className="font-semibold text-amber-300">
                        Occupied · {currentGuest.guestName} ({currentGuest.source.toUpperCase()})
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-400">
                        Vacant & Ready
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {upcomingCount} upcoming
                  </span>
                </div>

                {/* Amenities pills */}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {room.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="text-[10px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60"
                      >
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 4 && (
                      <span className="text-[10px] text-slate-500 self-center">
                        +{room.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons row */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  {/* Download iCal */}
                  <button
                    type="button"
                    onClick={() => downloadICalFile(room, bookings, user?.homestayName || 'Homestay')}
                    title="Download room's iCalendar .ics file"
                    className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-xs flex items-center gap-1 transition-colors border border-slate-700/60"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Export .ics</span>
                  </button>

                  {/* Copy iCal Feed Link */}
                  <button
                    type="button"
                    onClick={() => handleCopyICalLink(room)}
                    title="Copy iCal export URL for Airbnb / MMT / Booking.com"
                    className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-xs flex items-center gap-1 transition-colors border border-slate-700/60"
                  >
                    {copiedRoomId === room.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedRoomId === room.id ? 'Copied' : 'iCal Link'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenDirectBlock(room.id)}
                    className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors"
                  >
                    Block Date
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(room)}
                    aria-label="Edit room"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {deleteConfirmRoomId === room.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(room.id)}
                        className="px-2 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmRoomId(null)}
                        className="px-1.5 py-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmRoomId(room.id)}
                      aria-label="Delete room"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <BedDouble className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">No rooms added yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Add your homestay's cottages, rooms, or suites to start managing bookings and sync calendars.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Room</span>
          </button>
        </div>
      )}

      {/* Room Modal */}
      <RoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRoom}
        initialRoom={editingRoom}
      />
    </div>
  );
};
