import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

const PHRASES = [
  "Welcome to SIC Club",
  "Autonomous Robotics & AI",
  "Next-Gen Engineering Hub",
  "Science & Innovation Club"
];

export default function SICTypingTitle() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const currentPhrase = PHRASES[currentPhraseIndex];

  return (
    <div className="flex items-center gap-3 bg-slate-950/85 border border-cyan-500/30 px-5 py-3 rounded-2xl backdrop-blur-2xl shadow-2xl">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-black shrink-0 shadow-lg shadow-cyan-500/30">
        <ShieldCheck className="w-4 h-4 text-black font-extrabold" />
      </div>
      <div className="relative min-h-[32px] flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentPhrase}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-blue-300 bg-clip-text text-transparent font-['Plus_Jakarta_Sans',sans-serif] whitespace-nowrap"
          >
            {currentPhrase}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping ml-1" />
    </div>
  );
}
