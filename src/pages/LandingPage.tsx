import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Sparkles, Terminal, Video, Calendar, Award, Palette, Cpu, CheckCircle2, Users, Rocket, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';
import SICClubOfficialHeader from '../components/ui/SICClubOfficialHeader';
import Footer from '../components/Footer';
import { Keyboard } from '../components/ui/keyboard';
import MacbookScrollSection from '../components/ui/MacbookScrollSection';
import TechStackCarousel from '../components/TechStackCarousel';
import PublicEventsSection from '../components/PublicEventsSection';
import DynamicLobbyNoticeTicker from '../components/DynamicLobbyNoticeTicker';

function SparkleStar({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
    </svg>
  );
}

interface LandingPageProps {
  onNavigate: (route: string) => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export default function LandingPage({ onNavigate, currentUser, onLogout, onLoginSuccess }: LandingPageProps) {
  const [activeBtn, setActiveBtn] = useState<'login' | 'signup' | 'admin' | null>(null);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const handleAuthClick = (type: 'login' | 'signup' | 'admin', route: string) => {
    setActiveBtn(type);
    setTimeout(() => {
      onNavigate(route);
    }, 200);
  };

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-x-clip text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Dynamic Animated Marquee Alert / Notice Ticker across the Lobby */}
      <DynamicLobbyNoticeTicker />

      {/* Top Video Banner Section */}
      <div id="factory-section" className="py-0 bg-black relative">
        <div className="w-full h-[540px] sm:h-[700px] lg:h-[840px] relative overflow-hidden bg-black">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-50 absolute inset-0 z-0"
          >
            <source src="/rover1.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712] pointer-events-none z-10" />

          {/* Top Navigation Bar Header (Unified flex header to prevent overlapping on mobile) */}
          <header className="absolute top-0 inset-x-0 z-35 px-3 sm:px-6 lg:px-8 py-3 sm:py-5 flex items-center justify-between gap-2 w-full">
            {/* Top-Left Official SIC Club Header */}
            <div className="shrink-0 flex items-center">
              <SICClubOfficialHeader />
            </div>

            {/* Top-Right Floating Auth & Admin Buttons */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
              {!currentUser ? (
                <>
                  {/* Admin Portal Button - Visible for guests */}
                  <div className={activeBtn === 'admin' ? 'apple-ai-border rounded-full' : ''}>
                    <button
                      onClick={() => handleAuthClick('admin', 'core-auth')}
                      className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white font-semibold text-[10px] sm:text-xs backdrop-blur-xl shadow-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0"
                      title="Admin"
                    >
                      <ShieldAlert className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Admin</span>
                    </button>
                  </div>

                  {/* Student Sign In */}
                  <div className={activeBtn === 'login' ? 'apple-ai-border rounded-full' : ''}>
                    <button
                      onClick={() => handleAuthClick('login', 'login')}
                      className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-medium text-[10px] sm:text-xs backdrop-blur-xl shadow-lg transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Sign In
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {currentUser.role === 'core_member' && (
                    <button
                      onClick={() => onNavigate('core-dashboard')}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-[11px] sm:text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Admin Control Center</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Centered Hero Heading & Rover Details matching user's video */}
          <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none z-20 pt-20 sm:pt-28 pb-6 sm:pb-8 px-4 text-center">
            {/* Top Text Cluster with 3D Flip Reveal & Infinite Aesthetic Floating */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="space-y-2 sm:space-y-2.5 mt-2 sm:mt-4 max-w-4xl mx-auto [perspective:1000px]"
            >
              {/* 3D Flipping Title matching video frame 00:00 - 00:02 */}
              <motion.h1
                initial={{ opacity: 0, rotateY: 180, scale: 0.85 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-6xl md:text-8xl font-black text-white tracking-tight drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] font-sans transform-gpu"
              >
                SIC club
              </motion.h1>

              {/* Subtitle with aesthetic reveal */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.4, ease: 'easeOut' }}
                className="text-base sm:text-xl md:text-2xl font-medium text-slate-200 tracking-wide font-sans drop-shadow-lg"
              >
                The science and innovation club
              </motion.p>

              {/* College Tag with glowing pulse */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="pt-1 sm:pt-1.5"
              >
                <span className="inline-block text-xs sm:text-base md:text-lg font-bold text-[#a855f7] tracking-[0.12em] sm:tracking-[0.2em] uppercase drop-shadow-[0_0_20px_rgba(168,85,247,0.85)] animate-pulse">
                  Government Engineering College Palamu
                </span>
              </motion.div>
            </motion.div>

            {/* Bottom Slider / Progress Indicator Line (matching video at 00:03) */}
            <div className="flex items-center justify-center gap-2 pointer-events-auto">
              <div className="w-10 sm:w-16 h-1 rounded-full bg-slate-800" />
              <div className="w-16 sm:w-24 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
              <div className="w-10 sm:w-16 h-1 rounded-full bg-slate-800" />
            </div>
          </div>
        </div>
      </div>



      {/* Interactive 3D Scroll-Driven MacBook Section */}
      <MacbookScrollSection onNavigate={onNavigate} onLoginSuccess={onLoginSuccess || ((u) => onNavigate('core-dashboard'))} />

      {/* Immersive Lobby Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 sm:space-y-20">
        
        {/* Choose Your Domain Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-2.5 pt-2 sm:pt-6"
        >
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Choose Your Domain
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
            Select the specialized department where you want to build, create, and lead during your tenure at SIC.
          </p>
        </motion.div>

        {/* Domain Cards Grid: Responsive 2-by-2 mobile layout / 4-column desktop layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
          {[
            {
              title: "Graphic Design",
              shortTitle: "Graphic Design",
              fullTitle: "Graphic & UI/UX Design",
              badge: "DESIGN",
              fullBadge: "VISUALS & BRAND",
              desc: "UI/UX, poster creation, brand design, and captivating visual identity across all club media.",
              route: "signup",
              icon: <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            },
            {
              title: "Video Editing",
              shortTitle: "Video Editing",
              fullTitle: "Video Editing & VFX",
              badge: "MEDIA",
              fullBadge: "MEDIA & REELS",
              desc: "Cinematic event after-movies, engaging social reels, motion graphics, and high-end production.",
              route: "signup",
              icon: <Video className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            },
            {
              title: "Event Operations",
              shortTitle: "Event Mgmt",
              fullTitle: "Event Operations",
              badge: "EVENTS",
              fullBadge: "FESTS & OPS",
              desc: "Organizing massive hackathons, annual technical fests, stage coordination, and logistics.",
              route: "signup",
              icon: <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            },
            {
              title: "Technical Core",
              shortTitle: "Technical Core",
              fullTitle: "Technical Coordinators",
              badge: "CORE",
              fullBadge: "CORE & IOT",
              desc: "Full-stack web development, IoT prototypes, AI robotics, and technical project leadership.",
              route: "signup",
              icon: <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            }
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(56, 189, 248, 0.45)' }}
              onClick={() => onNavigate(item.route)}
              className="p-3 sm:p-5 lg:p-6 rounded-[18px] sm:rounded-[24px] bg-[#0c101d]/90 border border-[#1e273a] hover:border-cyan-500/40 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-2 sm:space-y-4 relative overflow-hidden group transition-all cursor-pointer select-none active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-mono tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-900/90 border border-slate-800 text-cyan-300 font-semibold shrink-0 uppercase">
                    <span className="sm:hidden">{item.badge}</span>
                    <span className="hidden sm:inline">{item.fullBadge}</span>
                  </span>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-xs sm:text-base lg:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                    <span className="sm:hidden">{item.shortTitle}</span>
                    <span className="hidden sm:inline">{item.fullTitle}</span>
                  </h3>
                  <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-2 sm:pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1">
                <span className="text-[9px] sm:text-xs font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold">Open</span>
                </span>
                <div
                  className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[9px] sm:text-xs font-bold text-cyan-300 group-hover:text-cyan-200 flex items-center gap-1 transition-all shrink-0 shadow-sm"
                >
                  <span>Join</span>
                  <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center space-y-2.5 pt-2 sm:pt-6">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Engineered for Extreme Performance
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
            Scroll-driven depth dynamics and interactive agentic modules built for the Science & Innovation Club.
          </p>
        </div>

        {/* 4 Core Features Grid: Arranged two-two per line in order (CORE 01, 02, 03, 04) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:gap-6">
          {[
            {
              header: "Frontend Architecture",
              title: "High-End Visual Interfaces",
              code: "CORE 01",
              desc: "Aceternity UI, Skipper UI, and animaster.com creating responsive, animated user interfaces."
            },
            {
              header: "Tools & Technologies",
              title: "Modern Frontend Stack",
              code: "CORE 02",
              desc: "React, Tailwind CSS, TypeScript, and modern libraries for structured, rapid development."
            },
            {
              header: "Backend & Orchestration",
              title: "Powerful Backend Engine",
              code: "CORE 03",
              desc: "Supabase, Node.js, Next.js, and Express.js providing robust server-side logic and seamless APIs."
            },
            {
              header: "Auth & Storage",
              fullHeader: "Authentication, Database & Storage",
              title: "Secure Auth & Databases",
              fullTitle: "Secure Auth & Multi-Paradigm Database",
              code: "CORE 04",
              desc: "Supabase Auth, PostgreSQL, and Mongoose (MongoDB) ensuring role security and scalable data storage."
            }
          ].map((feat, idx) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="p-3 sm:p-5 lg:p-7 rounded-[18px] sm:rounded-[24px] bg-[#0c101d]/90 border border-[#1e273a] hover:border-purple-500/40 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-2 sm:space-y-4 relative overflow-hidden group transition-all"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Terminal className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 font-bold shrink-0">
                  {feat.code}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] sm:text-xs font-mono text-purple-300/80 tracking-wider block truncate">
                  {feat.fullHeader ? (
                    <>
                      <span className="sm:hidden">{feat.header}</span>
                      <span className="hidden sm:inline">{feat.fullHeader}</span>
                    </>
                  ) : (
                    feat.header
                  )}
                </span>
                <h3 className="text-xs sm:text-base lg:text-lg font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                  {feat.fullTitle ? (
                    <>
                      <span className="sm:hidden">{feat.title}</span>
                      <span className="hidden sm:inline">{feat.fullTitle}</span>
                    </>
                  ) : (
                    feat.title
                  )}
                </h3>
                <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed line-clamp-3 sm:line-clamp-4">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Officially Approved & Published Events Showcase */}
      <PublicEventsSection onNavigateAuth={() => onNavigate('signup')} />

      {/* Featured Innovations Showcase - Moved just below Upcoming Club Events & Workshops */}
      <div className="py-8 sm:py-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-4 sm:space-y-6"
        >
          <div className="text-center space-y-1 sm:space-y-2">
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">AWWWARDS-STYLE SHOWCASE</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">Featured Innovations</h2>
          </div>

          <div className="p-5 sm:p-8 lg:p-10 rounded-[22px] sm:rounded-[32px] bg-gradient-to-br from-[#0c101d] to-[#070a13] border border-cyan-500/30 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6 relative z-10">
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-mono uppercase font-bold">
                FEATURED CASE STUDY
              </span>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Autonomous AI Agentic Factory
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Autonomous multi-agent architecture orchestrating real-time robotic hardware pipelines with sub-millisecond telemetry.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-lg sm:text-xl font-extrabold text-cyan-400 font-mono">4ms</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono mt-0.5">LATENCY</div>
                </div>
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-lg sm:text-xl font-extrabold text-purple-400 font-mono">10k/s</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-mono mt-0.5">THROUGHPUT</div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => onNavigate('signup')}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Explore Case Study</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="w-full lg:w-1/2 relative z-10">
              <div className="rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl bg-slate-950 aspect-video relative group">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                >
                  <source src="/rover1.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Tech Stack Carousel positioned just above the footer */}
      <TechStackCarousel />

      {/* Official Footer with Admin and Student navigation */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}




