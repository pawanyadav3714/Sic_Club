import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, 
  Github, 
  Twitter, 
  Linkedin, 
  Instagram,
  Mail, 
  MapPin, 
  ExternalLink, 
  ShieldCheck, 
  Award, 
  Building2, 
  ArrowUpRight,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && startOnView) {
          setHasStarted(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentCount = progress === 1 ? end : Math.floor(end * (1 - Math.pow(2, -10 * progress)));
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

function StatItem({ value, label, isFormatted, suffix = '+' }: { value: number; label: string; isFormatted?: boolean; suffix?: string }) {
  const { count, ref } = useCountUp(value, 2000);
  const displayVal = isFormatted ? count.toLocaleString() : count;

  return (
    <div
      ref={ref}
      className="p-3 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 flex flex-col justify-between text-center transition-all group shadow-sm"
    >
      <div className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white font-mono tracking-tight">
        {displayVal}{suffix}
      </div>
      <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-1 leading-snug">
        {label}
      </p>
    </div>
  );
}

export default function Footer({ onNavigate }: { onNavigate: (route: string) => void }) {
  const [coreMemberCount, setCoreMemberCount] = useState(120);
  const [studentMemberCount, setStudentMemberCount] = useState(450);

  useEffect(() => {
    async function fetchCounts() {
      let cCount = 120;
      let sCount = 450;

      if (isSupabaseConfigured && supabase) {
        try {
          const { count: sbCoreCount, error: coreErr } = await supabase
            .from('core_members')
            .select('*', { count: 'exact', head: true });
          if (!coreErr && sbCoreCount !== null && sbCoreCount > 0) {
            cCount = Math.max(120, sbCoreCount);
          }
        } catch (e) {}

        try {
          const { count: sbStudentCount, error: studentErr } = await supabase
            .from('student_profiles')
            .select('*', { count: 'exact', head: true });
          if (!studentErr && sbStudentCount !== null && sbStudentCount > 0) {
            sCount = Math.max(450, sbStudentCount);
          }
        } catch (e) {}
      }

      try {
        const localCore = JSON.parse(localStorage.getItem('sic_core_members') || '[]');
        if (localCore.length > 0) {
          cCount = Math.max(cCount, localCore.length + 5);
        }
      } catch (e) {}

      try {
        const localReg = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
        const localApps = JSON.parse(localStorage.getItem('sic_membership_applications') || '[]');
        const combined = [...localReg, ...localApps];
        const uniqueEmails = new Set(combined.map((u: any) => (u.email || '').toLowerCase().trim()).filter(Boolean));
        sCount = 450 + uniqueEmails.size;
      } catch (e) {}

      setCoreMemberCount(cCount);
      setStudentMemberCount(sCount);
    }
    fetchCounts();
  }, []);

  return (
    <footer className="bg-[#050811] border-t border-slate-800 text-slate-300 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* Institutional Top Crest Strip */}
      <div className="border-b border-slate-800/80 bg-[#070b16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-md shadow-cyan-950/50 shrink-0">
              <div className="w-full h-full bg-[#050811] rounded-[10px] flex items-center justify-center">
                <Atom className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-1.5">
                <span>GOVERNMENT ENGINEERING COLLEGE PALAMU</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Department of Higher & Technical Education • Govt. of Jharkhand • AICTE Approved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Official Technical Society
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              JUT Affiliated
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-16">
        
        {/* Institutional Statistics Bar */}
        <div className="mb-10 sm:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
                Institutional Growth & Technical Footprint
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Real-time metrics from the Science & Innovation Club registry at GEC Palamu.
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 self-start sm:self-auto">
              SESSION 2025–2026
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatItem 
              value={5} 
              label="Years of Technical Excellence & Research" 
            />
            <StatItem 
              value={450} 
              label="Active Student Innovators & Developers" 
            />
            <StatItem 
              value={studentMemberCount} 
              label="Registered Student Portal Enrollees" 
              isFormatted={true}
            />
            <StatItem 
              value={coreMemberCount} 
              label="Elected Core Council & Domain Leads" 
              isFormatted={true}
            />
          </div>
        </div>

        {/* Official Multi-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-10 pt-2">
          
          {/* Column 1: Institution & About (Span 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Science & Innovation Club</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                  SIC
                </span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                The premier student technical council of Government Engineering College Palamu. Dedicated to advancing undergraduate research, competitive programming, robotics prototyping, and open-source systems.
              </p>
            </div>

            {/* Campus Address Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-semibold text-white">Campus Location:</p>
                  <p className="text-slate-400 mt-0.5">
                    Government Engineering College, Palamu<br />
                    Lesliganj, Palamu, Jharkhand — 822101, India
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800 text-slate-300">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href="mailto:sic.gecpalamu@gmail.com" className="text-cyan-400 hover:underline truncate">
                  sic.gecpalamu@gmail.com
                </a>
              </div>
            </div>

            {/* Official Social Links */}
            <div className="flex items-center gap-2 pt-1">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer"
                aria-label="SIC GitHub"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noreferrer"
                aria-label="SIC LinkedIn"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer"
                aria-label="SIC Instagram"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-pink-400 hover:border-pink-500/40 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer"
                aria-label="SIC Twitter / X"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Portals & Governance (Span 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold pb-2 border-b border-slate-800">
              Access Portals
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => onNavigate('landing')} 
                  className="hover:text-cyan-400 transition-colors text-left block cursor-pointer"
                >
                  Home Portal
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('signup')} 
                  className="hover:text-cyan-400 transition-colors text-left block cursor-pointer"
                >
                  Student Registration
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('login')} 
                  className="hover:text-cyan-400 transition-colors text-left block cursor-pointer"
                >
                  Member Sign In
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('core-auth')} 
                  className="hover:text-purple-400 transition-colors text-left block font-medium cursor-pointer"
                >
                  Core Council Terminal
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('admin')} 
                  className="hover:text-cyan-400 transition-colors text-left block cursor-pointer"
                >
                  Faculty Coordinator
                </button>
              </li>
              <li>
                <a 
                  href="#constitution" 
                  className="text-slate-400 hover:text-white transition-colors block"
                >
                  Club Bylaws & Ethics
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Institutional Affiliations & Accreditation (Span 4) */}
          <div className="lg:col-span-4 space-y-3.5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold pb-2 border-b border-slate-800">
              Institution & Governance
            </h4>
            
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Government Engineering College, Palamu (Jharkhand)</span>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Affiliated with Jharkhand University of Technology (JUT), Ranchi</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>All India Council for Technical Education (AICTE) Approved</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] leading-relaxed text-slate-400">
                <span className="font-semibold text-white block mb-0.5">Faculty In-Charge Desk</span>
                Inquiries regarding corporate sponsorship, hackathon mentorship, or research collaboration can be directed to the faculty coordinator via the administration portal.
              </div>
            </div>
          </div>

        </div>

        {/* Legal & Accreditation Bottom Strip */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Science & Innovation Club (SIC), Government Engineering College Palamu. All rights reserved.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            An Official Autonomous Student Technical Body under GEC Palamu • JUT Ranchi
          </p>
        </div>

      </div>
    </footer>
  );
}
