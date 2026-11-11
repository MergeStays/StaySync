import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { RefreshCw, User, PlusCircle, Check } from 'lucide-react';

interface TopHeaderProps {
  onOpenDirectBooking: () => void;
  onOpenSettings: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenDirectBooking,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const { syncAllFeeds, isSyncing, bookings, isMultiDeviceLive, refreshFromServer } = useData();

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTodayCount = bookings.filter(
    (b) => b.checkIn <= todayStr && b.checkOut > todayStr
  ).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Homestay Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-sm">
            <span className="text-white font-bold text-sm tracking-tight">
              {user?.homestayName ? user.homestayName.charAt(0).toUpperCase() : 'H'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                {user?.homestayName || 'My Homestay'}
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activeTodayCount} Stays Today
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
              <span className="truncate">{user?.name}</span>
              <span>·</span>
              {/* Multi-Device Live Sync Indicator */}
              <button
                type="button"
                onClick={() => refreshFromServer()}
                title="Multi-Device Cloud Sync Active: Changes made on your phone or computer are synchronized."
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20 transition-colors"
              >
                <Check className="w-2.5 h-2.5" />
                <span>Multi-Device Synced</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Sync Button */}
          <button
            type="button"
            onClick={() => syncAllFeeds()}
            disabled={isSyncing}
            aria-label="Sync all OTA channels"
            className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSyncing
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 active:scale-95'
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`}
            />
            <span className="hidden sm:inline">
              {isSyncing ? 'Syncing...' : 'Sync OTAs'}
            </span>
          </button>

          {/* Quick Direct Block CTA */}
          <button
            type="button"
            onClick={onOpenDirectBooking}
            className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Block / Direct</span>
            <span className="sm:hidden">Block</span>
          </button>

          {/* Settings / Account Menu Trigger */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Account Settings"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center active:scale-95 transition-all"
          >
            <User className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
