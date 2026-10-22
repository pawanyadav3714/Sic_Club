import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ProjectCardProps {
  title: string;
  category: string;
  description: string;
  stats: { label: string; value: string }[];
  image: string;
  reversed?: boolean;
  onExplore: () => void;
}

export default function ProjectCard({
  title,
  category,
  description,
  stats,
  image,
  reversed = false,
  onExplore,
}: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-16 ${
        reversed ? 'lg:flex-row-reverse' : ''
      }`}
    >
      {/* Image Container */}
      <div className={`lg:col-span-7 ${reversed ? 'lg:order-2' : 'lg:order-1'}`}>
        <div className="relative rounded-3xl overflow-hidden group border border-slate-800 bg-slate-900 shadow-2xl shadow-cyan-500/5 h-[380px] sm:h-[480px]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/80 via-transparent to-transparent z-10 pointer-events-none" />
          <motion.img
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            src={image}
            alt={title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{category}</span>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className={`lg:col-span-5 space-y-6 ${reversed ? 'lg:order-1' : 'lg:order-2'}`}>
        <div className="space-y-3">
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">Featured Case Study</span>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">{title}</h3>
          <p className="text-slate-400 font-light leading-relaxed text-sm sm:text-base">{description}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-800/80">
          {stats.map((stat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-2xl font-extrabold text-cyan-400 font-mono">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onExplore}
          className="px-6 py-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold text-sm flex items-center gap-2 group transition-all cursor-pointer"
        >
          <span>Explore Case Study</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
