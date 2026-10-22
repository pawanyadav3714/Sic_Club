import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Cpu, Wifi, Activity, Compass, Bell, Sparkles } from 'lucide-react';

export default function KavachExhibitionShowcase() {
  const capabilities = [
    { title: 'MULTI-HAZARD SENSNG', desc: 'Gas, Temp, Humidity, Vibration', icon: Activity, color: 'from-amber-400 to-yellow-500' },
    { title: 'AI-POWERED ANALYSIS', desc: 'Anomaly detection & risk prediction', icon: Cpu, color: 'from-purple-400 to-indigo-500' },
    { title: 'SELF-HEALING NETWORK', desc: 'Clear mesh network communication', icon: Wifi, color: 'from-cyan-400 to-blue-500' },
    { title: 'THERMAL SCOPE', desc: 'Enhanced heat signature & dust vision', icon: ShieldAlert, color: 'from-rose-400 to-red-500' },
    { title: 'COMPASS', desc: 'Autonomous navigation & positioning', icon: Compass, color: 'from-emerald-400 to-teal-500' },
    { title: 'ALARM BELL', desc: 'Real-time control room alerts', icon: Bell, color: 'from-orange-400 to-amber-500' },
  ];

  return (
    <div className="relative py-24 bg-[#030712] overflow-hidden text-slate-100">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest shadow-xl">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Exhibition & Gallery Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            KAVACH: The Future of Mine Safety
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Showcased in high-end exhibition halls with integrated telemetry display systems.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Exhibition Image (7 cols) */}
          <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl group">
            <img
              src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80"
              alt="Kavach Exhibition Showcase"
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Exhibition Hall 01</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Autonomous Rescue Rover Prototype</h3>
              </div>
            </div>
          </div>

          {/* Capabilities Panel (5 cols) matching the image's display panel */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">Modernized Features Box</span>
              <h3 className="text-xl font-extrabold text-white">KAVACH CAPABILITIES</h3>
            </div>

            <div className="space-y-4">
              {capabilities.map((cap, idx) => (
                <div
                  key={idx}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-lg"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cap.color} flex items-center justify-center text-black shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <cap.icon className="w-5 h-5 text-black font-bold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-cyan-400 transition-colors">
                      {cap.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
