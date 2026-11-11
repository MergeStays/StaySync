import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-amber-500/90 backdrop-blur-md px-4 py-2 text-xs font-semibold text-slate-950 shadow-xl border border-amber-400">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 stroke-[2.5]" />
        <span>Offline Mode: Using local homestay storage</span>
      </div>
      <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded">
        Changes Saved Locally
      </span>
    </div>
  );
};
