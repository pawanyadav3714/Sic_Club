import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Atom, MessageSquare, Bell, User, LogOut, Terminal, Video, Calendar, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch announcements
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#070b14] p-6 hidden md:flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#030712] rounded-[10px] flex items-center justify-center">
                <Atom className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                SIC PORTAL
              </span>
              <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">Member Dashboard</span>
            </div>
          </div>

          <nav className="space-y-2 text-sm font-medium">
            <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Bell className="w-4 h-4" />
              <span>Announcements</span>
            </a>
            <a href="/dashboard/chat" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
              <MessageSquare className="w-4 h-4" />
              <span>Community Chat</span>
            </a>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
              {profile?.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-200 truncate">
                {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : user.email}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono">Verified Member</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Member Announcements</h1>
            <p className="text-xs text-slate-400 mt-1">Latest updates, workshops, and tech fest announcements</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>
        </header>

        {/* Announcements Feed */}
        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          {announcements && announcements.length > 0 ? (
            announcements.map((ann: any) => (
              <div key={ann.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Announcement</span>
                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100">{ann.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{ann.content}</p>
              </div>
            ))
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No announcements yet</h3>
              <p className="text-xs text-slate-400">Stay tuned! Club coordinators will post upcoming workshops and hackathon details here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
