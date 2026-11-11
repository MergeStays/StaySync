import React from 'react';
import { Calendar, ListFilter, BedDouble, RefreshCw, Plus } from 'lucide-react';

export type TabType = 'timeline' | 'bookings' | 'rooms' | 'sync';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenDirectBlock: () => void;
  syncFeedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenDirectBlock,
  syncFeedCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {/* Tab 1: Calendar / Timeline */}
        <button
          type="button"
          onClick={() => onChangeTab('timeline')}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center relative transition-colors"
        >
          <Calendar
            className={`w-5 h-5 transition-transform ${
              activeTab === 'timeline'
                ? 'text-emerald-400 scale-110'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          />
          <span
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              activeTab === 'timeline' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Calendar
          </span>
          {activeTab === 'timeline' && (
            <span className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Tab 2: Bookings List */}
        <button
          type="button"
          onClick={() => onChangeTab('bookings')}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center relative transition-colors"
        >
          <ListFilter
            className={`w-5 h-5 transition-transform ${
              activeTab === 'bookings'
                ? 'text-emerald-400 scale-110'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          />
          <span
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              activeTab === 'bookings' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Bookings
          </span>
          {activeTab === 'bookings' && (
            <span className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Center: Quick Action Block Date FAB */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenDirectBlock}
            aria-label="Direct Block Date"
            className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-slate-900 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Rooms Inventory */}
        <button
          type="button"
          onClick={() => onChangeTab('rooms')}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center relative transition-colors"
        >
          <BedDouble
            className={`w-5 h-5 transition-transform ${
              activeTab === 'rooms'
                ? 'text-emerald-400 scale-110'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          />
          <span
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              activeTab === 'rooms' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Rooms
          </span>
          {activeTab === 'rooms' && (
            <span className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Tab 4: iCal Sync */}
        <button
          type="button"
          onClick={() => onChangeTab('sync')}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center relative transition-colors"
        >
          <RefreshCw
            className={`w-5 h-5 transition-transform ${
              activeTab === 'sync'
                ? 'text-emerald-400 scale-110'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          />
          <span
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              activeTab === 'sync' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Sync iCal
          </span>
          {syncFeedCount > 0 && activeTab !== 'sync' && (
            <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-emerald-400" />
          )}
          {activeTab === 'sync' && (
            <span className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>
    </nav>
  );
};
