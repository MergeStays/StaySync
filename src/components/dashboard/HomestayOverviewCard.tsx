import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import heroImg from '../../assets/images/homestay_hero_exterior_1791572875041.jpg';
import {
  BedDouble,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';

interface HomestayOverviewCardProps {
  onOpenDirectBlock: () => void;
  onNavigateSync: () => void;
}

export const HomestayOverviewCard: React.FC<HomestayOverviewCardProps> = ({
  onOpenDirectBlock,
  onNavigateSync,
}) => {
  const { rooms, bookings, feeds, isSyncing, syncAllFeeds } = useData();
  const { user } = useAuth();
  const currency = user?.currency || '₹';

  const todayStr = new Date().toISOString().split('T')[0];

  const currentStays = bookings.filter(
    (b) => b.checkIn <= todayStr && b.checkOut > todayStr
  );
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const directBookingsCount = bookings.filter((b) => b.isOfflineBlock).length;
  const otaBookingsCount = bookings.length - directBookingsCount;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Visual Hero Banner with subtle overlay scrim */}
      <div className="relative h-44 sm:h-56 w-full overflow-hidden">
        <img
          src={heroImg}
          alt="Homestay Exterior"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        {/* Measured dark gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Content on top of hero */}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                Active Channel Manager
              </span>
              <span className="text-[10px] text-slate-300 flex items-center gap-1 backdrop-blur-md">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Host Vault Secured
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
              {user?.homestayName || 'Mountain Mist Homestay'}
            </h2>
            <p className="text-xs text-slate-300">
              {rooms.length} Units · {feeds.length} OTA Feeds Active
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDirectBlock}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Block Dates</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-t border-slate-800 bg-slate-950/60">
        {/* KPI 1 */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>In-House Today</span>
            <BedDouble className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white tabular-nums">
            {currentStays.length} / {rooms.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {rooms.length > 0
              ? `${Math.round((currentStays.length / rooms.length) * 100)}% Current Occupancy`
              : '0% Occupancy'}
          </p>
        </div>

        {/* KPI 2 */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Bookings</span>
            <CalendarCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white tabular-nums">
            {bookings.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {directBookingsCount} Direct · {otaBookingsCount} OTA
          </p>
        </div>

        {/* KPI 3 */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Gross Revenue</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tabular-nums">
            {currency}{totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Logged across all stays
          </p>
        </div>

        {/* KPI 4 */}
        <div className="p-3.5 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Channel Sync</span>
            <RefreshCw className={`w-4 h-4 text-teal-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div className="text-sm font-bold text-white">
            {feeds.length} Channels Linked
          </div>
          <button
            type="button"
            onClick={onNavigateSync}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium text-left mt-0.5"
          >
            Manage iCal Feeds →
          </button>
        </div>
      </div>
    </div>
  );
};
