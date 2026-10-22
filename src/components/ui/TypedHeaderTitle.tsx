import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const PHRASES = [
  "Science & Innovation Club",
  "Autonomous AI Robotics",
  "Cinematic Media Hub",
  "Advanced Tech Fests"
];

export default function TypedHeaderTitle() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    const fullText = PHRASES[currentPhraseIndex];

    const handleTyping = () => {
      if (!isDeleting) {
        setDisplayedText(fullText.substring(0, displayedText.length + 1));
        if (displayedText === fullText) {
          setTimeout(() => setIsDeleting(true), 2000);
          setTypingSpeed(50);
        }
      } else {
        setDisplayedText(fullText.substring(0, displayedText.length - 1));
        if (displayedText === "") {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
          setTypingSpeed(100);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhraseIndex, typingSpeed]);

  return (
    <div className="flex items-center gap-2.5 bg-slate-900/90 border border-cyan-500/30 px-4 py-2 rounded-2xl backdrop-blur-xl shadow-2xl">
      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]" />
      <span className="text-xs sm:text-sm font-bold tracking-tight bg-gradient-to-r from-white via-cyan-300 to-purple-400 bg-clip-text text-transparent font-mono">
        {displayedText}
      </span>
      <span className="w-0.5 h-4 bg-cyan-400 animate-pulse" />
    </div>
  );
}
