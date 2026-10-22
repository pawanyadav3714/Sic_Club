import React from 'react';
import { motion } from 'motion/react';
import { Palette, Video, Calendar, Cpu, ArrowRight, Sparkles } from 'lucide-react';

interface ClubDomainsProps {
  onNavigate: (route: string) => void;
}

const domains = [
  {
    id: 'graphic-design',
    title: 'Graphic Design',
    description: 'Focus on UI/UX, poster creation, brand design, and crafting captivating visual identity across all club media.',
    icon: Palette,
    gradient: 'from-pink-500/20 via-purple-500/10 to-transparent',
    borderColor: 'group-hover:border-pink-500/50',
    iconColor: 'text-pink-400',
    badge: 'Visuals & UI/UX',
    colSpan: 'md:col-span-2',
  },
  {
    id: 'video-editing',
    title: 'Video Editing',
    description: 'Focus on cinematic event after-movies, engaging social reels, motion graphics, and high-end media production.',
    icon: Video,
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    borderColor: 'group-hover:border-cyan-500/50',
    iconColor: 'text-cyan-400',
    badge: 'Media & Reels',
    colSpan: 'md:col-span-1',
  },
  {
    id: 'event-management',
    title: 'Event Management',
    description: 'Focus on organizing massive hackathons, annual technical fests, stage coordination, and seamless logistics.',
    icon: Calendar,
    gradient: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    borderColor: 'group-hover:border-purple-500/50',
    iconColor: 'text-purple-400',
    badge: 'Fests & Operations',
    colSpan: 'md:col-span-1',
  },
  {
    id: 'technical-coordinators',
    title: 'Technical Coordinators',
    description: 'Focus on full-stack web development, IoT prototypes, AI robotics, and technical project leadership.',
    icon: Cpu,
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    borderColor: 'group-hover:border-blue-500/50',
    iconColor: 'text-blue-400',
    badge: 'Code & IoT',
    colSpan: 'md:col-span-2',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
    },
  },
};

export default function ClubDomains({ onNavigate }: ClubDomainsProps) {
  return (
    <section id="domains-section" className="relative py-28 bg-[#030712] overflow-hidden text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest shadow-lg shadow-cyan-500/10">
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Science & Innovation Club</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Choose Your Domain
          </h2>
          <p className="max-w-xl mx-auto text-base text-slate-400 font-light leading-relaxed">
            Select the specialized department where you want to build, create, and lead during your tenure at SIC.
          </p>
        </motion.div>

        {/* Domains Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-50px', amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {domains.map((domain) => {
            const IconComponent = domain.icon;
            return (
              <motion.div
                key={domain.id}
                variants={cardVariants}
                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                className={`group relative p-8 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 ${domain.borderColor} hover:shadow-2xl hover:shadow-cyan-500/15 transition-all duration-300 flex flex-col justify-between overflow-hidden ${domain.colSpan}`}
              >
                {/* Gradient background accent on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${domain.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                {/* Top glowing orb */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-all duration-300 shadow-inner">
                      <IconComponent className={`w-7 h-7 ${domain.iconColor}`} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                      {domain.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {domain.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-light">
                      {domain.description}
                    </p>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-slate-800/80 flex items-center justify-between relative z-10">
                  <span className="text-xs font-mono text-cyan-400/80 tracking-wide">Recruitment Open</span>
                  <button
                    onClick={() => onNavigate('signup')}
                    className="text-xs font-semibold text-slate-300 group-hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Join department</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
