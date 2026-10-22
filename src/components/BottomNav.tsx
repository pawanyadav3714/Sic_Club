import React from 'react';
import { Home, Users, Bell, MessageSquare } from 'lucide-react';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export default function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#030712]/90 backdrop-blur-lg border-t border-cyan-900/30 p-2 z-50 flex justify-around">
      <button onClick={() => onNavigate('dashboard')} className={`p-3 rounded-xl ${currentRoute === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'}`}>
        <Home className="w-6 h-6" />
      </button>
      <button onClick={() => onNavigate('chat')} className={`p-3 rounded-xl ${currentRoute === 'chat' ? 'text-cyan-400' : 'text-slate-500'}`}>
        <MessageSquare className="w-6 h-6" />
      </button>
      <button onClick={() => onNavigate('announcements')} className={`p-3 rounded-xl ${currentRoute === 'announcements' ? 'text-cyan-400' : 'text-slate-500'}`}>
        <Bell className="w-6 h-6" />
      </button>
      <button onClick={() => onNavigate('members')} className={`p-3 rounded-xl ${currentRoute === 'members' ? 'text-cyan-400' : 'text-slate-500'}`}>
        <Users className="w-6 h-6" />
      </button>
    </div>
  );
}
