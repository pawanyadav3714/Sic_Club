import React from 'react';
import { motion } from 'motion/react';

export default function StatMarquee() {
  const stats = [
    '/ 1B+ RAISED BY CLIENTS',
    '/ +30% MARGIN GAIN POST-REBRAND',
    '/ 2.3X CONVERSION LIFT',
    '/ 99.9% SYSTEM UPTIME',
    '/ 50+ GLOBAL AWARDS',
  ];

  return (
    <div className="py-8 bg-[#0a0f1d] border-y border-cyan-500/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-[#030712] z-10 pointer-events-none" />
      <div className="flex whitespace-nowrap overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ ease: 'linear', duration: 25, repeat: Infinity }}
          className="flex items-center gap-12 text-sm md:text-base font-mono tracking-widest text-cyan-400/90 uppercase"
        >
          {[...stats, ...stats, ...stats, ...stats].map((stat, i) => (
            <div key={i} className="flex items-center gap-4">
              <span>{stat}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
