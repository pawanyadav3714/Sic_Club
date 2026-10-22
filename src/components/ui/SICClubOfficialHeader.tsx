import React from 'react';
import { motion } from 'motion/react';

export default function SICClubOfficialHeader() {
  return (
    <div className="flex items-center bg-transparent p-0 overflow-hidden">
      <motion.span
        initial={{ x: -100, opacity: 0 }}
        animate={{
          x: 0,
          opacity: 1,
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          x: { type: 'spring', stiffness: 240, damping: 14, mass: 0.9 },
          opacity: { duration: 0.3 },
          backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear' },
        }}
        style={{
          backgroundSize: '200% auto',
        }}
        className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#a855f7] bg-clip-text text-transparent font-['Plus_Jakarta_Sans',sans-serif] drop-shadow-[0_4px_24px_rgba(99,102,241,0.3)] inline-block select-none whitespace-nowrap"
      >
        SIC club
      </motion.span>
    </div>
  );
}
