import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Share2,
  PlusSquare,
} from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectInstall?: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  onDirectInstall,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Install StaySync Android App</span>
              </h3>
              <p className="text-xs text-slate-400">
                Native WebAPK & Home Screen installation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Tap WebAPK Install Button (if browser prompt is ready) */}
        {onDirectInstall && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct Android Installation Ready</span>
            </div>
            <p className="text-xs text-slate-300">
              Install StaySync directly to your Android launcher with an app icon, standalone splash screen, and offline calendar access.
            </p>
            <button
              type="button"
              onClick={() => {
                onDirectInstall();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Tap to Install on this Device</span>
            </button>
          </div>
        )}

        {/* Option A: Install via Chrome on Android Phone */}
        <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span>Method 1: Open in Android Chrome (Instant WebAPK)</span>
          </h4>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              Open this app on your Android phone in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.
            </li>
            <li>
              Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of Chrome.
            </li>
            <li>
              Select <strong className="text-emerald-300">"Install App"</strong> or <strong className="text-emerald-300">"Add to Home screen"</strong>.
            </li>
            <li>
              Android will automatically generate a native <strong>WebAPK</strong> with the StaySync app icon on your home screen.
            </li>
          </ol>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
              {currentUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 shrink-0 flex items-center gap-1 transition-colors"
            >
              {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy App Link'}</span>
            </button>
          </div>
        </div>

        {/* Option B: Generate Standalone .APK (TWA / PWABuilder) */}
        <div className="space-y-2.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <span>Method 2: Standalone .APK / Google Play Package</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Want a downloadable <code>.apk</code> file for sideloading or publishing to the Google Play Store?
          </p>
          <div className="text-xs text-slate-400 space-y-1">
            <p>1. Copy the current live App URL using the button above.</p>
            <p>2. Open <strong className="text-white">PWABuilder.com</strong> (Microsoft & Google's official PWA to APK packaging service).</p>
            <p>3. Paste the URL and click <strong>"Build Android APK"</strong> to download a signed APK package.</p>
          </div>

          <a
            href={`https://www.pwabuilder.com?url=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open PWABuilder to Generate Android APK</span>
          </a>
        </div>

        {/* Security / Offline Assurance */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Offline Safe:</strong> The Android app caches your calendars and room configurations, so you can check your schedule and record walk-ins even in areas with weak cellular signal.
          </span>
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
