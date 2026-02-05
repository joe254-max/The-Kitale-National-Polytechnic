import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Users, Calendar, Clock, GraduationCap, 
  BookOpen, FileText, BarChart3, Presentation, Plus, 
  ExternalLink, ChevronRight, School, Monitor, Video, 
  Bell, CalendarPlus, MessageSquare, AlertCircle, Play,
  Search, X, CheckCircle2, Filter, User, Smartphone, Hash
} from 'lucide-react';

interface ClassItem {
  id: string;
  title: string;
  teacher: string;
  room: string;
  schedule: string;
  grade?: number;
  type: 'PHYSICAL' | 'ONLINE';
  studentCount: number;
  attendance?: number;
  assignmentsDone?: string;
  platform?: 'Microsoft Teams' | 'Zoom' | 'Google Meet';
  link?: string;
  isLive?: boolean;
  department: string;
}

const GLOBAL_AVAILABLE_CLASSES: ClassItem[] = [
  {
    id: 'g1',
    title: 'ELECTRICAL INSTALLATION III',
    teacher: 'Eng. Mutua',
    room: 'Workshop 4',
    schedule: 'Mon/Wed 08:00 AM',
    type: 'PHYSICAL',
    studentCount: 25,
    department: 'ELECTRICAL ENGINEERING'
  },
  {
    id: 'g2',
    title: 'OBJECT ORIENTED PROGRAMMING',
    teacher: 'Dr. Wangari',
    room: 'Online',
    schedule: 'Fri 10:00 AM',
    type: 'ONLINE',
    platform: 'Microsoft Teams',
    link: 'https://teams.microsoft.com/l/meetup-join/oop',
    isLive: true,
    studentCount: 60,
    department: 'ICT'
  },
  {
    id: 'g3',
    title: 'FLUID MECHANICS',
    teacher: 'Mr. Otieno',
    room: 'Room 12',
    schedule: 'Tue/Thu 11:00 AM',
    type: 'PHYSICAL',
    studentCount: 40,
    department: 'CIVIL ENGINEERING'
  },
  {
    id: 'g4',
    title: 'ENTREPRENEURSHIP',
    teacher: 'Mrs. Njeri',
    room: 'Online',
    schedule: 'Wed 02:00 PM',
    type: 'ONLINE',
    platform: 'Zoom',
    link: 'https://zoom.us/j/ent101',
    isLive: false,
    studentCount: 120,
    department: 'BUSINESS'
  },
  {
    id: 'g5',
    title: 'ELECTRONICS I',
    teacher: 'Prof. Juma',
    room: 'Lab 1',
    schedule: 'Mon/Fri 02:00 PM',
    type: 'PHYSICAL',
    studentCount: 35,
    department: 'ELECTRICAL ENGINEERING'
  }
];

const StudentClasses: React.FC<{ initialTab?: 'PHYSICAL' | 'ONLINE' }> = ({ initialTab = 'PHYSICAL' }) => {
  const [activeView, setActiveView] = useState<'LIST' | 'DETAIL' | 'NOT_LIVE' | 'JOIN_LIST'>( 'LIST');
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [activeTab, setActiveTab] = useState<'PHYSICAL' | 'ONLINE'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Enrollment Modal States
  const [isJoinFormOpen, setIsJoinFormOpen] = useState(false);
  const [classPendingEnrollment, setClassPendingEnrollment] = useState<ClassItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    schoolId: '',
    phone: ''
  });

  const [myClasses, setMyClasses] = useState<ClassItem[]>([
    {
      id: 'sc1',
      title: 'POWER SYSTEMS II',
      teacher: 'Dr. Kamau',
      room: 'Lab 2',
      schedule: 'Mon/Wed/Fri 05:00 AM',
      grade: 82,
      type: 'PHYSICAL',
      studentCount: 42,
      attendance: 90,
      assignmentsDone: '4/5 done',
      department: 'ELECTRICAL ENGINEERING'
    },
    {
      id: 'sc2',
      title: 'PROGRAMMING BASICS',
      teacher: 'Dr. Wangari',
      room: 'Online',
      schedule: 'Tue/Thu 02:00 PM',
      grade: 85,
      type: 'ONLINE',
      platform: 'Microsoft Teams',
      link: 'https://teams.microsoft.com/l/meetup-join/ict101',
      isLive: false,
      studentCount: 38,
      attendance: 95,
      assignmentsDone: '5/5 done',
      department: 'ICT'
    }
  ]);

  const [registryClasses, setRegistryClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    const loadRegistry = () => {
      const data = localStorage.getItem('poly_institutional_registry');
      if (data) {
        setRegistryClasses(JSON.parse(data));
      }
    };
    
    if (activeView === 'JOIN_LIST') {
      loadRegistry();
    }
  }, [activeView]);

  const handleJoinClass = (cls: ClassItem) => {
    if (cls.isLive) {
      window.open(cls.link, '_blank');
    } else {
      setSelectedClass(cls);
      setActiveView('NOT_LIVE');
    }
  };

  const handleOpenJoinForm = (cls: ClassItem) => {
    setClassPendingEnrollment(cls);
    setIsJoinFormOpen(true);
  };

  const handleJoinFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classPendingEnrollment) return;

    // 1. Save to Student's Local List
    const enrolledClass: ClassItem = {
      ...classPendingEnrollment,
      grade: 0,
      attendance: 0,
      assignmentsDone: '0 assignments'
    };
    setMyClasses(prev => [...prev, enrolledClass]);

    // 2. Persist to Global Enrollment Registry for Staff Visibility
    const enrollmentKey = 'poly_enrolled_students';
    const currentEnrollmentsStr = localStorage.getItem(enrollmentKey) || '[]';
    const currentEnrollments = JSON.parse(currentEnrollmentsStr);
    
    const newEnrollment = {
      id: `joined-${Date.now()}`,
      name: formData.name.toUpperCase(),
      admNo: formData.schoolId.toUpperCase(),
      phone: formData.phone,
      classId: classPendingEnrollment.id,
      attendance: 0,
      gradeAverage: 0,
      status: 'ACTIVE'
    };
    
    currentEnrollments.push(newEnrollment);
    localStorage.setItem(enrollmentKey, JSON.stringify(currentEnrollments));

    // 3. Reset and Close
    setIsJoinFormOpen(false);
    setFormData({ name: '', schoolId: '', phone: '' });
    setClassPendingEnrollment(null);
    setActiveView('LIST');
    setSearchQuery('');
  };

  const filteredGlobalClasses = useMemo(() => {
    const combinedRegistry = [...GLOBAL_AVAILABLE_CLASSES, ...registryClasses];
    const uniqueRegistry = Array.from(new Map(combinedRegistry.map(item => [item.id + item.title, item])).values());

    return uniqueRegistry.filter(gc => {
      const alreadyJoined = myClasses.some(mc => mc.id === gc.id || (mc.title === gc.title && mc.teacher === gc.teacher));
      const matchesSearch = gc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           gc.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           gc.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = (activeTab === 'PHYSICAL' ? gc.type === 'PHYSICAL' : gc.type === 'ONLINE');
      return !alreadyJoined && matchesSearch && matchesTab;
    });
  }, [myClasses, searchQuery, activeTab, registryClasses]);

  const renderJoinList = () => (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
        <div>
          <button 
            onClick={() => { setActiveView('LIST'); setSearchQuery(''); }}
            className="mb-4 flex items-center gap-3 text-slate-400 hover:text-[#3d0413] transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft size={16} strokeWidth={3} />
            Back to Dashboard
          </button>
          <h2 className="text-5xl font-black text-[#1a202c] uppercase tracking-tighter leading-none">JOIN NEW CLASS</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 flex items-center gap-3">
             <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
             Registry Node: Available Institutional Modules
          </p>
        </div>

        <div className="relative w-full md:w-96 group">
          <input
            type="text"
            placeholder="Search classes, teachers or depts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 transition-all"
          />
          <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
        </div>
      </div>

      <div className="space-y-6">
        {filteredGlobalClasses.length > 0 ? (
          filteredGlobalClasses.map((cls) => (
            <div key={cls.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-8 group">
              <div className="flex items-center gap-8 flex-1">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all ${cls.type === 'ONLINE' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-[#3d0413]'} group-hover:scale-110`}>
                  {cls.type === 'ONLINE' ? <Monitor size={32} /> : <School size={32} />}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:text-[#3d0413] transition-colors">{cls.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">👨‍🏫 {cls.teacher}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">🏢 {cls.room}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">📅 {cls.schedule}</span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest">{cls.department}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleOpenJoinForm(cls)}
                className="px-10 py-5 bg-[#3d0413] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl border-b-6 border-black active:scale-95 transition-all flex items-center gap-3 whitespace-nowrap"
              >
                <Plus size={18} /> Join Class
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200"><Filter size={48} /></div>
             <h3 className="text-xl font-black text-slate-900 uppercase">No Matches in Registry</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Refine your search parameters or check other tabs</p>
          </div>
        )}
      </div>

      {/* JOIN CLASS MINI PAGE (MODAL) */}
      {isJoinFormOpen && classPendingEnrollment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsJoinFormOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-500">
            <div className="bg-[#3d0413] p-10 text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">ENROLL IN CLASS</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-1 opacity-60">Verification Required</p>
              </div>
              <button onClick={() => setIsJoinFormOpen(false)} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-10">
              <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#3d0413] shadow-sm">
                   {classPendingEnrollment.type === 'ONLINE' ? <Monitor size={24} /> : <School size={24} />}
                </div>
                <div>
                   <h4 className="text-lg font-black text-slate-900 leading-tight uppercase">{classPendingEnrollment.title}</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{classPendingEnrollment.teacher}</p>
                </div>
              </div>

              <form onSubmit={handleJoinFormSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 flex items-center gap-2">
                    <User size={12} /> Full Legal Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 flex items-center gap-2">
                    <Hash size={12} /> School Registry ID
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.schoolId}
                    onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                    placeholder="EE/XXX/2024"
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 flex items-center gap-2">
                    <Smartphone size={12} /> Communication Node (Phone)
                  </label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254 7XX XXX XXX"
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-6 mt-4 bg-[#3d0413] text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all border-b-6 border-black flex items-center justify-center gap-4"
                >
                  Confirm Enrollment <CheckCircle2 size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderClassNotLive = () => {
    if (!selectedClass) return null;
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in zoom-in duration-500">
        <button 
          onClick={() => setActiveView('LIST')}
          className="mb-8 flex items-center gap-3 text-slate-400 hover:text-[#3d0413] transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={16} strokeWidth={3} />
          Back to Online Node
        </button>

        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="bg-[#3d0413] p-12 text-center text-white relative">
            <div className="absolute top-8 right-8 animate-pulse">
               <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">CLASS NOT LIVE YET</h2>
            <div className="flex items-center justify-center gap-4 text-rose-300 font-bold">
               <Clock size={20} />
               <span className="text-lg">Starts in: 2 hours 15 minutes</span>
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] opacity-60">Next Session: Today, {selectedClass.schedule.split(' ').pop()}</p>
          </div>

          <div className="p-12 space-y-12">
             <div className="grid grid-cols-2 gap-6">
                <button className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-slate-100 transition-all group">
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#3d0413] shadow-sm group-hover:scale-110 transition-transform"><CalendarPlus size={24} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Add to Calendar</span>
                </button>
                <button className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-slate-100 transition-all group">
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform"><Bell size={24} /></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Set Reminder</span>
                </button>
             </div>

             <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 text-center">Wait-Time Resource Hub</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {[
                     { label: 'View Materials', icon: <BookOpen size={18} />, action: '📚' },
                     { label: 'Check Assignments', icon: <FileText size={18} />, action: '📝' },
                     { label: 'View Announcements', icon: <MessageSquare size={18} />, action: '💬' },
                   ].map(item => (
                     <button key={item.label} className="flex items-center gap-4 px-6 py-5 bg-white border border-slate-100 rounded-2xl hover:border-[#3d0413] transition-all group">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#3d0413] group-hover:bg-[#3d0413] group-hover:text-white transition-all">{item.icon}</div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClassDetail = () => {
    if (!selectedClass) return null;
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 pb-20">
        <button 
          onClick={() => setActiveView('LIST')}
          className="mb-8 flex items-center gap-3 text-slate-400 hover:text-[#3d0413] transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft size={16} strokeWidth={3} />
          Back to My Classes
        </button>

        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="bg-[#3d0413] p-12 text-white">
            <div className="flex justify-between items-start mb-10">
              <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{selectedClass.title}</h2>
              <div className={`p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 ${selectedClass.type === 'ONLINE' ? 'text-blue-300' : 'text-rose-300'}`}>
                {selectedClass.type === 'ONLINE' ? <Monitor size={24} /> : <School size={24} />}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Teacher</p>
                 <p className="font-bold text-lg flex items-center gap-2 text-white">👨‍🏫 {selectedClass.teacher}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Room</p>
                 <p className="font-bold text-lg flex items-center gap-2 text-white">🏢 {selectedClass.room}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Time</p>
                 <p className="font-bold text-lg flex items-center gap-2 text-white">📅 {selectedClass.schedule}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Class Size</p>
                 <p className="font-bold text-lg flex items-center gap-2 text-white">👥 {selectedClass.studentCount} students</p>
               </div>
            </div>
          </div>

          <div className="p-12 space-y-12">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">My Performance Node</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Grade Average</p>
                  <p className="text-5xl font-black text-slate-900">{selectedClass.grade}%</p>
                  <div className="mt-6 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#3d0413] rounded-full" style={{ width: `${selectedClass.grade}%` }}></div>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Attendance Node</p>
                  <p className="text-5xl font-black text-emerald-600">{selectedClass.attendance}%</p>
                  <div className="mt-6 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedClass.attendance}%` }}></div>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Assignments</p>
                  <p className="text-4xl font-black text-slate-900">{selectedClass.assignmentsDone?.toUpperCase()}</p>
                  <div className="mt-6 flex items-center gap-2">
                    <ChevronRight size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-[#3d0413]">View All</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Quick Repository Access</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'View Materials', icon: <BookOpen size={20} />, color: 'bg-rose-50 text-[#3d0413]' },
                  { label: 'View Assignments', icon: <FileText size={20} />, color: 'bg-amber-50 text-amber-700' },
                  { label: 'View Grades', icon: <BarChart3 size={20} />, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'View Schedule', icon: <Calendar size={20} />, color: 'bg-indigo-50 text-indigo-700' },
                ].map(link => (
                  <button key={link.label} className="group p-8 rounded-[2rem] border border-slate-100 hover:border-[#3d0413] hover:shadow-xl transition-all duration-500 text-center">
                    <div className={`w-14 h-14 ${link.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>{link.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClassList = () => {
    const filteredClasses = myClasses.filter(c => 
      activeTab === 'PHYSICAL' ? c.type === 'PHYSICAL' : c.type === 'ONLINE'
    );

    return (
      <div className="space-y-12 animate-in fade-in duration-1000 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-6xl font-black text-[#1a202c] uppercase tracking-tighter leading-none mb-4">
              {activeTab === 'PHYSICAL' ? 'MY CLASSES' : 'MY ONLINE CLASSES'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
               <span className="w-2 h-2 bg-[#3d0413] rounded-full animate-pulse"></span>
               {activeTab === 'PHYSICAL' ? 'Physical Node Synchronized • TKNP Active Registry' : 'Virtual Classroom Link Authorized • Active Streaming Hub'}
            </p>
          </div>
          <div className="flex gap-4 p-2 bg-slate-100 rounded-[1.5rem] border border-slate-200">
             <button 
               onClick={() => setActiveTab('PHYSICAL')}
               className={`px-8 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === 'PHYSICAL' ? 'bg-white text-[#3d0413] shadow-md' : 'text-slate-400'}`}
             >
               Physical
             </button>
             <button 
               onClick={() => setActiveTab('ONLINE')}
               className={`px-8 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === 'ONLINE' ? 'bg-[#3d0413] text-white shadow-md' : 'text-slate-400'}`}
             >
               Online
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredClasses.map((cls, idx) => (
            <div 
              key={cls.id}
              className={`bg-white rounded-[3.5rem] border border-slate-100 p-10 hover:shadow-[0_50px_80px_-20px_rgba(61,4,19,0.12)] transition-all duration-700 group cursor-pointer active:scale-95 flex flex-col justify-between aspect-[5/6] ${activeTab === 'ONLINE' ? 'border-l-8 border-l-[#3d0413]' : ''}`}
              onClick={() => {
                if (activeTab === 'PHYSICAL') {
                  setSelectedClass(cls);
                  setActiveView('DETAIL');
                }
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-10">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    {String(idx + 1).padStart(2, '0')}. Module
                  </span>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${cls.type === 'ONLINE' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-[#3d0413]'} group-hover:scale-110`}>
                    {cls.type === 'ONLINE' ? <Monitor size={20} /> : <School size={20} />}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-[#3d0413] transition-colors">{cls.title}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                      <span className="text-lg">👩‍🏫</span> {cls.teacher}
                    </div>
                    {activeTab === 'ONLINE' && (
                      <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                        <span className="text-lg">🌐</span> {cls.platform}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                      <span className="text-lg">🏢</span> {cls.room}
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                      <span className="text-lg">📅</span> {cls.schedule}
                    </div>
                    {activeTab === 'ONLINE' && cls.link && (
                       <div className="flex items-center gap-3 text-[#3d0413] font-black text-xs truncate opacity-40">
                         <span className="text-lg">🔗</span> {cls.link.replace('https://', '')}
                       </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-6">
                {activeTab === 'PHYSICAL' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Grade Node</span>
                      <span className="text-2xl font-black text-slate-900 group-hover:text-[#3d0413] transition-colors">📊 {cls.grade}%</span>
                    </div>
                    <button className="w-full py-5 bg-slate-50 group-hover:bg-[#3d0413] text-slate-400 group-hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all duration-500 flex items-center justify-center gap-3">
                      View Class <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleJoinClass(cls); }}
                    className={`w-full py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all duration-500 flex items-center justify-center gap-3 shadow-xl active:scale-95 border-b-6 border-black ${cls.isLive ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-[#3d0413] text-white hover:bg-black'}`}
                  >
                    {cls.isLive ? <Play size={16} fill="currentColor" /> : <Clock size={16} />}
                    {cls.isLive ? 'JOIN CLASS' : 'PREVIEW SESSION'}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          <div 
            onClick={() => setActiveView('JOIN_LIST')}
            className="aspect-[5/6] border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 text-slate-300 hover:text-[#3d0413] hover:border-[#3d0413] hover:bg-slate-50 transition-all cursor-pointer group"
          >
             <div className="w-20 h-20 rounded-full border-4 border-dashed border-current flex items-center justify-center group-hover:scale-110 group-hover:border-solid transition-all">
               <Plus size={40} strokeWidth={3} />
             </div>
             <span className="text-[11px] font-black uppercase tracking-[0.4em]">{activeTab === 'PHYSICAL' ? 'Add Class' : 'Join New Class'}</span>
          </div>
        </div>

        {activeTab === 'ONLINE' && (
          <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#3d0413] shadow-sm"><Calendar size={32}/></div>
                <div>
                   <h4 className="text-xl font-black text-slate-900 uppercase">Institutional Sync</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next scheduled virtual node at 04:00 PM</p>
                </div>
             </div>
             <button className="px-10 py-5 bg-white text-[#3d0413] border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3">
                <Clock size={18} /> View Schedule
             </button>
          </div>
        )}
      </div>
    );
  };

  if (activeView === 'DETAIL') return renderClassDetail();
  if (activeView === 'NOT_LIVE') return renderClassNotLive();
  if (activeView === 'JOIN_LIST') return renderJoinList();
  return renderClassList();
};

export default StudentClasses;