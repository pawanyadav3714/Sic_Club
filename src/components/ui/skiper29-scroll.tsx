import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Sparkles, Cpu, Terminal, Rocket, Zap, Shield } from 'lucide-react';

export default function Skiper29Scroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);

  const features = [
    {
      title: 'Autonomous Multi-Agent Swarm',
      desc: 'Real-time agentic workflow orchestrating hardware & software tasks with zero human latency.',
      icon: Cpu,
      tag: 'CORE 01',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Sub-Millisecond Telemetry',
      desc: 'High-frequency WebSocket streaming feeding live sensor metrics into centralized dashboards.',
      icon: Zap,
      tag: 'CORE 02',
      gradient: 'from-purple-500 to-indigo-600',
    },
    {
      title: 'Secure RBAC & Firebase Auth',
      desc: 'Role-based access control protecting critical robotics labs and administrative controls.',
      icon: Shield,
      tag: 'CORE 03',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Awwwards-Class 3D Kinematics',
      desc: 'Interactive Three.js factory simulation with cutaway, assembled, and flight camera modes.',
      icon: Rocket,
      tag: 'CORE 04',
      gradient: 'from-pink-500 to-rose-600',
    },
  ];

  return (
    <div ref={containerRef} className="relative py-32 overflow-hidden bg-[#030712]">
      {/* Background glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div style={{ opacity }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Skiper UI · Skiper 29 Scroll Experience</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Engineered for Extreme Performance
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Scroll-driven depth dynamics and interactive agentic modules built for the Science & Innovation Club.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div style={{ y: y1 }} className="space-y-8">
            {features.slice(0, 2).map((feat, idx) => (
              <div
                key={idx}
                className="group relative p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 backdrop-blur-xl transition-all shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.gradient} flex items-center justify-center text-black shadow-lg`}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-cyan-400 tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div style={{ y: y2 }} className="space-y-8 pt-0 md:pt-16">
            {features.slice(2, 4).map((feat, idx) => (
              <div
                key={idx}
                className="group relative p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 backdrop-blur-xl transition-all shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-purple-400 tracking-wider px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
