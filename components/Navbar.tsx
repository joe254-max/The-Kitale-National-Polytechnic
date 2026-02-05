import React from 'react';
import { User, UserRole } from '../types';
import { LayoutDashboard, GraduationCap, Library, LogOut } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  setView: (v: 'home' | 'browse' | 'dashboard') => void;
  currentView: string;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, setView, currentView }) => {
  const isStudent = user.role === UserRole.STUDENT;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 md:px-12 py-3 flex items-center justify-between">
      <div 
        className="flex items-center gap-3 cursor-pointer group" 
        onClick={() => setView(isStudent ? 'home' : 'dashboard')}
      >
        <div className="w-10 h-10 bg-[#3d0413] rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-black text-[10px] tracking-tight text-[#1a202c] uppercase leading-none">
            The Kitale National
          </span>
          <span className="font-black text-[10px] tracking-tight text-[#1a202c] uppercase leading-none mt-1">
            Polytechnic Library
          </span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-4">
        <button 
          onClick={() => setView(isStudent ? 'home' : 'dashboard')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            (isStudent && currentView === 'home') || (!isStudent && currentView === 'dashboard') 
              ? 'bg-[#fdf2f2] text-[#3d0413]' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
        
        <button 
          onClick={() => setView('dashboard')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              currentView === 'dashboard' ? 'bg-[#fdf2f2] text-[#3d0413]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap size={14} />
          My Classes
        </button>

        <button 
          onClick={() => setView('browse')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            currentView === 'browse' ? 'text-[#3d0413]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Library size={14} />
          E-Repository
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block pr-4">
          <p className="text-[10px] font-black text-slate-900 leading-none truncate max-w-[120px]">{user.name.toUpperCase()}</p>
          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">{user.role}</p>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 bg-slate-100 text-slate-400 hover:text-rose-950 hover:bg-slate-200 rounded-lg transition-all"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;