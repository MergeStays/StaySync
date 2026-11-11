import React, { useState, useEffect } from 'react';
import { Room } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, BedDouble, Check } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roomData: Omit<Room, 'id' | 'userId' | 'createdAt'>) => void;
  initialRoom?: Room | null;
}

const AVAILABLE_AMENITIES = [
  'Mountain View',
  'Valley View',
  'Tea Garden Access',
  'Private Balcony',
  'King Bed',
  'Queen Bed',
  'Twin Beds',
  'Fireplace',
  'Room Heater',
  'En-suite Bath',
  'Hot Water 24/7',
  'High-Speed Wi-Fi',
  'Breakfast Included',
  'Workstation Desk',
  'Smart TV',
  'Mini Fridge',
];

const PRESET_COLORS = [
  '#059669', // Emerald
  '#0284C7', // Sky
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#0D9488', // Teal
  '#4F46E5', // Indigo
];

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRoom,
}) => {
  const { user } = useAuth();
  const currency = user?.currency || '₹';

  const [name, setName] = useState('');
  const [type, setType] = useState('Deluxe Cottage');
  const [capacity, setCapacity] = useState(2);
  const [basePrice, setBasePrice] = useState(3000);
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [color, setColor] = useState('#059669');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialRoom) {
      setName(initialRoom.name);
      setType(initialRoom.type);
      setCapacity(initialRoom.capacity);
      setBasePrice(initialRoom.basePrice);
      setDescription(initialRoom.description || '');
      setAmenities(initialRoom.amenities || []);
      setColor(initialRoom.color || '#059669');
      setIsActive(initialRoom.isActive);
    } else {
      setName('');
      setType('Deluxe Cottage');
      setCapacity(2);
      setBasePrice(3200);
      setDescription('');
      setAmenities(['Mountain View', 'King Bed', 'Hot Water 24/7', 'High-Speed Wi-Fi']);
      setColor('#059669');
      setIsActive(true);
    }
  }, [initialRoom, isOpen]);

  if (!isOpen) return null;

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type: type.trim(),
      capacity: Number(capacity),
      basePrice: Number(basePrice),
      description: description.trim() || undefined,
      amenities,
      color,
      isActive,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialRoom ? 'Edit Homestay Room' : 'Add New Room / Cottage'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure room details, rate, and calendar label
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Room / Cottage Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pine Ridge Cottage / Riverfront Deluxe"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Room Category / Type
              </label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. Deluxe Room / Wooden Cottage"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Max Guest Capacity
              </label>
              <input
                type="number"
                min={1}
                max={16}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Base Rate / Night ({currency})
              </label>
              <input
                type="number"
                min={0}
                required
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Timeline Badge Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                      color === c ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-80'
                    }`}
                  >
                    {color === c && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Scenic wooden cottage with private veranda and valley view."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Amenities checklist */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Features & Amenities
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
              {AVAILABLE_AMENITIES.map((item) => {
                const selected = amenities.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleAmenity(item)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors flex items-center justify-between ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {selected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status switch */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white">Room Availability Status</div>
              <div className="text-[11px] text-slate-400">
                {isActive ? 'Room is active and open for bookings' : 'Temporarily paused / hidden'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isActive ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              {initialRoom ? 'Save Room Changes' : 'Create Room & Generate iCal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
