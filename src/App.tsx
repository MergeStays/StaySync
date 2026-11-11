import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNav, TabType } from './components/layout/BottomNav';
import { CalendarTimeline } from './components/calendar/CalendarTimeline';
import { BookingsList } from './components/bookings/BookingsList';
import { RoomsManager } from './components/rooms/RoomsManager';
import { ICalSyncHub } from './components/sync/ICalSyncHub';
import { DirectBookingModal } from './components/bookings/DirectBookingModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { HomestayOverviewCard } from './components/dashboard/HomestayOverviewCard';
import { OfflineIndicator } from './components/common/OfflineIndicator';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { feeds } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('timeline');

  // Direct Booking Modal state
  const [isDirectBookingOpen, setIsDirectBookingOpen] = useState(false);
  const [preselectedRoomId, setPreselectedRoomId] = useState<string | undefined>();
  const [preselectedCheckIn, setPreselectedCheckIn] = useState<string | undefined>();
  const [preselectedCheckOut, setPreselectedCheckOut] = useState<string | undefined>();

  // Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check Android shortcut params on launch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const tab = params.get('tab');

    if (action === 'block') {
      setIsDirectBookingOpen(true);
    }
    if (tab && ['timeline', 'bookings', 'rooms', 'sync'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handleOpenDirectBooking = () => {
    setPreselectedRoomId(undefined);
    setPreselectedCheckIn(undefined);
    setPreselectedCheckOut(undefined);
    setIsDirectBookingOpen(true);
  };

  const handleOpenDirectBookingWithRoom = (roomId?: string) => {
    setPreselectedRoomId(roomId);
    setPreselectedCheckIn(undefined);
    setPreselectedCheckOut(undefined);
    setIsDirectBookingOpen(true);
  };

  const handleOpenDirectBookingWithDate = (roomId: string, dateStr: string) => {
    const nextDate = new Date(dateStr);
    nextDate.setDate(nextDate.getDate() + 2);
    const checkOutStr = nextDate.toISOString().split('T')[0];

    setPreselectedRoomId(roomId);
    setPreselectedCheckIn(dateStr);
    setPreselectedCheckOut(checkOutStr);
    setIsDirectBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Header App Bar */}
      <TopHeader
        onOpenDirectBooking={handleOpenDirectBooking}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Homestay Overview Banner & Quick KPIs */}
        <HomestayOverviewCard
          onOpenDirectBlock={handleOpenDirectBooking}
          onNavigateSync={() => setActiveTab('sync')}
        />

        {/* Dynamic View based on Active Tab */}
        {activeTab === 'timeline' && (
          <CalendarTimeline
            onOpenDirectBlockWithSelection={handleOpenDirectBookingWithDate}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsList onOpenDirectBlock={handleOpenDirectBooking} />
        )}

        {activeTab === 'rooms' && (
          <RoomsManager onOpenDirectBlock={handleOpenDirectBookingWithRoom} />
        )}

        {activeTab === 'sync' && <ICalSyncHub />}
      </main>

      {/* Android Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenDirectBlock={handleOpenDirectBooking}
        syncFeedCount={feeds.length}
      />

      {/* Direct Booking & Block Dates Modal */}
      <DirectBookingModal
        isOpen={isDirectBookingOpen}
        onClose={() => setIsDirectBookingOpen(false)}
        preselectedRoomId={preselectedRoomId}
        preselectedCheckIn={preselectedCheckIn}
        preselectedCheckOut={preselectedCheckOut}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Offline Connectivity Status Notification */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainAppContent />
      </DataProvider>
    </AuthProvider>
  );
}
