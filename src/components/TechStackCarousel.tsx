import React, { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';

// Utility helper for class concatenation
const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

// Authentic bracket icon matching source code
export const Bracket = ({ className }: { className: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 27 78"
      className={className}
    >
      <path
        fill="currentColor"
        d="M26.52 77.21h-5.75c-6.83 0-12.38-5.56-12.38-12.38V48.38C8.39 43.76 4.63 40 .01 40v-4c4.62 0 8.38-3.76 8.38-8.38V12.4C8.38 5.56 13.94 0 20.77 0h5.75v4h-5.75c-4.62 0-8.38 3.76-8.38 8.38V27.6c0 4.34-2.25 8.17-5.64 10.38 3.39 2.21 5.64 6.04 5.64 10.38v16.45c0 4.62 3.76 8.38 8.38 8.38h5.75v4.02Z"
      />
    </svg>
  );
};

interface IconItem {
  id: string;
  name: string;
  bg?: string;
  borderColor?: string;
  textColor?: string;
  icon: React.ReactNode;
}

// CharacterV3: Inverted 3D rotational fan-in matching source code
export const IconCardV3 = ({
  item,
  index,
  centerIndex,
  scrollYProgress,
}: {
  item: IconItem;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
}) => {
  const distanceFromCenter = index - centerIndex;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    [isMobile ? distanceFromCenter * 12 : distanceFromCenter * 40, 0]
  );
  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    [isMobile ? distanceFromCenter * 2 : distanceFromCenter * 8, 0]
  );
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [isMobile ? -Math.abs(distanceFromCenter) * 4 : -Math.abs(distanceFromCenter) * 10, 0]
  );
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 1], [0, 0.8, 1]);

  return (
    <motion.div
      style={{
        x,
        rotate,
        y,
        scale,
        opacity,
        transformOrigin: 'center',
      }}
      whileHover={{ scale: 1.08, y: -6, rotate: 0 }}
      className={cn(
        'relative z-50 flex items-center justify-center p-0 m-0 rounded-2xl border-0 backdrop-blur-xl shadow-2xl transition-shadow cursor-pointer select-none shrink-0 min-w-[76px] sm:min-w-[110px] h-[76px] sm:h-[110px] transform-gpu',
        item.bg || 'bg-[#0b101d]/90'
      )}
    >
      <div className="w-full h-full p-0 m-0 flex items-center justify-center overflow-hidden rounded-2xl">
        {item.icon}
      </div>
    </motion.div>
  );
};

export default function TechStackCarousel() {
  const targetRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start 1', 'end 0.1'],
  });

  // AI & Tech components icons matching user's video & request
  const aiIconsList: IconItem[] = [
    {
      id: 'nextjs',
      name: 'Next.js',
      bg: 'bg-black',
      borderColor: 'border-slate-700',
      icon: (
        <svg className="w-full h-full p-0 object-cover rounded-2xl drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="50" fill="black" />
          <path d="M30 30V70H40V50L60 70H70V30H60V50L40 30H30Z" fill="white" />
          <defs>
            <linearGradient id="ngrad" x1="60" y1="50" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="black" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M60 50L70 70V50H60Z" fill="url(#ngrad)" />
        </svg>
      ),
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      bg: 'bg-[#0b101d]/95',
      borderColor: 'border-emerald-500/40',
      icon: (
        <svg className="w-full h-full p-2 object-contain text-white drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.28 9.8a6.5 6.5 0 00-.5-4.8 6.6 6.6 0 00-6.8-3.1 6.6 6.6 0 00-4.7 2.3 6.6 6.6 0 00-6 3.1 6.6 6.6 0 00.9 7.4 6.6 6.6 0 00.5 4.8 6.6 6.6 0 006.8 3.1 6.6 6.6 0 004.7-2.3 6.6 6.6 0 006-3.1 6.6 6.6 0 00-.9-7.4zm-7.7 11.3a4.7 4.7 0 01-3.6-1.6l.4-.2 3.8-2.2a.9.9 0 00.5-.8v-5.2l1.6.9v4.5a4.7 4.7 0 01-2.7 4.6zm-8.8-3.7a4.7 4.7 0 01-.7-3.9l.4.2 3.8 2.2a.9.9 0 001 0l4.5-2.6v1.8l-3.9 2.3a4.7 4.7 0 01-5.1 0zm-1.1-7.8a4.7 4.7 0 012.9-2.3v.4l.1 4.4a.9.9 0 00.5.8l4.5 2.6-1.5.9-3.9-2.2a4.7 4.7 0 01-2.6-4.6zm13.3 2.8l-4.5-2.6 1.5-.9 3.9 2.2a4.7 4.7 0 01.7 3.9l-.4-.2-3.8-2.2a.9.9 0 00-1 0v-1.8l3.6 1.6zm1.1-3.4l-.1-4.4a.9.9 0 00-.5-.8l-4.5-2.6 1.5-.9 3.9 2.2a4.7 4.7 0 012.6 4.6 4.7 4.7 0 01-2.9 2.3v-.4zM12 13.7l-3.2-1.9 3.2-1.9 3.2 1.9L12 13.7z" />
        </svg>
      ),
    },
    {
      id: 'claude',
      name: 'AI Hub',
      bg: 'bg-[#061a12]/95',
      borderColor: 'border-emerald-500/40',
      icon: (
        <svg className="w-full h-full p-0 object-cover rounded-2xl drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" viewBox="0 0 100 100" fill="none">
          <path d="M42 10 C 42 6, 46 4, 49 7 L 90 44 C 94 48, 91 55, 85 55 L 53 55 L 53 88 C 53 93, 47 95, 44 91 L 7 53 C 3 49, 6 42, 12 42 L 42 42 Z" fill="#34d399" />
          <path d="M53 45 L 85 45 C 91 45, 94 38, 90 34 L 49 7 C 46 4, 42 6, 42 10 L 42 45 Z" fill="#1b8243" />
        </svg>
      ),
    },
    {
      id: 'gemini',
      name: 'Gemini',
      bg: 'bg-[#0b101d]/95',
      borderColor: 'border-indigo-500/40',
      icon: (
        <svg className="w-full h-full p-0 object-cover rounded-2xl drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path d="M50 0 C52 35 65 48 100 50 C65 52 52 65 50 100 C48 65 35 52 0 50 C35 48 48 35 50 0 Z" fill="url(#geminiGrad)" />
        </svg>
      ),
    },
    {
      id: 'react',
      name: 'React',
      bg: 'bg-[#0b1322]/95',
      borderColor: 'border-cyan-500/40',
      icon: (
        <svg className="w-full h-full p-2.5 object-contain text-[#61dafb] drop-shadow-[0_0_12px_rgba(97,218,251,0.6)] animate-spin [animation-duration:16s]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <ellipse cx="12" cy="12" rx="10" ry="4.2" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'node',
      name: 'Node.js',
      bg: 'bg-[#0f1712]/95',
      borderColor: 'border-emerald-500/40',
      icon: (
        <svg className="w-full h-full p-2.5 object-contain text-[#83cd29] drop-shadow-[0_0_12px_rgba(131,205,41,0.6)]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l9 5.2v10.4l-9 5.2-9-5.2V7.2L12 2zm0 2.3L5.5 8.1v7.8l6.5 3.8 6.5-3.8V8.1L12 4.3z" />
        </svg>
      ),
    },
    {
      id: 'mongodb',
      name: 'SQL Database',
      bg: 'bg-[#18100b]/95',
      borderColor: 'border-orange-500/40',
      icon: (
        <svg className="w-full h-full p-2.5 object-contain text-[#e87323] drop-shadow-[0_0_12px_rgba(232,115,35,0.6)]" viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
        </svg>
      ),
    },
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      bg: 'bg-[#1b2b3a]/95',
      borderColor: 'border-blue-500/40',
      icon: (
        <svg className="w-full h-full p-0 object-cover rounded-2xl drop-shadow-[0_0_12px_rgba(51,103,145,0.6)]" viewBox="0 0 100 100" fill="none">
          <path d="M25 15 C 15 15, 10 30, 13 50 C 15 65, 25 75, 40 75 L 50 75 C 60 75, 70 65, 73 50 C 77 30, 70 15, 60 15 Z" fill="#336791" stroke="white" strokeWidth="3" />
          <path d="M30 40 C 33 40, 35 43, 35 47 C 35 51, 33 53, 30 53 C 27 53, 25 51, 25 47 C 25 43, 27 40, 30 40 Z" fill="white" />
          <path d="M55 40 C 58 40, 60 43, 60 47 C 60 51, 58 53, 55 53 C 52 53, 50 51, 50 47 C 50 43, 52 40, 55 40 Z" fill="white" />
          <path d="M40 50 L 45 70 C 47 75, 53 75, 55 70 L 50 50 Z" fill="#336791" stroke="white" strokeWidth="2" />
        </svg>
      ),
    },

    {
      id: 'github',
      name: 'GitHub',
      bg: 'bg-black',
      borderColor: 'border-slate-700',
      icon: (
        <svg className="w-full h-full p-0 object-cover rounded-2xl drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="50" fill="black" />
          <path fill="white" fillRule="evenodd" clipRule="evenodd" d="M50 20C33.43 20 20 33.43 20 50C20 63.3 28.7 74.5 40.5 78.5C42 78.8 42.5 77.8 42.5 77C42.5 76.2 42.5 74 42.5 71C34.3 72.8 32.5 67 32.5 67C31.2 63.7 29.3 62.8 29.3 62.8C26.7 61 29.5 61 29.5 61C32.3 61.2 33.8 63.9 33.8 63.9C36.3 68.2 40.3 67 41.8 66.3C42 64.5 42.7 63.3 43.5 62.6C36.8 61.8 29.8 59.2 29.8 47.7C29.8 44.4 31 41.7 32.9 39.6C32.6 38.8 31.5 35.7 33.2 31.5C33.2 31.5 35.8 30.7 41.8 34.8C44.2 34.1 46.8 33.8 49.5 33.8C52.2 33.8 54.8 34.1 57.2 34.8C63.2 30.7 65.8 31.5 65.8 31.5C67.5 35.7 66.4 38.8 66.1 39.6C68 41.7 69.2 44.4 69.2 47.7C69.2 59.2 62.2 61.8 55.5 62.6C56.6 63.5 57.5 65.2 57.5 67.8C57.5 71.5 57.5 74.5 57.5 77C57.5 77.8 58 78.8 59.5 78.5C71.3 74.5 80 63.3 80 50C80 33.43 66.57 20 50 20Z" />
        </svg>
      ),
    },
  ];

  const iconCenterIndex = Math.floor(aiIconsList.length / 2);

  return (
    <div className="w-full relative z-40 select-none bg-[#030712] py-0 my-0">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-cyan-500/10 via-purple-500/15 to-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Single Unified Tech Stack Section */}
      <div
        ref={targetRef}
        className="relative z-50 flex flex-col items-center justify-center px-4 py-8 overflow-hidden border border-slate-800/50 rounded-3xl transition-all duration-500 hover:border-slate-700"
      >


        {/* 3D Rotational Spread & Assembly Cluster */}
        <div
          className="w-full max-w-5xl mx-auto flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap relative z-50"
          style={{ perspective: '600px' }}
        >
          {aiIconsList.map((item, index) => (
            <IconCardV3
              key={item.id}
              item={item}
              index={index}
              centerIndex={iconCenterIndex}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>

        {/* Carousel Progress Indicator */}
        <div className="flex items-center justify-center gap-2 pt-10 sm:pt-14 relative z-50">
          <div className="w-10 sm:w-14 h-1 rounded-full bg-slate-800" />
          <div className="w-16 sm:w-24 h-1.5 rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
          <div className="w-10 sm:w-14 h-1 rounded-full bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
