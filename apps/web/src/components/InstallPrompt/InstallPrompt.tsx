'use client';
import { useState, useEffect } from 'react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setVisible(false));
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', () => setVisible(false));
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between rounded-xl border border-[#c9a962]/30 bg-[#0a0a0a] px-4 py-3 shadow-xl">
      <span className="text-sm text-[#c9a962]">Install for faster access</span>
      <div className="flex gap-2">
        <button
          onClick={() => setVisible(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-white/60 hover:text-white"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="rounded-lg bg-[#c9a962] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a]"
        >
          Install
        </button>
      </div>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};