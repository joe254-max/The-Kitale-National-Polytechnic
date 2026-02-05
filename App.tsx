import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Resource, ResourceType } from './types.ts';
import { MOCK_RESOURCES, DEPARTMENTS } from './constants.ts';
import Navbar from './components/Navbar.tsx';
import Sidebar from './components/Sidebar.tsx';
import ResourceGrid from './components/ResourceGrid.tsx';
import Hero from './components/Hero.tsx';
import StaffDashboardHome from './components/Dashboard.tsx';
import Login from './components/Login.tsx';
import StudentClasses from './components/StudentClasses.tsx';
import { BookOpen, Search, X } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ResourceType | 'ALL'>('ALL');
  const [view, setView] = useState<'home' | 'browse' | 'dashboard'>('home');
  const [studentDashTab, setStudentDashTab] = useState<'PHYSICAL' | 'ONLINE'>('PHYSICAL');

  // Persistence of login
  useEffect(() => {
    const savedUser = localStorage.getItem('poly_library_user') || sessionStorage.getItem('poly_library_user');
    
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.role !== UserRole.STUDENT) {
        setView('dashboard');
      }
    }
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           res.unitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           res.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = !selectedDept || res.department === selectedDept;
      
      let matchesType = true;
      if (selectedType !== 'ALL') {
        matchesType = res.type === selectedType;
      }

      return matchesSearch && matchesDept && matchesType;
    });
  }, [resources, searchQuery, selectedDept, selectedType]);

  const handleLogin = (u: User, remember: boolean) => {
    setUser(u);
    const userStr = JSON.stringify(u);
    
    if (remember) {
      localStorage.setItem('poly_library_user', userStr);
      sessionStorage.removeItem('poly_library_user');
    } else {
      sessionStorage.setItem('poly_library_user', userStr);
      localStorage.removeItem('poly_library_user');
    }

    if (u.role !== UserRole.STUDENT) {
      setView('dashboard');
    } else {
      setView('home');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('poly_library_user');
    sessionStorage.removeItem('poly_library_user');
    setView('home');
  };

  const navigateToStudentDashboard = (tab: 'PHYSICAL' | 'ONLINE' = 'PHYSICAL') => {
    setStudentDashTab(tab);
    setView('dashboard');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role !== UserRole.STUDENT && (view === 'dashboard' || view === 'home')) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} onLogout={handleLogout} setView={setView} currentView={view} />
        <StaffDashboardHome user={user} resources={resources} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#3d0413] selection:text-white">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        setView={(v) => {
          if (v === 'dashboard') navigateToStudentDashboard('PHYSICAL');
          else setView(v);
        }} 
        currentView={view} 
      />
      
      <main className="flex-1 flex flex-col md:flex-row">
        {view === 'browse' && (
          <Sidebar 
            selectedDept={selectedDept} 
            onSelectDept={setSelectedDept} 
          />
        )}
        
        <div className={`flex-1 p-4 md:p-10 overflow-y-auto bg-slate-50/50 ${view === 'dashboard' ? 'max-w-screen-2xl mx-auto w-full' : ''}`}>
          {view === 'home' && (
            <>
              <Hero 
                user={user} 
                onSearch={setSearchQuery} 
                onBrowse={() => setView('browse')} 
                onViewDashboard={() => navigateToStudentDashboard('PHYSICAL')}
              />
              <div className="mt-16">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <span className="w-2 h-8 bg-[#3d0413] rounded-full"></span>
                    Knowledge Stream
                  </h2>
                  <button onClick={() => setView('browse')} className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3d0413] hover:underline">View All Repository</button>
                </div>
                <ResourceGrid resources={resources.slice(0, 4)} />
              </div>
            </>
          )}

          {view === 'browse' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-10 flex flex-wrap gap-2 p-2 bg-white rounded-3xl shadow-sm border border-slate-200">
                {[
                  { label: 'All Resources', type: 'ALL', icon: '📁' },
                  { label: 'Lecture Notes', type: ResourceType.LECTURE_NOTE, icon: '📄' },
                  { label: 'Exams Vault', type: ResourceType.PAST_PAPER, icon: '📝' },
                  { label: 'Staff Manuals', type: ResourceType.TECHNICAL_MANUAL, icon: '⚙️' },
                  { label: 'E-Library', type: ResourceType.EBOOK, icon: '📚' },
                  { label: 'Visual Aids', type: ResourceType.VIDEO, icon: '🎥' },
                ].map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedType(cat.type as any)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedType === cat.type 
                        ? 'bg-[#3d0413] text-white shadow-xl shadow-[#3d0413]/20' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="mb-12 relative group">
                <input
                  type="text"
                  placeholder="Quick Search: Type unit code, title or description to filter catalog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-14 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 transition-all"
                />
                <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#3d0413] transition-colors" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                    {selectedDept || 'Institutional Catalog'}
                  </h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.4em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3d0413]"></span>
                    {selectedType === 'ALL' ? 'Unfiltered Academic Access' : `Viewing ${selectedType.replace('_', ' ')}`}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4">
                   <span className="text-2xl font-black text-[#3d0413] leading-none">{filteredResources.length}</span>
                   <div className="h-6 w-px bg-slate-100"></div>
                   <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest leading-none">Cataloged Items</span>
                </div>
              </div>
              <ResourceGrid resources={filteredResources} />
            </div>
          )}

          {view === 'dashboard' && user.role === UserRole.STUDENT && (
            <StudentClasses initialTab={studentDashTab} />
          )}
        </div>
      </main>

      <footer className="bg-slate-950 text-white p-12 md:p-20 mt-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3d0413]/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 relative z-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#3d0413] rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                </svg>
              </div>
               <div className="flex flex-col">
                  <h3 className="text-lg font-black leading-none uppercase tracking-tight text-white">The Kitale National</h3>
                  <h3 className="text-lg font-black leading-none uppercase tracking-tight text-rose-600 mt-1">Polytechnic Library</h3>
               </div>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed font-medium">
              The official digital asset gateway for TKNP. Designed for excellence in technical vocational education and training.
            </p>
          </div>
          <div>
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-rose-600 mb-8">Library Portal</h4>
            <ul className="text-slate-400 text-xs space-y-4 font-bold uppercase tracking-widest">
              <li><button onClick={() => setView('browse')} className="hover:text-white transition">Repository</button></li>
              <li><button onClick={() => navigateToStudentDashboard('PHYSICAL')} className="hover:text-white transition">My Workspace</button></li>
              <li><a href="#" className="hover:text-white transition">Audit Logs</a></li>
              <li><a href="#" className="hover:text-white transition">Legal & IP</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-rose-600 mb-8">Help Desk</h4>
            <p className="text-slate-400 text-xs space-y-3 font-medium">
              Kapenguria Road, Kitale, Kenya<br />
              <span className="block mt-4 font-black text-white">library@polytechnic.ac.ke</span>
              <span className="block font-black text-white">+254 700 000 000</span>
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 mt-20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">
          <span>&copy; 2024 TKNP Digital Library System. Secure Institutional Node.</span>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Status: Live</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
