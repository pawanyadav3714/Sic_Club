import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, Sparkles, HelpCircle, PlusCircle, ExternalLink } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return;
      }
    }
    // Fallback if browser doesn't support automatic prompt or it's not yet triggered
    setShowGuideModal(true);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>SIC App Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 animate-pulse"
        title="Install Android App / Add to Home Screen"
      >
        <Smartphone className="w-4 h-4 text-emerald-200" />
        <span>Install App</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-[32px] bg-slate-900 border-2 border-emerald-500/30 text-white shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">Install SIC App</h3>
                  <p className="text-xs text-slate-400">Get the full experience on your home screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm text-slate-300">
              <p className="font-medium text-slate-200">
                To fix the "Problem parsing package" error, use the official <strong className="text-emerald-400 font-bold">Browser Installation</strong> method. This will add a real icon to your home screen.
              </p>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">1</div>
                  <div>
                    <strong className="text-white block mb-1">On Android (Chrome):</strong>
                    <p className="text-xs leading-relaxed">
                      Tap the <strong className="text-emerald-400">Menu (3 dots)</strong> in the top right corner of Chrome and select <strong className="text-emerald-400">"Install app"</strong> or <strong className="text-emerald-400">"Add to Home screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xs">2</div>
                  <div>
                    <strong className="text-white block mb-1">On iPhone (Safari):</strong>
                    <p className="text-xs leading-relaxed">
                      Tap the <strong className="text-indigo-400">Share icon</strong> at the bottom of the screen and select <strong className="text-indigo-400">"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-500/30 flex gap-3 items-start">
                <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5">
                  <strong className="text-blue-300 block">Why this way?</strong>
                  <p>Direct APK installation is blocked by Android for security. The web installation creates a trusted application that stays up-to-date automatically.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Got It, Let's Install
              </button>
              
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">
                  For Play Console Publication: Use Bubblewrap (TWA) to wrap this URL into an .AAB
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
