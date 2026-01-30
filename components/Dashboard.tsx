import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Resource, UserRole } from '../types';
import { 
  Plus, Search, GraduationCap, Clock, ArrowLeft, 
  ChevronRight, X, Database, ShieldCheck, Timer, Save, Mic, Video as VideoIcon,
  MessageCircle, SendHorizonal, MapPin, ClipboardCheck, Calendar as CalendarIcon, 
  CheckCircle2, XCircle, Users, Globe, MonitorPlay, Sparkles, ExternalLink, Volume2, 
  FileCheck, AlertCircle, Trash2, RefreshCw, LayoutDashboard, BarChart3, 
  Settings, Layers, Briefcase, Zap, ShieldAlert, Fingerprint, PlusCircle, UserPlus, History, UserCheck, User as UserIcon,
  Loader2, Edit3, Trash, ChevronUp, ChevronDown, CalendarSearch
} from 'lucide-react';
import { researchWithGrounding } from '../geminiService';

interface DashboardProps {
  user: User;
  resources: Resource[];
}

type SystemView = 'HOME' | 'PHYSICAL_CLASSES_OVERVIEW' | 'PHYSICAL_CLASS_DETAIL' | 'ONLINE_CLASSES' | 'ONLINE_CLASS_DETAIL';
type SubPortalView = 'COMMAND' | 'ATTENDANCE' | 'TIMETABLE' | 'STUDENTS' | 'RESOURCES' | 'ASSESSMENT' | 'REPORTS';

interface PhysicalClass {
  id: string;
  code: string;
  title: string;
  room: string;
  studentCount: number;
  nextSession: string;
}

interface StudentNode {
  id: string;
  name: string;
  admNo: string;
  phone: string;
  history: string;
}

interface TimetableSlot {
  id: string;
  time: string;
  className: string;
  room: string;
}

interface DaySchedule {
  date: string;
  slots: TimetableSlot[];
}

const StaffDashboardHome: React.FC<DashboardProps> = ({ user, resources }) => {
  const [currentView, setCurrentView] = useState<SystemView>('HOME');
  const [subPortal, setSubPortal] = useState<SubPortalView>('COMMAND');
  const [selectedPhysicalClass, setSelectedPhysicalClass] = useState<PhysicalClass | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<{text: string, sources: any[]} | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedOnlineClass, setSelectedOnlineClass] = useState<any | null>(null);

  // Helper to get dynamic date for a specific weekday in the current week
  const getDayDate = (dayName: string) => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const targetIdx = days.indexOf(dayName);
    const now = new Date();
    const currentIdx = now.getDay();
    const diff = targetIdx - currentIdx;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);
    return targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Timetable State
  const [timetableMode, setTimetableMode] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  
  // Set active day to today's weekday name
  const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const [activeDay, setActiveDay] = useState<string>(daysOfWeek[new Date().getDay()]);
  
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{day: string, slot: TimetableSlot} | null>(null);
  const [numWeeks, setNumWeeks] = useState(5);
  
  // Time Selection States
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [newSlotData, setNewSlotData] = useState({ className: '', room: '' });

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [timetableData, setTimetableData] = useState<Record<string, DaySchedule>>({
    "SUNDAY": { date: getDayDate("SUNDAY"), slots: [] },
    "MONDAY": { date: getDayDate("MONDAY"), slots: [
      { id: '1', time: "10:31", className: "Math 101", room: "Room 12" },
      { id: '2', time: "11:15", className: "Science Lab", room: "Lab 3" },
      { id: '3', time: "13:45", className: "English", room: "Hall A" }
    ]},
    "TUESDAY": { date: getDayDate("TUESDAY"), slots: [
      { id: '4', time: "09:10", className: "Physics", room: "Room 8" },
      { id: '5', time: "10:50", className: "Math 101", room: "Room 12" },
      { id: '6', time: "12:25", className: "Workshop", room: "Workshop 2" },
      { id: '7', time: "14:30", className: "Tutorial", room: "Lab 1" }
    ]},
    "WEDNESDAY": { date: getDayDate("WEDNESDAY"), slots: [
      { id: '8', time: "08:45", className: "ICT", room: "IT Hub 1" },
      { id: '9', time: "11:05", className: "Lab", room: "Physics Lab" },
      { id: '10', time: "15:20", className: "Meeting", room: "Staff Room" }
    ]},
    "THURSDAY": { date: getDayDate("THURSDAY"), slots: [
      { id: '11', time: "10:00", className: "English", room: "Hall A" },
      { id: '12', time: "12:40", className: "Science", room: "Lab 2" },
      { id: '13', time: "16:10", className: "Project", room: "Workshop 4" }
    ]},
    "FRIDAY": { date: getDayDate("FRIDAY"), slots: [
      { id: '14', time: "09:55", className: "Review", room: "Room 5" },
      { id: '15', time: "13:15", className: "Test", room: "Hall B" },
      { id: '16', time: "14:45", className: "Lab", room: "Micro Lab" }
    ]},
    "SATURDAY": { date: getDayDate("SATURDAY"), slots: [] }
  });

  const handleAddSlot = (day: string) => {
    if (!newSlotData.className) return;
    const time = `${selectedHour}:${selectedMinute}`;
    const slot: TimetableSlot = {
      id: Math.random().toString(36).substr(2, 9),
      time,
      ...newSlotData
    };
    setTimetableData(prev => ({
      ...prev,
      [day]: { ...prev[day], slots: [...prev[day].slots, slot].sort((a, b) => a.time.localeCompare(b.time)) }
    }));
    setNewSlotData({ className: '', room: '' });
    setSelectedHour('08');
    setSelectedMinute('00');
    setIsAddingSlot(false);
  };

  const handleUpdateSlot = (day: string) => {
    if (!editingSlot) return;
    setTimetableData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map(s => s.id === editingSlot.slot.id ? editingSlot.slot : s)
      }
    }));
    setEditingSlot(null);
  };

  const handleDeleteSlot = (day: string, id: string) => {
    setTimetableData(prev => ({
      ...prev,
      [day]: { ...prev[day], slots: prev[day].slots.filter(s => s.id !== id) }
    }));
  };

  // Student management states
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', admNo: '', phone: '' });
  const [focusedStudent, setFocusedStudent] = useState<StudentNode | null>(null);
  const [students, setStudents] = useState<StudentNode[]>([
    { id: '1', name: 'Kiprono Kemboi', admNo: '2024/EE/001', phone: '0712345678', history: '98% Att.' },
    { id: '2', name: 'Mary Wambui', admNo: '2024/EE/014', phone: '0722334455', history: '62% Att.' },
    { id: '3', name: 'Peter Otieno', admNo: '2024/EE/018', phone: '0733445566', history: '91% Att.' },
    { id: '4', name: 'Sarah Jepchirchir', admNo: '2024/EE/022', phone: '0744556677', history: '78% Att.' },
  ]);

  // Persistent session attendance tracking
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  const markAttendance = (id: string, status: 'present' | 'absent') => {
    if (attendanceState[id]) return;
    setAttendanceState(prev => ({ ...prev, [id]: status }));
    setSaveStatus('idle');
  };

  const markAllPresent = () => {
    const newState = { ...attendanceState };
    students.forEach(s => {
      if (!newState[s.id]) newState[s.id] = 'present';
    });
    setAttendanceState(newState);
    setSaveStatus('idle');
  };

  const handleSaveAttendance = async () => {
    if (Object.keys(attendanceState).length === 0) return;
    setIsSavingAttendance(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSavingAttendance(false);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 5000);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        setIsCameraActive(true);
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }
  };

  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    if (node && isCameraActive && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(console.error);
    }
  }, [isCameraActive, currentView]);

  const handleAiResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await researchWithGrounding(aiQuery);
      setAiResponse(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.admNo) return;
    const student: StudentNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: newStudent.name,
      admNo: newStudent.admNo,
      phone: newStudent.phone || 'N/A',
      history: '100% Att.'
    };
    setStudents([student, ...students]);
    setNewStudent({ name: '', admNo: '', phone: '' });
    setIsAddingStudent(false);
  };

  const getGraphData = () => {
    if (focusedStudent) {
      const baseValue = parseInt(focusedStudent.history) || 0;
      return [
        Math.min(100, Math.max(10, baseValue - 8)),
        Math.min(100, Math.max(10, baseValue + 4)),
        Math.min(100, Math.max(10, baseValue - 15)),
        Math.min(100, Math.max(10, baseValue + 2)),
        Math.min(100, Math.max(10, baseValue - 5)),
        Math.min(100, Math.max(10, baseValue + 6)),
        baseValue
      ];
    }
    return [65, 82, 45, 90, 78, 62, 85];
  };

  const myPhysicalClasses: PhysicalClass[] = [
    { id: 'pc1', code: 'EE-402', title: 'POWER SYSTEMS II', room: 'Power Lab 2', studentCount: 42, nextSession: 'Tomorrow, 08:00 AM' },
    { id: 'pc2', code: 'EE-305', title: 'CIRCUIT THEORY', room: 'Lecture Hall B', studentCount: 38, nextSession: 'Today, 02:00 PM' },
    { id: 'pc3', code: 'EE-201', title: 'DIGITAL ELECTRONICS', room: 'Micro Lab 4', studentCount: 45, nextSession: 'Fri, 10:00 AM' },
  ];

  // Logic to check if there are any classes for today
  const currentDayName = daysOfWeek[currentTime.getDay()];
  const hasClassesToday = (timetableData[currentDayName]?.slots?.length || 0) > 0;

  const HomeView = (
    <div className="max-w-7xl mx-auto space-y-12 py-12 px-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-[#3d0413] shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">COMMAND TERMINAL / V5.0.2</p>
            <h1 className="text-5xl font-black text-[#1a202c] uppercase tracking-tight">INSTITUTIONAL PORTAL</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              WELCOME BACK, <span className="text-[#3d0413]">{user.name.toUpperCase()}</span> • {user.department || 'ELECTRICAL ENGINEERING'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/50 border border-slate-200 p-2 rounded-full shadow-sm pr-6">
            <div className="w-12 h-12 bg-[#3d0413] rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">
              {currentTime.getHours().toString().padStart(2, '0')}
            </div>
            <div className="text-slate-300 font-bold text-lg mx-1">:</div>
            <div className="w-12 h-12 bg-[#3d0413] rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">
              {currentTime.getMinutes().toString().padStart(2, '0')}
            </div>
            <div className="ml-4 pl-4 border-l border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Global Date</p>
                <p className="text-[10px] font-black text-[#1a202c] uppercase mt-1 leading-none">
                  {currentTime.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 bg-[#3d0413] rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center">
                  <Database size={28} className="text-rose-300" />
                </div>
                <div className="px-5 py-2 bg-rose-500/10 border border-rose-500/30 rounded-full">
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase text-rose-200">OFFICIAL ACADEMIC REGISTRY</span>
                </div>
              </div>
              <button 
                onClick={() => setIsAiPanelOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
              >
                <Sparkles size={16} /> AI Librarian
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div 
                className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group cursor-pointer hover:border-white transition-all hover:bg-white/5" 
                onClick={() => setCurrentView('PHYSICAL_CLASSES_OVERVIEW')}
              >
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">MY PHYSICAL CLASSES</h3>
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-2">Enterprise Management System v5.0</p>
                </div>
                <button className="w-full py-5 bg-white text-[#3d0413] rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl group-hover:bg-rose-50 transition-all flex items-center justify-between px-8 mt-10">
                  MANAGE OVERVIEW <ChevronRight size={18} />
                </button>
              </div>

              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-white transition-colors">
                <h3 className="text-2xl font-black uppercase tracking-tight">ADD PHYSICAL CLASS</h3>
                <button className="w-full py-5 bg-white text-[#3d0413] rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-rose-50 transition-all px-8 mt-10">
                  INITIALIZE SESSION
                </button>
              </div>

              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group cursor-pointer hover:border-white transition-colors" onClick={() => setCurrentView('ONLINE_CLASSES')}>
                <h3 className="text-2xl font-black uppercase tracking-tight">MY ONLINE HUB</h3>
                <button className="w-full py-5 bg-transparent border-2 border-white/40 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-between px-8 mt-10 hover:bg-white/5">
                  LAUNCH VIRTUAL LAB <MonitorPlay size={18} />
                </button>
              </div>

              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-white transition-colors">
                <h3 className="text-2xl font-black uppercase tracking-tight">ADD ONLINE HUB</h3>
                <button className="w-full py-5 bg-transparent border-2 border-white/40 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-between px-8 mt-10 hover:bg-white/5">
                  CONNECT EXTERNAL NODE
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 border-4 border-dashed border-[#3d0413]/30 rounded-[2rem] p-10 flex flex-col">
          <h3 className="text-[#3d0413] font-black uppercase tracking-[0.2em] text-sm mb-6">LIVE TIMETABLE</h3>
          <div className="space-y-4 flex-1">
             {[
               { time: '08:00', title: 'Power Systems', room: 'Lab 1', status: 'COMPLETED' },
               { time: '10:00', title: 'Circuit Theory', room: 'Hall A', status: 'IN_PROGRESS' },
               { time: '14:00', title: 'Microprocessors', room: 'Lab 4', status: 'UPCOMING' }
             ].map((slot, i) => (
               <div key={i} className={`p-4 rounded-2xl border transition-all ${slot.status === 'IN_PROGRESS' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <p className="text-[10px] font-black text-slate-400 mb-1">{slot.time}</p>
                  <h4 className="font-black text-xs uppercase text-slate-800">{slot.title}</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{slot.room}</p>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  const PhysicalClassesOverview = (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-500">
       <header className="flex items-center justify-between">
          <div className="flex items-center gap-6">
             <button onClick={() => setCurrentView('HOME')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95"><ArrowLeft size={24} /></button>
             <div>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Physical Classes Overview</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Enterprise-grade lifecycle management</p>
             </div>
          </div>
          <button className="flex items-center gap-3 px-8 py-4 bg-[#3d0413] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">
             <PlusCircle size={20}/> New Session Hub
          </button>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {myPhysicalClasses.map(cls => (
            <div 
              key={cls.id} 
              onClick={() => { setSelectedPhysicalClass(cls); setCurrentView('PHYSICAL_CLASS_DETAIL'); setSubPortal('COMMAND'); }}
              className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
            >
               <div className="flex justify-between items-start mb-8">
                  <span className="px-4 py-1.5 bg-rose-50 text-[#3d0413] text-[9px] font-black uppercase rounded-xl border border-rose-100">{cls.code}</span>
                  <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Operational
                  </div>
               </div>
               <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase leading-tight group-hover:text-[#3d0413] transition-colors">{cls.title}</h3>
               
               <div className="space-y-4 mb-6 border-y border-slate-50 py-6">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-widest">Facility</span>
                     <span className="text-slate-900 uppercase">{cls.room}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-widest">Registry Nodes</span>
                     <span className="text-slate-900">{cls.studentCount} Students</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase tracking-widest">Next Window</span>
                     <span className="text-[#3d0413] uppercase">{cls.nextSession}</span>
                  </div>
               </div>

               <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhysicalClass(cls);
                        setCurrentView('PHYSICAL_CLASS_DETAIL');
                        setSubPortal('TIMETABLE');
                      }}
                      className="px-4 py-2 border-2 border-[#3d0413]/30 hover:border-[#3d0413] text-[#3d0413] rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Time Table
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhysicalClass(cls);
                        setCurrentView('PHYSICAL_CLASS_DETAIL');
                        setSubPortal('ATTENDANCE');
                      }}
                      className="px-4 py-2 border-2 border-[#3d0413]/30 hover:border-[#3d0413] text-[#3d0413] rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Register
                    </button>
                  </div>
                  <button className="w-full py-5 bg-slate-50 group-hover:bg-[#3d0413] group-hover:text-white text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                    ACCESS COMMAND CENTER <ChevronRight size={16}/>
                  </button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  const StudentAddForm = (
    <div className="w-full bg-white border-2 border-[#3d0413]/10 p-8 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-500 flex flex-col gap-6 relative overflow-hidden">
       <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-3xl -mr-12 -mt-12"></div>
       <div className="flex items-center justify-between relative z-10">
          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">INITIALIZE NEW STUDENT NODE</h4>
          <button onClick={() => setIsAddingStudent(false)} className="text-slate-300 hover:text-rose-950 transition-colors"><X size={24}/></button>
       </div>
       <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FULL NAME</label>
             <input 
               type="text" 
               placeholder="E.G. JANE DOE" 
               value={newStudent.name}
               required
               onChange={e => setNewStudent({...newStudent, name: e.target.value})}
               className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-black uppercase focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
             />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ADM NUMBER</label>
             <input 
               type="text" 
               placeholder="2026/EE/0XXX" 
               value={newStudent.admNo}
               required
               onChange={e => setNewStudent({...newStudent, admNo: e.target.value})}
               className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-black uppercase focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
             />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CONTACT NODE</label>
             <input 
               type="text" 
               placeholder="07XX XXX XXX" 
               value={newStudent.phone}
               onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
               className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-black uppercase focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
             />
          </div>
          <div className="md:col-span-3 pt-2">
             <button type="submit" className="w-full py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                <CheckCircle2 size={18}/> REGISTER TO REGISTRY
             </button>
          </div>
       </form>
    </div>
  );

  const PhysicalClassDashboardDetail = (
    <div className="flex h-[calc(100vh-65px)] bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-slate-100">
           <button onClick={() => setCurrentView('PHYSICAL_CLASSES_OVERVIEW')} className="flex items-center gap-3 text-slate-400 hover:text-[#3d0413] transition-colors mb-8">
              <ArrowLeft size={18}/>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Overview</span>
           </button>
           <div className="mb-6">
              <span className="px-3 py-1 bg-rose-50 text-[#3d0413] rounded-lg text-[8px] font-black uppercase border border-rose-100">{selectedPhysicalClass?.code}</span>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-3 leading-tight">{selectedPhysicalClass?.title}</h2>
           </div>
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Institutional Node v5.0</p>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
           {[
             { id: 'COMMAND', label: 'Executive Center', icon: <LayoutDashboard size={18}/> },
             { id: 'ATTENDANCE', label: 'Attendance Lab', icon: <Fingerprint size={18}/> },
             { id: 'TIMETABLE', label: 'Timetable Matrix', icon: <Clock size={18}/> },
             { id: 'STUDENTS', label: 'Student Roster', icon: <Users size={18}/> },
             { id: 'RESOURCES', label: 'Resource Core', icon: <Briefcase size={18}/> },
             { id: 'ASSESSMENT', label: 'Academic Eval', icon: <FileCheck size={18}/> },
           ].map(item => (
             <button 
               key={item.id}
               onClick={() => { setSubPortal(item.id as SubPortalView); setIsAddingStudent(false); }}
               className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${subPortal === item.id ? 'bg-[#3d0413] text-white shadow-xl translate-x-2' : 'text-slate-500 hover:bg-slate-50 hover:text-[#3d0413]'}`}
             >
               <span className={`${subPortal === item.id ? 'text-rose-400' : 'text-slate-300 group-hover:text-rose-950'}`}>{item.icon}</span>
               <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
             </button>
           ))}
        </nav>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Registry Sync Active</span>
           </div>
           <p className="text-[8px] font-bold text-slate-300 uppercase leading-relaxed text-slate-400">SECURE CHANNEL: {selectedPhysicalClass?.room?.toUpperCase().replace(' ', '-')}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto space-y-12">
           
           {subPortal === 'COMMAND' && (
             <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">EXECUTIVE DASHBOARD</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">REAL-TIME SESSION INTELLIGENCE</p>
                   </div>
                   <div className="flex gap-4">
                      <button className="px-8 py-3.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#3d0413] shadow-sm hover:shadow-xl transition-all">EXPORT AUDIT</button>
                      <button className="px-8 py-3.5 bg-[#3d0413] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">REQUEST INTERVENTION</button>
                   </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                   <div className="lg:w-1/3">
                      <div className={`bg-white p-12 rounded-[3.5rem] border transition-all duration-700 group relative overflow-hidden h-full flex flex-col justify-center ${focusedStudent ? 'border-[#3d0413] shadow-2xl scale-[1.02]' : 'border-slate-100 shadow-sm'}`}>
                        {focusedStudent && (
                           <button onClick={() => setFocusedStudent(null)} className="absolute top-8 right-8 p-3 bg-[#3d0413] text-white rounded-full hover:bg-black transition-all z-20 shadow-xl scale-110">
                              <X size={18}/>
                           </button>
                        )}
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-10 transition-all duration-500 shadow-xl ${focusedStudent ? 'bg-[#3d0413] text-white rotate-12 scale-110' : 'bg-rose-50 text-[#3d0413]'}`}>
                           {focusedStudent ? <UserCheck size={40}/> : <Users size={40}/>}
                        </div>
                        <div className="animate-in fade-in duration-1000">
                          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.5em] mb-4">
                            {focusedStudent ? 'NODE SYNC PERFORMANCE' : 'Attendance Rate'}
                          </p>
                          <h4 className={`font-black text-[#1a202c] mb-4 transition-all duration-700 tracking-tighter ${focusedStudent ? 'text-6xl scale-105' : 'text-8xl'}`}>
                            {focusedStudent ? focusedStudent.history.replace(' Att.', '') : '94.2%'}
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-3 px-6 py-2 rounded-full transition-all ${focusedStudent ? 'bg-rose-50 border border-rose-100' : ''}`}>
                               <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${focusedStudent ? 'bg-[#3d0413]' : 'bg-emerald-50'}`}></div> 
                               <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${focusedStudent ? 'text-[#3d0413]' : 'text-emerald-500'}`}>
                                  {focusedStudent ? focusedStudent.name : '+2.1% GROWTH'}
                               </span>
                            </div>
                          </div>
                        </div>
                        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -mr-24 -mt-24 transition-all duration-1000 ${focusedStudent ? 'bg-[#3d0413]/20 scale-[2]' : 'bg-rose-50/50 scale-100'}`}></div>
                      </div>
                   </div>

                   <div className="lg:w-2/3 space-y-8">
                      <div className="flex justify-end items-center">
                         {isAddingStudent ? StudentAddForm : (
                            <button onClick={() => setIsAddingStudent(true)} className="px-12 py-5 bg-[#3d0413] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-[0_25px_50px_-12px_rgba(61,4,19,0.3)] hover:bg-black transition-all active:scale-95 border-b-4 border-black/20 flex items-center gap-4 group">
                               <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-all"><UserPlus size={18}/></div>
                               ADD STUDENT
                            </button>
                         )}
                      </div>

                      <div className="bg-white border-2 border-rose-900/10 rounded-[3rem] shadow-sm overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-rose-50/20 border-b border-rose-900/10">
                               <tr className="divide-x divide-rose-900/10">
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em] w-24">ICON</th>
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">NAME</th>
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">ADM NO</th>
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">PHONE NUMBER</th>
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">HISTORY</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-900/10">
                               {students.map(std => (
                                 <tr key={std.id} className={`transition-all duration-300 divide-x divide-rose-900/10 group cursor-pointer ${focusedStudent?.id === std.id ? 'bg-[#3d0413]/5' : 'hover:bg-rose-50/10'}`} onClick={() => setFocusedStudent(std)}>
                                    <td className="px-8 py-6">
                                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-all group-hover:scale-110 ${focusedStudent?.id === std.id ? 'bg-[#3d0413] text-white rotate-12' : 'bg-slate-100 text-[#3d0413] group-hover:bg-white'}`}>
                                          {std.name.charAt(0)}
                                       </div>
                                    </td>
                                    <td className={`px-8 py-6 text-[12px] font-black uppercase transition-colors ${focusedStudent?.id === std.id ? 'text-[#3d0413] scale-105 origin-left' : 'text-slate-800'}`}>{std.name}</td>
                                    <td className="px-8 py-6 text-[11px] font-black text-slate-400 tracking-widest">{std.admNo}</td>
                                    <td className="px-8 py-6 text-[11px] font-black text-slate-500 uppercase">{std.phone}</td>
                                    <td className="px-8 py-6">
                                       <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all bg-emerald-50 text-emerald-600 border-emerald-100">{std.history}</div>
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <div className="lg:col-span-2 bg-white rounded-[3.5rem] border border-slate-100 p-12 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-16">
                         <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">GRAPHICAL DATA</h4>
                         <span className="px-5 py-2 bg-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {focusedStudent ? `${focusedStudent.name.toUpperCase()} REGISTRY` : `${currentTime.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()} - REGISTRY HISTORY`}
                         </span>
                      </div>
                      <div className="h-64 flex items-end gap-5">
                         {getGraphData().map((h, i) => (
                           <div key={i} className="flex-1 bg-slate-50 rounded-2xl relative group cursor-help transition-all">
                              <div className={`absolute bottom-0 left-0 right-0 rounded-2xl transition-all duration-1000 ${focusedStudent ? 'bg-rose-900' : 'bg-[#3d0413]'} group-hover:bg-rose-600`} style={{ height: `${h}%` }}></div>
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#3d0413] opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 whitespace-nowrap">{h}% NODE SYNC</div>
                           </div>
                         ))}
                      </div>
                      <div className="flex justify-between mt-10 px-4">
                         {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                           <span key={d} className={`text-[10px] font-black uppercase tracking-widest ${daysOfWeek[new Date().getDay()].slice(0, 3) === d ? 'text-[#3d0413]' : 'text-slate-300'}`}>{d}</span>
                         ))}
                      </div>
                   </div>
                   <div className="bg-[#3d0413] rounded-[3.5rem] p-12 text-white shadow-[0_50px_100px_-20px_rgba(61,4,19,0.3)] flex flex-col justify-between group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:scale-125 transition-transform duration-1000"></div>
                      <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-10 border border-white/10"><ShieldAlert size={32} className="text-rose-400" /></div>
                        <h4 className="text-3xl font-black uppercase leading-none tracking-tight mb-6">RISK DETECTION<br/>NODE</h4>
                        <p className="text-sm text-rose-100/70 font-medium leading-relaxed">System has flagged critical attendance gaps.</p>
                      </div>
                      <button className="relative z-10 w-full py-5 bg-white text-[#3d0413] rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] mt-12 hover:bg-rose-50 transition-all shadow-xl">RESOLVE ALERTS</button>
                   </div>
                </div>
             </div>
           )}

           {subPortal === 'TIMETABLE' && (
             <div className="space-y-12 animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">TIMETABLE MATRIX</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">MULTI-NODE SCHEDULING INTERFACE</p>
                   </div>
                   <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                      <button 
                        onClick={() => setTimetableMode('WEEKLY')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableMode === 'WEEKLY' ? 'bg-[#3d0413] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                      >WEEKLY MATRIX</button>
                      <button 
                        onClick={() => setTimetableMode('DAILY')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableMode === 'DAILY' ? 'bg-[#3d0413] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                      >DAILY NODES</button>
                   </div>
                </div>

                {timetableMode === 'WEEKLY' ? (
                  <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                       <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Institutional Weekly Hub View</h4>
                       <div className="flex flex-col items-end gap-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol v5.0 Active</span>
                          <button 
                            onClick={() => setNumWeeks(prev => prev + 1)}
                            className="px-8 py-3 border-2 border-[#3d0413] rounded-lg text-lg font-black uppercase tracking-widest text-[#3d0413] hover:bg-[#3d0413] hover:text-white transition-all shadow-md active:scale-95"
                          >
                            ADD WEEK
                          </button>
                       </div>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                          <thead>
                             <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-10 py-8 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em] w-32">DAY</th>
                                {Array.from({ length: numWeeks }).map((_, i) => (
                                  <th key={i} className="px-8 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] whitespace-nowrap">WEEK {i + 1}</th>
                                ))}
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {(Object.entries(timetableData) as [string, DaySchedule][]).map(([day, schedule]) => (
                               <tr key={day} className="hover:bg-slate-50/50 transition-all divide-x divide-slate-50">
                                  <td className="px-10 py-10 font-black text-[#3d0413] text-sm uppercase tracking-tighter">{day.slice(0, 3)}</td>
                                  {Array.from({ length: numWeeks }).map((_, idx) => (
                                    <td key={idx} className="px-8 py-10 align-top group min-w-[200px]">
                                       {schedule.slots[idx] ? (
                                         <div className="space-y-2">
                                            <p className="text-[12px] font-black text-[#3d0413] bg-rose-50 inline-block px-2 py-1 rounded-lg border border-rose-100">{schedule.slots[idx].time}</p>
                                            <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight">{schedule.slots[idx].className}</h5>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{schedule.slots[idx].room}</p>
                                         </div>
                                       ) : (
                                         <button 
                                           onClick={() => { setActiveDay(day); setTimetableMode('DAILY'); setIsAddingSlot(true); }}
                                           className="w-full h-20 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 group-hover:border-[#3d0413]/30 group-hover:text-[#3d0413]/30 transition-all"
                                         >
                                            <Plus size={20}/>
                                         </button>
                                       )}
                                    </td>
                                  ))}
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-in slide-in-from-right-4 duration-500">
                     <aside className="lg:col-span-1 space-y-3">
                        {Object.keys(timetableData).map(day => (
                          <button 
                            key={day}
                            onClick={() => setActiveDay(day)}
                            className={`w-full text-left px-8 py-5 rounded-[2rem] border transition-all flex items-center justify-between group ${activeDay === day ? 'bg-[#3d0413] text-white shadow-2xl border-transparent scale-105 z-10' : 'bg-white text-slate-400 border-slate-100 hover:border-rose-900/20'}`}
                          >
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">{day}</span>
                             <ChevronRight size={16} className={activeDay === day ? 'text-rose-400' : 'text-slate-200'} />
                          </button>
                        ))}
                     </aside>

                     <div className="lg:col-span-3 space-y-8">
                        <header className="flex justify-between items-center bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">
                                {timetableData[activeDay]?.date || getDayDate(activeDay)}
                              </p>
                              <h4 className="text-3xl font-black text-[#1a202c] uppercase tracking-tighter">
                                {daysOfWeek[currentTime.getDay()] === activeDay ? 'Today' : `${activeDay} PORTAL`}
                              </h4>
                           </div>
                           <button 
                             onClick={() => setIsAddingSlot(!isAddingSlot)}
                             className={`px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${isAddingSlot ? 'bg-rose-900 text-white shadow-xl' : 'bg-[#3d0413] text-white shadow-[0_20px_40px_-10px_rgba(61,4,19,0.3)] hover:bg-black active:scale-95'}`}
                           >
                              {isAddingSlot ? <X size={16}/> : <PlusCircle size={18}/>}
                              {isAddingSlot ? 'CANCEL ENTRY' : `ADD ${activeDay} SLOT`}
                           </button>
                        </header>

                        {isAddingSlot && (
                          <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-500">
                             <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                <Plus size={16}/> Initialize Node Entry
                             </h5>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Node Time Selection</label>
                                   <div className="flex gap-2 p-2 bg-black/40 border border-white/10 rounded-2xl">
                                      <select 
                                        value={selectedHour}
                                        onChange={(e) => setSelectedHour(e.target.value)}
                                        className="flex-1 bg-transparent text-white font-black text-xl outline-none text-center cursor-pointer hover:bg-white/5 rounded-xl transition-colors py-2 appearance-none"
                                      >
                                        {hours.map(h => <option key={h} value={h} className="bg-slate-900">{h}</option>)}
                                      </select>
                                      <div className="flex items-center text-rose-400 font-black text-xl">:</div>
                                      <select 
                                        value={selectedMinute}
                                        onChange={(e) => setSelectedMinute(e.target.value)}
                                        className="flex-1 bg-transparent text-white font-black text-xl outline-none text-center cursor-pointer hover:bg-white/5 rounded-xl transition-colors py-2 appearance-none"
                                      >
                                        {minutes.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                                      </select>
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Unit Module</label>
                                   <input 
                                     type="text" 
                                     placeholder="Unit Title"
                                     value={newSlotData.className}
                                     onChange={e => setNewSlotData({...newSlotData, className: e.target.value})}
                                     className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-lg outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-white/10"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Facility Room</label>
                                   <input 
                                     type="text" 
                                     placeholder="Room No"
                                     value={newSlotData.room}
                                     onChange={e => setNewSlotData({...newSlotData, room: e.target.value})}
                                     className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-lg outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-white/10"
                                   />
                                </div>
                                <div className="md:col-span-3 pt-4">
                                   <button 
                                     onClick={() => handleAddSlot(activeDay)}
                                     className="w-full bg-white text-[#3d0413] py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] shadow-xl hover:bg-rose-50 transition-all active:scale-[0.98]"
                                   >COMMIT SLOT TO {activeDay}</button>
                                </div>
                             </div>
                          </div>
                        )}

                        <div className="space-y-4">
                           {timetableData[activeDay]?.slots.length === 0 ? (
                             <div className="bg-white rounded-[3rem] p-20 border border-slate-100 text-center shadow-inner">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                                   <CalendarIcon size={32}/>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">No Registry Entries for {activeDay}</p>
                             </div>
                           ) : (
                             timetableData[activeDay]?.slots.map(slot => (
                               <div key={slot.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col md:flex-row justify-between items-center group hover:shadow-2xl hover:border-rose-900/10 transition-all">
                                  <div className="flex items-center gap-10">
                                     <div className="w-24 h-24 bg-[#3d0413] rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                                        <p className="text-2xl font-black">{slot.time}</p>
                                     </div>
                                     <div>
                                        <h5 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">{slot.className}</h5>
                                        <div className="flex items-center gap-4">
                                           <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                              <MapPin size={12}/> {slot.room}
                                           </span>
                                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified Hub</span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex gap-3 mt-6 md:mt-0 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                     <button 
                                       onClick={() => {
                                         setEditingSlot({ day: activeDay, slot });
                                       }}
                                       className="w-14 h-14 bg-slate-50 text-slate-400 hover:bg-[#3d0413] hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm"
                                     >
                                        <Edit3 size={20}/>
                                     </button>
                                     <button 
                                       onClick={() => handleDeleteSlot(activeDay, slot.id)}
                                       className="w-14 h-14 bg-rose-50 text-rose-900 hover:bg-rose-900 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm"
                                     >
                                        <Trash size={20}/>
                                     </button>
                                  </div>
                               </div>
                             ))
                           )}
                        </div>
                     </div>
                  </div>
                )}
             </div>
           )}

           {subPortal === 'ATTENDANCE' && (
             <div className="space-y-12 animate-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center">
                   <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Attendance Protocol</h3>
                   <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => hasClassesToday && setIsAddingStudent(!isAddingStudent)} 
                        disabled={!hasClassesToday}
                        className={`px-8 py-4 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 ${!hasClassesToday ? 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none' : isAddingStudent ? 'bg-rose-900 hover:bg-rose-950' : 'bg-[#3d0413] hover:bg-black'}`}
                      >
                         {isAddingStudent ? <X size={16}/> : <Plus size={16}/>}
                         {isAddingStudent ? 'CANCEL MANUAL INPUT' : 'MANUAL INPUT'}
                      </button>
                      <button disabled={!hasClassesToday} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest border-l border-slate-100 transition-colors ${!hasClassesToday ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-[#3d0413]'}`}>SYNC BIOMETRICS</button>
                   </div>
                </div>

                {!hasClassesToday ? (
                  <div className="bg-white rounded-[3.5rem] border-2 border-dashed border-rose-900/20 p-20 flex flex-col items-center text-center shadow-inner">
                     <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-900/30 mb-8 animate-pulse">
                        <CalendarSearch size={48} />
                     </div>
                     <h4 className="text-3xl font-black text-[#3d0413] uppercase tracking-tighter mb-4">NO CLASSES IN YOUR TIME TABLE TODAY</h4>
                     <p className="text-sm font-bold text-slate-400 max-w-md leading-relaxed uppercase tracking-widest mb-10">
                        PLEASE ADD A CLASS IN THE TIME TABLE FIRST THEN MARK ATTENDANCE.
                     </p>
                     <button 
                       onClick={() => setSubPortal('TIMETABLE')}
                       className="px-12 py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-black active:scale-95 transition-all"
                     >
                       CLICK TO ADD CLASS
                     </button>
                  </div>
                ) : (
                  <>
                    {isAddingStudent && StudentAddForm}

                    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden relative">
                       {saveStatus === 'success' && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
                             <div className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl">
                                <CheckCircle2 size={16}/> REGISTRY SYNCHRONIZED SUCCESSFULLY
                             </div>
                          </div>
                       )}

                       <div className="p-12 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                          <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center"><CalendarIcon size={32} className="text-[#3d0413]"/></div>
                             <div>
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">TODAYS REGISTER: {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Status: Session Window Open</p>
                             </div>
                          </div>
                          <div className="flex gap-3">
                             <button onClick={markAllPresent} className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-colors">MARK ALL PRESENT</button>
                          </div>
                       </div>

                       <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-100">
                                  <th className="px-8 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">[STUDENT NODE]</th>
                                  <th className="px-4 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">[ID NODE]</th>
                                  <th className="px-4 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">[PHONE]</th>
                                  <th className="px-4 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-center">[COMPLIANCE]</th>
                                  <th className="px-4 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-center">[REGISTRY]</th>
                                  <th className="px-4 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-center">[TOGGLE]</th>
                                  <th className="px-8 py-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-right">[HISTORY]</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {students.map(std => (
                                <tr key={std.id} className="hover:bg-slate-50/80 transition-all duration-300 group">
                                    <td className="px-8 py-8">
                                      <div className="flex items-center gap-5">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm transition-all ${attendanceState[std.id] === 'present' ? 'bg-emerald-500 text-white' : attendanceState[std.id] === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-[#3d0413] group-hover:bg-white'}`}>
                                            {std.name.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{std.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Active</p>
                                          </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-8 text-[11px] font-black text-slate-500 tracking-widest uppercase">{std.admNo}</td>
                                    <td className="px-4 py-8 text-[11px] font-black text-slate-500 uppercase">{std.phone}</td>
                                    <td className="px-4 py-8">
                                      <div className="flex items-center justify-center gap-4">
                                          <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${parseInt(std.history) > 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: std.history.includes('%') ? std.history : '100%' }}></div>
                                          </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-8 text-center">
                                       <span className="px-3 py-1 bg-slate-100 text-[9px] font-black uppercase rounded-lg text-slate-400 border border-slate-200">VERIFIED</span>
                                    </td>
                                    <td className="px-4 py-8">
                                      <div className="flex items-center justify-center gap-3">
                                          <button 
                                            onClick={() => markAttendance(std.id, 'present')}
                                            disabled={!!attendanceState[std.id] || isSavingAttendance}
                                            className={`w-10 h-10 rounded-xl transition-all shadow-sm flex items-center justify-center active:scale-90 ${
                                              attendanceState[std.id] === 'present' 
                                                ? 'bg-emerald-500 text-white cursor-default scale-110' 
                                                : attendanceState[std.id] === 'absent'
                                                  ? 'bg-slate-50 text-slate-200 cursor-not-allowed opacity-50'
                                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                                            }`}
                                          >
                                            <CheckCircle2 size={18}/>
                                          </button>
                                          <button 
                                            onClick={() => markAttendance(std.id, 'absent')}
                                            disabled={!!attendanceState[std.id] || isSavingAttendance}
                                            className={`w-10 h-10 rounded-xl transition-all shadow-sm flex items-center justify-center active:scale-90 ${
                                              attendanceState[std.id] === 'absent' 
                                                ? 'bg-rose-500 text-white cursor-default scale-110' 
                                                : attendanceState[std.id] === 'present'
                                                  ? 'bg-slate-50 text-slate-200 cursor-not-allowed opacity-50'
                                                  : 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'
                                            }`}
                                          >
                                            <XCircle size={18}/>
                                          </button>
                                      </div>
                                    </td>
                                    <td className="px-8 py-8 text-right">
                                       <span className={`text-[11px] font-black ${parseInt(std.history) > 85 ? 'text-emerald-500' : 'text-slate-900'}`}>{std.history}</span>
                                    </td>
                                </tr>
                              ))}
                            </tbody>
                        </table>
                       </div>
                       <div className="p-12 bg-slate-50 border-t border-slate-100 flex justify-center">
                          <button 
                            onClick={handleSaveAttendance}
                            disabled={isSavingAttendance || Object.keys(attendanceState).length === 0}
                            className={`px-16 py-6 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center gap-4 ${
                              isSavingAttendance || Object.keys(attendanceState).length === 0 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-[#3d0413] text-white hover:bg-black'
                            }`}
                          >
                             {isSavingAttendance ? <Loader2 size={24} className="animate-spin" /> : <Save size={24}/>}
                             {isSavingAttendance ? 'SYNCHRONIZING...' : 'SAVE'}
                          </button>
                       </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {(subPortal === 'STUDENTS' || subPortal === 'RESOURCES' || subPortal === 'ASSESSMENT') && (
             <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-40 h-40 bg-white rounded-[4rem] border border-slate-200 shadow-2xl flex items-center justify-center text-[#3d0413] mb-12 animate-bounce"><RefreshCw size={64} className="animate-spin duration-[4000ms]" /></div>
                <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{subPortal} NODE OFFLINE</h4>
                <p className="text-xs font-black text-slate-400 max-w-lg mt-6 leading-relaxed uppercase tracking-widest">This institutional module is currently undergoing core synchronization.</p>
                <button onClick={() => setSubPortal('COMMAND')} className="mt-12 px-12 py-5 bg-white border border-slate-200 text-[#3d0413] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Return to Command Center</button>
             </div>
           )}

           {editingSlot && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditingSlot(null)}></div>
                <div className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl p-12 overflow-hidden animate-in zoom-in duration-300">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
                   <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Edit {editingSlot.day} Time</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 border-b border-slate-50 pb-6">{timetableData[editingSlot.day]?.date || getDayDate(editingSlot.day)}</p>
                   
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Irregular Node Time Selection</label>
                         <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-[2rem]">
                            <div className="flex-1 flex flex-col items-center">
                               <button 
                                 onClick={() => {
                                   const [h, m] = editingSlot.slot.time.split(':');
                                   const nextH = ((parseInt(h) + 1) % 24).toString().padStart(2, '0');
                                   setEditingSlot({...editingSlot, slot: {...editingSlot.slot, time: `${nextH}:${m}`}});
                                 }}
                                 className="p-2 text-slate-300 hover:text-[#3d0413]"
                               ><ChevronUp/></button>
                               <span className="text-4xl font-black text-slate-900 leading-none">{editingSlot.slot.time.split(':')[0]}</span>
                               <button 
                                 onClick={() => {
                                   const [h, m] = editingSlot.slot.time.split(':');
                                   const prevH = ((parseInt(h) + 23) % 24).toString().padStart(2, '0');
                                   setEditingSlot({...editingSlot, slot: {...editingSlot.slot, time: `${prevH}:${m}`}});
                                 }}
                                 className="p-2 text-slate-300 hover:text-[#3d0413]"
                               ><ChevronDown/></button>
                            </div>
                            <div className="flex items-center text-[#3d0413] text-4xl font-black">:</div>
                            <div className="flex-1 flex flex-col items-center">
                               <button 
                                 onClick={() => {
                                   const [h, m] = editingSlot.slot.time.split(':');
                                   const nextM = ((parseInt(m) + 1) % 60).toString().padStart(2, '0');
                                   setEditingSlot({...editingSlot, slot: {...editingSlot.slot, time: `${h}:${nextM}`}});
                                 }}
                                 className="p-2 text-slate-300 hover:text-[#3d0413]"
                               ><ChevronUp/></button>
                               <span className="text-4xl font-black text-slate-900 leading-none">{editingSlot.slot.time.split(':')[1]}</span>
                               <button 
                                 onClick={() => {
                                   const [h, m] = editingSlot.slot.time.split(':');
                                   const prevM = ((parseInt(m) + 59) % 60).toString().padStart(2, '0');
                                   setEditingSlot({...editingSlot, slot: {...editingSlot.slot, time: `${h}:${prevM}`}});
                                 }}
                                 className="p-2 text-slate-300 hover:text-[#3d0413]"
                               ><ChevronDown/></button>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Module Name</label>
                         <input 
                           type="text" 
                           value={editingSlot.slot.className}
                           onChange={e => setEditingSlot({...editingSlot, slot: {...editingSlot.slot, className: e.target.value}})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Registry Room</label>
                         <input 
                           type="text" 
                           value={editingSlot.slot.room}
                           onChange={e => setEditingSlot({...editingSlot, slot: {...editingSlot.slot, room: e.target.value}})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all"
                         />
                      </div>
                      
                      <div className="pt-6 grid grid-cols-2 gap-4">
                         <button 
                           onClick={() => setEditingSlot(null)}
                           className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-200 transition-all"
                         >CANCEL</button>
                         <button 
                           onClick={() => handleUpdateSlot(editingSlot.day)}
                           className="w-full py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-black transition-all"
                         >APPLY TO {editingSlot.day}</button>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 w-full overflow-x-hidden selection:bg-rose-950 selection:text-white">
      {currentView === 'HOME' && HomeView}
      {currentView === 'PHYSICAL_CLASSES_OVERVIEW' && PhysicalClassesOverview}
      {currentView === 'PHYSICAL_CLASS_DETAIL' && PhysicalClassDashboardDetail}
      
      {currentView === 'ONLINE_CLASSES' && (
         <div className="max-w-6xl mx-auto space-y-10 py-10 px-6 animate-in fade-in duration-500">
           <div className="flex items-center gap-6">
             <button onClick={() => setCurrentView('HOME')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95"><ArrowLeft size={24} /></button>
             <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Virtual Hubs</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[{ id: 'oc1', code: 'ICT 101', title: 'PROGRAMMING BASICS', platform: 'Virtual Lab' }].map(cls => (
               <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all">
                 <div className="flex justify-between items-start mb-6">
                   <span className="px-3 py-1 bg-slate-100 text-[9px] font-black uppercase rounded-lg text-slate-500">{cls.code}</span>
                   <span className="px-3 py-1 bg-emerald-50 text-[9px] font-black uppercase rounded-lg text-emerald-600">Active</span>
                 </div>
                 <h3 className="text-xl font-black text-slate-900 mb-6 uppercase leading-tight">{cls.title}</h3>
                 <div className="space-y-3 mb-10">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Globe size={14} /> {cls.platform}</div>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users size={14} /> 42 Nodes Connected</div>
                 </div>
                 <button onClick={() => { setSelectedOnlineClass(cls); setCurrentView('ONLINE_CLASS_DETAIL'); }} className="w-full py-4 bg-[#3d0413] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Connect Hub</button>
               </div>
             ))}
           </div>
         </div>
      )}

      {currentView === 'ONLINE_CLASS_DETAIL' && (
        <div className="max-w-7xl mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-500">
           <header className="flex items-center gap-6">
             <button onClick={() => setCurrentView('ONLINE_CLASSES')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm"><ArrowLeft size={24} /></button>
             <div>
               <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedOnlineClass?.code} Portal</h2>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedOnlineClass?.title}</p>
             </div>
           </header>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-6">
               <div className="aspect-video bg-slate-950 rounded-[3rem] overflow-hidden relative shadow-2xl border-4 border-white/5 group">
                  {isCameraActive ? (
                     <video ref={videoRefCallback} className="w-full h-full object-cover" autoPlay playsInline muted />
                  ) : (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                        <MonitorPlay size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Transmission Offline</p>
                     </div>
                  )}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={toggleCamera} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isCameraActive ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}><VideoIcon size={20}/></button>
                     <button className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all"><Mic size={20}/></button>
                     <div className="w-px h-8 bg-white/10 mx-2"></div>
                     <button className="px-6 py-3 bg-white text-[#3d0413] rounded-2xl font-black text-[9px] uppercase tracking-widest">Broadcast Screen</button>
                  </div>
               </div>
             </div>
             <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl flex flex-col h-[600px] overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hub Transmission Chat</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                   <p className="text-center text-[10px] font-black text-slate-200 uppercase tracking-widest mt-20">Awaiting Interaction...</p>
                </div>
                <form className="p-6 bg-slate-50 border-t border-slate-100">
                   <div className="relative">
                      <input type="text" placeholder="Communicate with node..." className="w-full pl-6 pr-14 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold" />
                      <button className="absolute right-2 top-2 bottom-2 w-10 bg-[#3d0413] text-white rounded-xl flex items-center justify-center shadow-lg"><SendHorizonal size={16}/></button>
                   </div>
                </form>
             </div>
           </div>
        </div>
      )}

      {isAiPanelOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsAiPanelOpen(false)}></div>
           <div className="relative w-full max-w-2xl h-full bg-white shadow-[-50px_0_100px_-20px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-500 flex flex-col">
              <header className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-[#3d0413] rounded-2xl flex items-center justify-center"><Sparkles size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">AI Command Intelligence</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Grounding: Google Search Node Active</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAiPanelOpen(false)} className="p-3 text-slate-400 hover:text-rose-950 transition-colors"><X size={24}/></button>
              </header>
              <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
                 {!aiResponse && !isAiLoading && (
                   <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 border border-slate-100"><Search size={40} /></div>
                      <h4 className="text-lg font-black text-slate-900 uppercase mb-2">Academic Deep Search</h4>
                      <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed">I will verify with external grounding.</p>
                   </div>
                 )}
                 {isAiLoading && (
                   <div className="space-y-6 animate-pulse">
                      <div className="h-4 w-3/4 bg-slate-100 rounded-full"></div>
                      <div className="h-4 w-full bg-slate-100 rounded-full"></div>
                      <div className="h-40 w-full bg-slate-100 rounded-[2rem]"></div>
                   </div>
                 )}
                 {aiResponse && (
                   <div className="space-y-10 animate-in fade-in duration-700">
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-sm font-medium text-slate-700 shadow-inner">{aiResponse.text}</div>
                      {aiResponse.sources.length > 0 && (
                        <div>
                           <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Grounding Verification Nodes</h5>
                           <div className="grid grid-cols-1 gap-3">
                              {aiResponse.sources.map((chunk, idx) => (
                                <a key={idx} href={chunk.web?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-[#3d0413] transition-all group">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-[#3d0413]"><Globe size={18}/></div>
                                      <span className="text-xs font-black uppercase text-slate-900 group-hover:text-[#3d0413]">{chunk.web?.title || 'External Asset'}</span>
                                   </div>
                                   <ExternalLink size={14} className="text-slate-300" />
                                </a>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              <div className="p-10 bg-slate-50 border-t border-slate-100">
                 <form onSubmit={handleAiResearch} className="relative">
                    <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} placeholder="Input query..." className="w-full pl-10 pr-20 py-6 bg-white border border-slate-200 rounded-[2rem] outline-none font-bold text-sm shadow-xl" />
                    <button type="submit" className="absolute right-4 top-4 bottom-4 w-14 bg-[#3d0413] text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform">{isAiLoading ? <RefreshCw className="animate-spin" size={20}/> : <SendHorizonal size={20}/>}</button>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboardHome;