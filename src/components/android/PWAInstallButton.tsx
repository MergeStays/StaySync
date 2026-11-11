import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone } from 'lucide-react';
import { AndroidInstallModal } from './AndroidInstallModal';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowModal(true);
          }
        }}
        className="min-h-[44px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
        title="Install StaySync as an Android App"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {isInstalled ? 'Android App Active' : 'Install Android App'}
        </span>
        <span className="sm:hidden">
          {isInstalled ? 'Installed' : 'Get App'}
        </span>
      </button>

      <AndroidInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onDirectInstall={isInstallable ? install : undefined}
      />
    </>
  );
};
