
import React from 'react';
import { DEPARTMENTS } from '../constants';

interface SidebarProps {
  selectedDept: string | null;
  onSelectDept: (dept: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedDept, onSelectDept }) => {
  return (
    <aside className="w-full md:w-72 bg-white border-r border-slate-200 h-auto md:h-[calc(100vh-73px)] overflow-y-auto p-6 flex-shrink-0">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">Instituitional Depts</h3>
      <div className="space-y-1">
        <button
          onClick={() => onSelectDept(null)}
          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            selectedDept === null 
              ? 'bg-rose-50 text-rose-950 shadow-sm border border-rose-100' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Departments
        </button>
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelectDept(dept.name)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              selectedDept === dept.name 
                ? 'bg-rose-50 text-rose-950 shadow-sm border border-rose-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      <div className="mt-12">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">Discovery Tools</h3>
        <div className="space-y-4 px-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 text-rose-950 border-slate-300 rounded focus:ring-rose-950" />
            <span className="text-sm text-slate-600 font-bold group-hover:text-slate-900 transition">Newest Materials</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 text-rose-950 border-slate-300 rounded focus:ring-rose-950" />
            <span className="text-sm text-slate-600 font-bold group-hover:text-slate-900 transition">Most Downloaded</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 text-rose-950 border-slate-300 rounded focus:ring-rose-950" />
            <span className="text-sm text-slate-600 font-bold group-hover:text-slate-900 transition">Peer Recommended</span>
          </label>
        </div>
      </div>

      <div className="mt-12 pt-10">
        <div className="bg-rose-950 rounded-[2rem] p-8 text-white overflow-hidden relative group shadow-2xl shadow-rose-950/20">
          <div className="relative z-10">
            <h4 className="font-black mb-2 text-lg leading-tight">Need Access Help?</h4>
            <p className="text-xs text-rose-100 mb-6 leading-relaxed opacity-80">Our librarians are online to assist with credentials and physical catalog queries.</p>
            <button className="w-full bg-white text-rose-950 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition shadow-lg active:scale-95">
              Chat Assistance
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
