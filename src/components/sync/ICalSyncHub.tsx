import React, { useState, useRef } from 'react';
import { ChannelSource, ICalFeed, Room } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { downloadICalFile, getAirbnbSampleFeed, getSampleOtaFeed } from '../../services/ical';
import { getChannelBadge } from '../../utils/channels';
import {
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Upload,
} from 'lucide-react';

export const ICalSyncHub: React.FC = () => {
  const {
    rooms,
    feeds,
    logs,
    addFeed,
    deleteFeed,
    syncFeed,
    syncAllFeeds,
    isSyncing,
    importRawICal,
    clearLogs,
  } = useData();
  const { user } = useAuth();

  // Add Feed Modal / Form state
  const [showAddFeedForm, setShowAddFeedForm] = useState(false);
  const [feedRoomId, setFeedRoomId] = useState(rooms[0]?.id || '');
  const [feedChannel, setFeedChannel] = useState<ChannelSource>('airbnb');
  const [feedName, setFeedName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [addFeedError, setAddFeedError] = useState<string | null>(null);

  // Raw iCal import / paste modal
  const [showRawImport, setShowRawImport] = useState(false);
  const [rawRoomId, setRawRoomId] = useState(rooms[0]?.id || '');
  const [rawChannel, setRawChannel] = useState<ChannelSource>('airbnb');
  const [rawIcsText, setRawIcsText] = useState('');
  const [isProcessingRaw, setIsProcessingRaw] = useState(false);
  const [rawImportFeedback, setRawImportFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copied feed link notification
  const [copiedFeedId, setCopiedFeedId] = useState<string | null>(null);

  const handleCopyExportUrl = (room: Room) => {
    const url = `${window.location.origin}/api/ical/export/${room.id}.ics?channel=airbnb`;
    navigator.clipboard.writeText(url);
    setCopiedFeedId(room.id);
    setTimeout(() => setCopiedFeedId(null), 2500);
  };

  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFeedError(null);

    if (!feedRoomId) {
      setAddFeedError('Please select a room.');
      return;
    }
    if (!feedUrl.trim()) {
      setAddFeedError('Please paste a valid iCalendar .ics URL.');
      return;
    }

    const room = rooms.find((r) => r.id === feedRoomId);
    const channelName = getChannelBadge(feedChannel).name;
    const finalName = feedName.trim() || `${channelName} - ${room?.name || 'Room'}`;

    addFeed({
      roomId: feedRoomId,
      channel: feedChannel,
      name: finalName,
      feedUrl: feedUrl.trim(),
      autoSync: true,
    });

    setFeedName('');
    setFeedUrl('');
    setShowAddFeedForm(false);
  };

  const handleRawImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setRawImportFeedback(null);

    if (!rawRoomId || !rawIcsText.trim()) {
      setRawImportFeedback({
        success: false,
        message: 'Please select a room and paste valid iCal text or feed URL.',
      });
      return;
    }

    setIsProcessingRaw(true);
    try {
      const res = await importRawICal(rawRoomId, rawChannel, rawIcsText.trim());
      setRawImportFeedback({
        success: res.success,
        message: res.message,
      });

      if (res.success) {
        setRawIcsText('');
      }
    } catch (err: any) {
      setRawImportFeedback({
        success: false,
        message: `Import error: ${err.message || 'Failed to process iCal'}`,
      });
    } finally {
      setIsProcessingRaw(false);
    }
  };

  // Handle local .ics file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawIcsText(text);
        setRawImportFeedback({
          success: true,
          message: `Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Click "Parse & Sync Bookings" to import.`,
        });
      }
    };
    reader.onerror = () => {
      setRawImportFeedback({
        success: false,
        message: 'Failed to read the selected .ics file.',
      });
    };
    reader.readAsText(file);
    // Reset file input so user can choose same file again if desired
    e.target.value = '';
  };

  // Populate sample Airbnb .ics for quick testing
  const handleLoadAirbnbSample = () => {
    const room = rooms.find((r) => r.id === rawRoomId) || rooms[0];
    const sample = getAirbnbSampleFeed(room?.name || 'Cottage');
    setRawIcsText(sample);
    setRawChannel('airbnb');
    setRawImportFeedback({
      success: true,
      message: 'Loaded sample Airbnb multi-night reservation export format with DTEND/DTSTART and reserved summary.',
    });
  };

  // Populate sample MMT .ics for quick testing
  const handleLoadMmtSample = () => {
    const room = rooms.find((r) => r.id === rawRoomId) || rooms[0];
    const sample = getSampleOtaFeed('makemytrip', room?.name || 'Deluxe Suite');
    setRawIcsText(sample);
    setRawChannel('makemytrip');
    setRawImportFeedback({
      success: true,
      message: 'Loaded sample MakeMyTrip RFC 5445 iCalendar test data.',
    });
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner & Sync Engine */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <span>iCalendar (iCal) 2-Way Channel Sync</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronize bookings with Airbnb, MakeMyTrip, and Booking.com using RFC 5545 format
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => syncAllFeeds()}
            disabled={isSyncing || feeds.length === 0}
            className={`min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all shrink-0 active:scale-95 disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Feeds...' : 'Sync All OTAs Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRawImport(!showRawImport)}
            className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Import .ics</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: EXPORT ICAL FEEDS (FOR AIRBNB / MMT / BOOKING.COM) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Step 1: Export Feeds (Paste into your OTAs)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy your room's export link into Airbnb or MakeMyTrip so direct offline blocks auto-close dates on those portals.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: room.color }}
                    />
                    <h4 className="text-xs font-bold text-white truncate">
                      {room.name}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {room.type} · Active Feed ID: {room.id.slice(-6)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => downloadICalFile(room, [], user?.homestayName || 'Homestay')}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Download .ics</span>
                </button>
              </div>

              {/* Feed URL Box */}
              <div className="space-y-1.5">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 truncate select-all">
                    {window.location.origin}/api/ical/export/{room.id}.ics?channel=airbnb
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyExportUrl(room)}
                    className="px-2 py-1 text-[11px] font-semibold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 rounded border border-emerald-500/30 shrink-0 flex items-center gap-1"
                  >
                    {copiedFeedId === room.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy for Airbnb</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Safely exports offline direct bookings & non-Airbnb dates to Airbnb without echoing Airbnb's own bookings back into itself.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: CONNECTED OTA IMPORT FEEDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Step 2: Connected OTA Import Feeds ({feeds.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add your Airbnb, MakeMyTrip, and Booking.com iCal links to pull their bookings automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddFeedForm(!showAddFeedForm)}
            className="min-h-[44px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New OTA Feed</span>
          </button>
        </div>

        {/* Add Feed Form Drawer */}
        {showAddFeedForm && (
          <form
            onSubmit={handleAddFeed}
            className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl"
          >
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-emerald-400">
              Add External OTA Calendar Feed
            </h4>

            {addFeedError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {addFeedError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Homestay Room *
                </label>
                <select
                  value={feedRoomId}
                  onChange={(e) => setFeedRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  OTA Channel Platform *
                </label>
                <select
                  value={feedChannel}
                  onChange={(e) => setFeedChannel(e.target.value as ChannelSource)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="airbnb">Airbnb</option>
                  <option value="makemytrip">MakeMyTrip (MMT)</option>
                  <option value="booking">Booking.com</option>
                  <option value="agoda">Agoda</option>
                  <option value="vrbo">VRBO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Feed Label Name
              </label>
              <input
                type="text"
                value={feedName}
                onChange={(e) => setFeedName(e.target.value)}
                placeholder="e.g. Airbnb - Wooden Cottage Listing"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                OTA Calendar iCal URL (.ics) *
              </label>
              <input
                type="url"
                required
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://www.airbnb.com/calendar/ical/1234567.ics?s=xxxx"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddFeedForm(false)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Save & Connect Feed
              </button>
            </div>
          </form>
        )}

        {/* Feeds list */}
        <div className="space-y-2.5">
          {feeds.map((feed) => {
            const room = rooms.find((r) => r.id === feed.roomId);
            const badge = getChannelBadge(feed.channel);

            return (
              <div
                key={feed.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white tracking-wider"
                      style={{ backgroundColor: badge.tagColor }}
                    >
                      {badge.name}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate">
                      {feed.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      → Assigned to: <strong className="text-slate-200">{room?.name || 'Room'}</strong>
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 truncate max-w-md mt-1">
                    {feed.feedUrl}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span>
                      Last Synced:{' '}
                      {feed.lastSyncedAt
                        ? new Date(feed.lastSyncedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </span>
                    <span>·</span>
                    <span
                      className={
                        feed.syncStatus === 'success'
                          ? 'text-emerald-400 font-medium'
                          : feed.syncStatus === 'syncing'
                          ? 'text-amber-400 font-medium animate-pulse'
                          : 'text-slate-400'
                      }
                    >
                      Status: {feed.syncStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => syncFeed(feed.id)}
                    disabled={feed.syncStatus === 'syncing'}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        feed.syncStatus === 'syncing' ? 'animate-spin text-emerald-400' : ''
                      }`}
                    />
                    <span>{feed.syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteFeed(feed.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Remove feed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {feeds.length === 0 && (
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
              No OTA feeds connected yet. Click <strong>Connect New OTA Feed</strong> to link Airbnb or MakeMyTrip.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: DIRECT .ICS TEXT / FILE TESTER */}
      {showRawImport && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Live RFC 5545 iCalendar Parser & Tester</span>
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,text/calendar"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                title="Select .ics file downloaded from Airbnb"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload .ics File</span>
              </button>

              <button
                type="button"
                onClick={handleLoadAirbnbSample}
                className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Airbnb Format</span>
              </button>

              <button
                type="button"
                onClick={handleLoadMmtSample}
                className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test MMT Format</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Paste raw <code>BEGIN:VCALENDAR</code> text, upload an exported <code>.ics</code> file, or paste your direct Airbnb/OTA calendar link. Our engine parses it immediately into your bookings table.
          </p>

          {rawImportFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                rawImportFeedback.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {rawImportFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{rawImportFeedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Assign to Room:
              </label>
              <select
                value={rawRoomId}
                onChange={(e) => setRawRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Channel Source:
              </label>
              <select
                value={rawChannel}
                onChange={(e) => setRawChannel(e.target.value as ChannelSource)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="airbnb">Airbnb</option>
                <option value="makemytrip">MakeMyTrip</option>
                <option value="booking">Booking.com</option>
                <option value="agoda">Agoda</option>
                <option value="vrbo">VRBO</option>
              </select>
            </div>
          </div>

          <textarea
            rows={5}
            value={rawIcsText}
            onChange={(e) => setRawIcsText(e.target.value)}
            placeholder="Paste BEGIN:VCALENDAR ... BEGIN:VEVENT ... END:VCALENDAR or paste https://www.airbnb.com/calendar/ical/...ics?s=... URL"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRawImport(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleRawImport}
              disabled={isProcessingRaw}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isProcessingRaw && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isProcessingRaw ? 'Fetching & Parsing...' : 'Parse & Sync Bookings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: RECENT SYNC AUDIT LOGS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Recent Synchronization Logs ({logs.length})
          </h3>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={clearLogs}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear Logs
            </button>
          )}
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold uppercase text-[10px] ${
                      log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    [{log.channel}]
                  </span>
                  <span className="text-white font-medium">{log.roomName}</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">{log.message}</p>
              </div>

              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-4 text-slate-500 text-xs">
              No sync events recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
