import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Resource, UserRole } from '../types';
import { 
  Plus, Search, GraduationCap, Clock, ArrowLeft, 
  ChevronRight, X, Database, ShieldCheck, Timer, Save, Mic, Video as VideoIcon,
  MessageCircle, SendHorizonal, MapPin, ClipboardCheck, Calendar as CalendarIcon, 
  CheckCircle2, XCircle, Users, Globe, MonitorPlay, Sparkles, ExternalLink, Volume2, 
  FileCheck, AlertCircle, Trash2, RefreshCw, LayoutDashboard, BarChart3, 
  Settings, Layers, Briefcase, Zap, ShieldAlert, Fingerprint, PlusCircle, UserPlus, History, UserCheck, User as UserIcon,
  Loader2, Edit3, Trash, ChevronUp, ChevronDown, CalendarSearch, School, CalendarDays, ChevronLeft, FileText, SearchCode,
  HardDrive, History as HistoryIcon, Download, Eye
} from 'lucide-react';
import { researchWithGrounding } from '../geminiService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DashboardProps {
  user: User;
  resources: Resource[];
}

type SystemView = 'HOME' | 'PHYSICAL_CLASSES_OVERVIEW' | 'PHYSICAL_CLASS_DETAIL' | 'ONLINE_CLASSES' | 'ONLINE_CLASS_DETAIL' | 'SCHOOL_CALENDAR' | 'GLOBAL_STUDENT_ROSTER' | 'STUDENT_HISTORY' | 'HISTORICAL_ATTENDANCE';
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
  classId?: string; // Track which physical class this belongs to
}

interface DaySchedule {
  date: string;
  slots: TimetableSlot[];
}

interface AcademicSchedule {
  openingDate: string;
  closingDate: string;
  term: '1' | '2' | '3' | null;
}

interface HistoricalRegisterSummary {
  id: string;
  date: Date;
  classTitle: string;
  classCode: string;
  room: string;
  present: number;
  total: number;
  syncStatus: 'SUCCESS' | 'PENDING';
}

const StaffDashboardHome: React.FC<DashboardProps> = ({ user, resources }) => {
  const [currentView, setCurrentView] = useState<SystemView>('HOME');
  const [subPortal, setSubPortal] = useState<SubPortalView>('COMMAND');
  const [selectedPhysicalClass, setSelectedPhysicalClass] = useState<PhysicalClass | null>(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<StudentNode | null>(null);
  const [selectedHistoricalDate, setSelectedHistoricalDate] = useState<Date | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<{text: string, sources: any[]} | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedOnlineClass, setSelectedOnlineClass] = useState<any | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [returnToModal, setReturnToModal] = useState(false);
  const [isFromStorage, setIsFromStorage] = useState(false);

  const historicalPortalRef = useRef<HTMLDivElement>(null);

  // Academic Schedule State
  const [academicSchedule, setAcademicSchedule] = useState<AcademicSchedule>({
    openingDate: '2024-05-06',
    closingDate: '2024-07-26',
    term: '2'
  });
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);

  // Physical Classes State
  const [myPhysicalClasses, setMyPhysicalClasses] = useState<PhysicalClass[]>([
    { id: 'pc1', code: 'EE-402', title: 'POWER SYSTEMS II', room: 'Power Lab 2', studentCount: 42, nextSession: 'Tomorrow, 08:00 AM' },
    { id: 'pc2', code: 'EE-305', title: 'CIRCUIT THEORY', room: 'Lecture Hall B', studentCount: 38, nextSession: 'Today, 02:00 PM' },
    { id: 'pc3', code: 'EE-201', title: 'DIGITAL ELECTRONICS', room: 'Micro Lab 4', studentCount: 45, nextSession: 'Fri, 10:00 AM' },
  ]);

  // Mock Historical Storage Data
  const [historicalStorage, setHistoricalStorage] = useState<HistoricalRegisterSummary[]>([
    { id: 'hist-1', date: new Date('2026-01-14'), classTitle: 'POWER SYSTEMS II', classCode: 'EE-402', room: 'Power Lab 2', present: 38, total: 42, syncStatus: 'SUCCESS' },
    { id: 'hist-2', date: new Date('2026-01-13'), classTitle: 'CIRCUIT THEORY', classCode: 'EE-305', room: 'Lecture Hall B', present: 36, total: 38, syncStatus: 'SUCCESS' },
    { id: 'hist-3', date: new Date('2026-01-12'), classTitle: 'POWER SYSTEMS II', classCode: 'EE-402', room: 'Power Lab 2', present: 40, total: 42, syncStatus: 'SUCCESS' },
    { id: 'hist-4', date: new Date('2026-01-11'), classTitle: 'DIGITAL ELECTRONICS', classCode: 'EE-201', room: 'Micro Lab 4', present: 44, total: 45, syncStatus: 'SUCCESS' },
    { id: 'hist-5', date: new Date('2026-01-10'), classTitle: 'CIRCUIT THEORY', classCode: 'EE-305', room: 'Lecture Hall B', present: 32, total: 38, syncStatus: 'SUCCESS' },
    { id: 'hist-6', date: new Date('2026-01-09'), classTitle: 'POWER SYSTEMS II', classCode: 'EE-402', room: 'Power Lab 2', present: 38, total: 42, syncStatus: 'SUCCESS' },
    { id: 'hist-7', date: new Date('2026-01-08'), classTitle: 'DIGITAL ELECTRONICS', classCode: 'EE-201', room: 'Micro Lab 4', present: 45, total: 45, syncStatus: 'SUCCESS' },
  ]);

  // Form state for new class
  const [newClass, setNewClass] = useState({
    title: '',
    code: '',
    room: '',
    nextSession: ''
  });

  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.title || !newClass.room) return;
    
    const classNode: PhysicalClass = {
      id: Math.random().toString(36).substr(2, 9),
      title: newClass.title.toUpperCase(),
      code: newClass.code.toUpperCase() || 'EE-XXX',
      room: newClass.room.toUpperCase(),
      studentCount: 0,
      nextSession: newClass.nextSession || 'TBA'
    };
    setMyPhysicalClasses([classNode, ...myPhysicalClasses]);
    setIsAddClassModalOpen(false);
    setNewClass({ title: '', code: '', room: '', nextSession: '' });
  };

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

  const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const [activeDay, setActiveDay] = useState<string>(daysOfWeek[new Date().getDay()]);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [newSlotData, setNewSlotData] = useState({ className: '', room: '' });

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [timetableData, setTimetableData] = useState<Record<string, DaySchedule>>({
    "SUNDAY": { date: getDayDate("SUNDAY"), slots: [] },
    "MONDAY": { date: getDayDate("MONDAY"), slots: [
      { id: '1', time: "10:31", className: "Power Systems II", room: "Power Lab 2", classId: 'pc1' },
      { id: '2', time: "11:15", className: "Science Lab", room: "Lab 3", classId: 'pc2' }
    ]},
    "TUESDAY": { date: getDayDate("TUESDAY"), slots: [
      { id: '4', time: "09:10", className: "Circuit Theory", room: "Lecture Hall B", classId: 'pc2' }
    ]},
    "WEDNESDAY": { date: getDayDate("WEDNESDAY"), slots: [
        { id: '5', time: "14:00", className: "Power Systems II", room: "Power Lab 2", classId: 'pc1' }
    ]},
    "THURSDAY": { date: getDayDate("THURSDAY"), slots: [
        { id: '6', time: "08:30", className: "Digital Electronics", room: "Micro Lab 4", classId: 'pc3' }
    ]},
    "FRIDAY": { date: getDayDate("FRIDAY"), slots: [
        { id: '7', time: "10:00", className: "Power Systems II", room: "Power Lab 2", classId: 'pc1' }
    ]},
    "SATURDAY": { date: getDayDate("SATURDAY"), slots: [] }
  });

  const [viewDate, setViewDate] = useState(new Date());

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotData.className || !newSlotData.room) return;
    
    const time = `${selectedHour}:${selectedMinute}`;
    const slot: TimetableSlot = {
      id: Math.random().toString(36).substr(2, 9),
      time,
      ...newSlotData,
      classId: selectedPhysicalClass?.id // Synchronize with current portal context
    };

    setTimetableData(prev => ({
      ...prev,
      [activeDay]: { 
        ...prev[activeDay], 
        slots: [...(prev[activeDay]?.slots || []), slot].sort((a, b) => a.time.localeCompare(b.time)) 
      }
    }));

    setNewSlotData({ className: '', room: '' });
    setIsAddingSlot(false);
  };

  const handleDeleteSlot = (day: string, slotId: string) => {
    setTimetableData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter(s => s.id !== slotId)
      }
    }));
  };

  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', admNo: '', phone: '' });
  const [focusedStudent, setFocusedStudent] = useState<StudentNode | null>(null);
  const [students, setStudents] = useState<StudentNode[]>([
    { id: '1', name: 'Kiprono Kemboi', admNo: '2024/EE/001', phone: '0712345678', history: '98% Att.' },
    { id: '2', name: 'Mary Wambui', admNo: '2024/EE/014', phone: '0722334455', history: '62% Att.' },
    { id: '3', name: 'Peter Otieno', admNo: '2024/EE/018', phone: '0733445566', history: '91% Att.' },
    { id: '4', name: 'Sarah Jepchirchir', admNo: '2024/EE/022', phone: '0744556677', history: '78% Att.' },
  ]);

  const handleDeleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  const markAttendance = (id: string, status: 'present' | 'absent') => {
    // Permanent highlight logic: If already marked present, do not allow changes.
    if (attendanceState[id] === 'present') return;
    
    setAttendanceState(prev => ({ ...prev, [id]: status }));
    setSaveStatus('idle');
  };

  const markAllPresent = () => {
    const newState = { ...attendanceState };
    students.forEach(s => newState[s.id] = 'present');
    setAttendanceState(newState);
  };

  const handleSaveAttendance = async () => {
    if (!selectedPhysicalClass) return;

    setIsSavingAttendance(true);
    // Institutional node simulation delay
    await new Promise(r => setTimeout(r, 1500));
    
    // CAPTURE CURRENT REGISTRY STATE
    const presentCount = Object.values(attendanceState).filter(s => s === 'present').length;
    const newArchiveEntry: HistoricalRegisterSummary = {
      id: `hist-${Date.now()}`,
      date: new Date(),
      classTitle: selectedPhysicalClass.title,
      classCode: selectedPhysicalClass.code,
      room: selectedPhysicalClass.room,
      present: presentCount,
      total: students.length,
      syncStatus: 'SUCCESS'
    };

    // ARCHIVE AUTOMATICALLY INTO STORAGE STATE
    setHistoricalStorage(prev => [newArchiveEntry, ...prev]);
    
    setIsSavingAttendance(false);
    setSaveStatus('success');
    
    // Cleanup feedback UI
    setTimeout(() => setSaveStatus('idle'), 3000);
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setIsCameraActive(true);
      } catch (err) { console.error(err); }
    }
  };

  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    if (node && isCameraActive && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(console.error);
    }
  }, [isCameraActive]);

  const handleAiResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await researchWithGrounding(aiQuery);
      setAiResponse(result);
    } catch (err) { console.error(err); }
    finally { setIsAiLoading(false); }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
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
      return [baseValue - 5, baseValue + 2, baseValue - 10, baseValue, baseValue + 3, baseValue - 2, baseValue];
    }
    return [65, 82, 45, 90, 78, 62, 85];
  };

  const handleExportPdf = async () => {
    if (!historicalPortalRef.current || isExportingPdf) return;
    
    setIsExportingPdf(true);
    try {
      const element = historicalPortalRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc' // Matches background
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TKNP_Attendance_Audit_${selectedHistoricalDate?.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const StudentAddForm = (
    <div className="w-full bg-white border-2 border-[#3d0413]/10 p-8 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-500 flex flex-col gap-6 relative overflow-hidden mb-12">
       <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-3xl -mr-12 -mt-12"></div>
       <div className="flex items-center justify-between relative z-10">
          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">INITIALIZE NEW STUDENT NODE</h4>
          <button onClick={() => setIsAddingStudent(false)} className="text-slate-300 hover:text-rose-950 transition-colors"><X size={24}/></button>
       </div>
       <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FULL NAME</label><input type="text" placeholder="E.G. JANE DOE" value={newStudent.name} required onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-black uppercase focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ADM NUMBER</label><input type="text" placeholder="2026/EE/0XXX" value={newStudent.admNo} required onChange={e => setNewStudent({...newStudent, admNo: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-black uppercase focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CONTACT NODE</label><input type="text" placeholder="07XX XXX XXX" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-black uppercase focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" /></div>
          <div className="md:col-span-3 pt-2"><button type="submit" className="w-full py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3"><CheckCircle2 size={18}/> REGISTER TO REGISTRY</button></div>
       </form>
    </div>
  );

  const HomeView = (
    <div className="max-w-7xl mx-auto space-y-12 py-12 px-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-[#3d0413] shadow-sm"><ShieldCheck size={28} /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">COMMAND TERMINAL / V5.0.2</p>
            <h1 className="text-5xl font-black text-[#1a202c] uppercase tracking-tight">INSTITUTIONAL PORTAL</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">WELCOME BACK, <span className="text-[#3d0413]">{user.name.toUpperCase()}</span> • {user.department || 'ELECTRICAL ENGINEERING'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/50 border border-slate-200 p-2 rounded-full shadow-sm pr-6">
            <div className="w-12 h-12 bg-[#3d0413] rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">{currentTime.getHours().toString().padStart(2, '0')}</div>
            <div className="text-slate-300 font-bold text-lg mx-1">:</div>
            <div className="w-12 h-12 bg-[#3d0413] rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">{currentTime.getMinutes().toString().padStart(2, '0')}</div>
          </div>
        </div>
      </header>
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 bg-[#3d0413] rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-16">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center"><Database size={28} className="text-rose-300" /></div>
                <div className="px-5 py-2 bg-rose-500/10 border border-rose-500/30 rounded-full"><span className="text-[9px] font-black tracking-[0.2em] uppercase text-rose-200">OFFICIAL ACADEMIC REGISTRY</span></div>
              </div>
              <button onClick={() => setIsAiPanelOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"><Sparkles size={16} /> AI Librarian</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group cursor-pointer hover:border-white transition-all hover:bg-white/5" onClick={() => setCurrentView('PHYSICAL_CLASSES_OVERVIEW')}>
                <div><h3 className="text-2xl font-black uppercase tracking-tight">MY PHYSICAL CLASSES</h3><p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-2">Enterprise Management System v5.0</p></div>
                <button className="w-full py-5 bg-white text-[#3d0413] rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl group-hover:bg-rose-50 transition-all flex items-center justify-between px-8 mt-10">MANAGE OVERVIEW <ChevronRight size={18} /></button>
              </div>
              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group cursor-pointer hover:border-white transition-colors" onClick={() => { setCurrentView('PHYSICAL_CLASSES_OVERVIEW'); setIsAddClassModalOpen(true); }}>
                <h3 className="text-2xl font-black uppercase tracking-tight">ADD PHYSICAL CLASS</h3>
                <button className="w-full py-5 bg-white text-[#3d0413] rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-rose-50 transition-all px-8 mt-10">INITIALIZE SESSION</button>
              </div>
              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group cursor-pointer hover:border-white transition-colors" onClick={() => setCurrentView('ONLINE_CLASSES')}>
                <h3 className="text-2xl font-black uppercase tracking-tight">MY ONLINE HUB</h3>
                <button className="w-full py-5 bg-transparent border-2 border-white/40 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-between px-8 mt-10 hover:bg-white/5">LAUNCH VIRTUAL LAB <MonitorPlay size={18} /></button>
              </div>
              <div className="border-2 border-white/40 p-8 rounded-[2rem] flex flex-col justify-between group hover:border-white transition-colors">
                <h3 className="text-2xl font-black uppercase tracking-tight">ADD ONLINE HUB</h3>
                <button className="w-full py-5 bg-transparent border-2 border-white/40 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-between px-8 mt-10 hover:bg-white/5">CONNECT EXTERNAL NODE</button>
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
               <div key={i} className={`p-4 rounded-2xl border transition-all ${slot.status === 'IN_PROGRESS' ? 'bg-rose-50 border-rose-200 shadow-md scale-[1.02]' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
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
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-500 pb-24">
       <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
             <button onClick={() => setCurrentView('HOME')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95"><ArrowLeft size={24} /></button>
             <div>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Physical Classes Overview</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Enterprise-grade lifecycle management</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIsOpeningModalOpen(true)} className="px-6 py-4 border-2 border-[#3d0413] text-[#3d0413] rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-[#3d0413] hover:text-white transition-all shadow-sm">School Opening</button>
             <button onClick={() => setIsClosingModalOpen(true)} className="px-6 py-4 border-2 border-[#3d0413] text-[#3d0413] rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-[#3d0413] hover:text-white transition-all shadow-sm">School Closing</button>
             <button onClick={() => setIsAddClassModalOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-[#3d0413] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all"><PlusCircle size={20}/> ADD CLASSES</button>
          </div>
       </header>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {myPhysicalClasses.map(cls => (
            <div key={cls.id} onClick={() => { setSelectedPhysicalClass(cls); setCurrentView('PHYSICAL_CLASS_DETAIL'); setSubPortal('COMMAND'); }} className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <span className="px-4 py-1.5 bg-rose-50 text-[#3d0413] text-[9px] font-black uppercase rounded-xl border border-rose-100">{cls.code}</span>
                  <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase tracking-widest"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Operational</div>
               </div>
               <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase leading-tight group-hover:text-[#3d0413] transition-colors">{cls.title}</h3>
               <div className="space-y-4 mb-6 border-y border-slate-50 py-6">
                  <div className="flex items-center justify-between text-[11px] font-bold"><span className="text-slate-400 uppercase tracking-widest">Facility</span><span className="text-slate-900 uppercase">{cls.room}</span></div>
                  <div className="flex items-center justify-between text-[11px] font-bold"><span className="text-slate-400 uppercase tracking-widest">Registry Nodes</span><span className="text-slate-900">{cls.studentCount} Students</span></div>
                  <div className="flex items-center justify-between text-[11px] font-bold"><span className="text-slate-400 uppercase tracking-widest">Next Window</span><span className="text-[#3d0413] uppercase">{cls.nextSession}</span></div>
               </div>
               <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPhysicalClass(cls); setCurrentView('PHYSICAL_CLASS_DETAIL'); setSubPortal('TIMETABLE'); }} className="px-4 py-2 border-2 border-[#3d0413]/30 hover:border-[#3d0413] text-[#3d0413] rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Time Table</button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPhysicalClass(cls); setCurrentView('PHYSICAL_CLASS_DETAIL'); setSubPortal('ATTENDANCE'); }} className="px-4 py-2 border-2 border-[#3d0413]/30 hover:border-[#3d0413] text-[#3d0413] rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Register</button>
                  </div>
                  <button className="w-full py-5 bg-slate-50 group-hover:bg-[#3d0413] group-hover:text-white text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3">ACCESS COMMAND CENTER <ChevronRight size={16}/></button>
               </div>
            </div>
          ))}
       </div>
       <div className="pt-12">
          <button onClick={() => setCurrentView('SCHOOL_CALENDAR')} className="w-full py-16 border-[4px] border-[#3d0413] rounded-[1rem] bg-white text-[#3d0413] hover:bg-[#3d0413] hover:text-white transition-all duration-500 shadow-sm flex items-center justify-center group"><h3 className="text-4xl font-black uppercase tracking-[0.2em] group-hover:scale-105 transition-transform">SCHOOL CALENDAR</h3></button>
       </div>
    </div>
  );

  const PhysicalClassDashboardDetail = (
    <div className="flex h-[calc(100vh-65px)] bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-slate-100">
           <button onClick={() => setCurrentView('PHYSICAL_CLASSES_OVERVIEW')} className="flex items-center gap-3 text-slate-400 hover:text-[#3d0413] transition-colors mb-8"><ArrowLeft size={18}/><span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Overview</span></button>
           <div className="mb-6"><span className="px-3 py-1 bg-rose-50 text-[#3d0413] rounded-lg text-[8px] font-black uppercase border border-rose-100">{selectedPhysicalClass?.code}</span><h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-3 leading-tight">{selectedPhysicalClass?.title}</h2></div>
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Institutional Node v5.0</p>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
           {[
             { id: 'COMMAND', label: 'Executive Center', icon: <LayoutDashboard size={18}/> },
             { id: 'ATTENDANCE', label: 'Attendance Lab', icon: <Fingerprint size={18}/> },
             { id: 'TIMETABLE', label: 'Timetable Matrix', icon: <Clock size={18}/> },
             { id: 'STUDENTS', label: 'Student Roster', icon: <Users size={18}/> },
             { id: 'RESOURCES', label: 'STORAGE', icon: <HardDrive size={18}/> },
             { id: 'ASSESSMENT', label: 'Academic Eval', icon: <FileCheck size={18}/> },
           ].map(item => (
             <button key={item.id} onClick={() => { setSubPortal(item.id as SubPortalView); setIsAddingStudent(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${subPortal === item.id ? 'bg-[#3d0413] text-white shadow-xl translate-x-2' : 'text-slate-500 hover:bg-slate-50 hover:text-[#3d0413]'}`}><span className={`${subPortal === item.id ? 'text-rose-400' : 'text-slate-300 group-hover:text-rose-950'}`}>{item.icon}</span><span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span></button>
           ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-12 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto space-y-12">
           {subPortal === 'COMMAND' && (
             <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                   <div>
                      h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">EXECUTIVE DASHBOARD</h3>
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
                        {focusedStudent && <button onClick={() => setFocusedStudent(null)} className="absolute top-8 right-8 p-3 bg-[#3d0413] text-white rounded-full hover:bg-black transition-all z-20 shadow-xl scale-110"><X size={18}/></button>}
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-10 transition-all duration-500 shadow-xl ${focusedStudent ? 'bg-[#3d0413] text-white rotate-12 scale-110' : 'bg-rose-50 text-[#3d0413]'}`}>{focusedStudent ? <UserCheck size={40}/> : <Users size={40}/>}</div>
                        <div className="animate-in fade-in duration-1000">
                          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.5em] mb-4">{focusedStudent ? 'NODE SYNC PERFORMANCE' : 'Attendance Rate'}</p>
                          <h4 className={`font-black text-[#1a202c] mb-4 transition-all duration-700 tracking-tighter ${focusedStudent ? 'text-6xl scale-105' : 'text-8xl'}`}>{focusedStudent ? focusedStudent.history.replace(' Att.', '') : '94.2%'}</h4>
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-3 px-6 py-2 rounded-full transition-all ${focusedStudent ? 'bg-rose-50 border border-rose-100' : ''}`}>
                               <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${focusedStudent ? 'bg-[#3d0413]' : 'bg-emerald-500'}`}></div> 
                               <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${focusedStudent ? 'text-[#3d0413]' : 'text-emerald-500'}`}>{focusedStudent ? focusedStudent.name : '+2.1% GROWTH'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                   </div>
                   <div className="lg:w-2/3 space-y-8">
                      <div className="flex justify-end items-center">
                         {isAddingStudent ? StudentAddForm : (
                            <button onClick={() => setIsAddingStudent(true)} className="px-12 py-5 bg-[#3d0413] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-[0_25px_50px_-12px_rgba(61,4,19,0.3)] hover:bg-black transition-all active:scale-95 flex items-center gap-4 group">
                               <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-all"><UserPlus size={18}/></div>
                               ADD STUDENT
                            </button>
                         )}
                      </div>
                      <div className="bg-white border-2 border-rose-900/10 rounded-[3rem] shadow-sm overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-rose-50/20 border-b border-rose-900/10">
                               <tr className="divide-x divide-rose-900/10">
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">STUDENT NODE</th>
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">ADM NO</th>
                                  <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">HISTORY</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-900/10">
                               {students.map(std => (
                                 <tr key={std.id} className={`transition-all duration-300 divide-x divide-rose-900/10 group cursor-pointer ${focusedStudent?.id === std.id ? 'bg-[#3d0413]/5' : 'hover:bg-rose-50/10'}`} onClick={() => setFocusedStudent(std)}>
                                    <td className="px-8 py-6"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${focusedStudent?.id === std.id ? 'bg-[#3d0413] text-white' : 'bg-slate-100 text-[#3d0413]'}`}>{std.name.charAt(0)}</div><span className="text-[12px] font-black uppercase">{std.name}</span></div></td>
                                    <td className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase">{std.admNo}</td>
                                    <td className="px-8 py-6"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase border border-emerald-100">{std.history}</span></td>
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
                         <span className="px-5 py-2 bg-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">{focusedStudent ? `${focusedStudent.name.toUpperCase()} REGISTRY` : 'WEEKLY SYNC'}</span>
                      </div>
                      <div className="h-64 flex items-end gap-5">
                         {getGraphData().map((h, i) => (
                           <div key={i} className="flex-1 bg-slate-50 rounded-2xl relative group cursor-help transition-all">
                              <div className={`absolute bottom-0 left-0 right-0 rounded-2xl transition-all duration-1000 ${focusedStudent ? 'bg-rose-900' : 'bg-[#3d0413]'} group-hover:bg-rose-600`} style={{ height: `${Math.max(10, h)}%` }}></div>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-[#3d0413] rounded-[3.5rem] p-12 text-white shadow-2xl flex flex-col justify-between group overflow-hidden relative">
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

           {subPortal === 'ATTENDANCE' && (
             <div className="space-y-12 animate-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Attendance Protocol</h3>
                      <p className="text-[10px] font-black text-rose-950 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></span>
                        Active Session: {selectedPhysicalClass?.title} • {selectedPhysicalClass?.room}
                      </p>
                   </div>
                   <div className="flex gap-4">
                     <button onClick={markAllPresent} className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-[#3d0413] hover:text-[#3d0413] transition-all flex items-center gap-3">
                        <UserCheck size={16}/> MARK ALL PRESENT
                     </button>
                     <button onClick={handleSaveAttendance} disabled={isSavingAttendance} className="px-8 py-4 bg-[#3d0413] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 hover:bg-black transition-all">
                        {isSavingAttendance ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} SAVE REGISTRY
                     </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PRESENT COUNT</p>
                      <h5 className="text-4xl font-black text-emerald-500">{Object.values(attendanceState).filter(s => s === 'present').length}</h5>
                   </div>
                   <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">ABSENT COUNT</p>
                      <h5 className="text-4xl font-black text-rose-500">{Object.values(attendanceState).filter(s => s === 'absent').length}</h5>
                   </div>
                   <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PENDING NODES</p>
                      <h5 className="text-4xl font-black text-slate-300">{students.length - Object.keys(attendanceState).length}</h5>
                   </div>
                </div>

                <div className="bg-white/50 backdrop-blur-xl rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden relative">
                   {saveStatus === 'success' && <div className="absolute inset-0 bg-emerald-500/90 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in"><div className="text-white text-center"><CheckCircle2 size={64} className="mx-auto mb-6"/><h4 className="text-3xl font-black uppercase tracking-tight">SYNC SUCCESSFUL</h4><p className="font-bold uppercase tracking-widest text-[10px] mt-4 opacity-80">Registry has been updated globally.</p></div></div>}
                   <table className="w-full text-left">
                      <thead className="bg-slate-100/50 border-b border-slate-200">
                        <tr className="divide-x divide-slate-200">
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">STUDENT NODE</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">ADM NO</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] text-center w-60">TOGGLE</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] text-center">HISTORY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                         {students.map(std => (
                           <tr key={std.id} className={`transition-all duration-300 divide-x divide-slate-50 ${attendanceState[std.id] === 'present' ? 'bg-emerald-50/30' : attendanceState[std.id] === 'absent' ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${attendanceState[std.id] === 'present' ? 'bg-emerald-500 text-white shadow-lg' : attendanceState[std.id] === 'absent' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-[#3d0413]'}`}>{std.name.charAt(0)}</div>
                                    <span className={`text-[13px] font-black uppercase tracking-tight transition-colors ${attendanceState[std.id] ? 'text-slate-900' : 'text-slate-700'}`}>{std.name}</span>
                                 </div>
                              </td>
                              <td className="px-10 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">{std.admNo}</td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center justify-center gap-5">
                                    <button 
                                      onClick={() => markAttendance(std.id, 'present')} 
                                      disabled={attendanceState[std.id] === 'present'}
                                      className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center border-2 ${attendanceState[std.id] === 'present' ? 'bg-emerald-500 text-white border-emerald-500 shadow-xl scale-110' : 'bg-white text-slate-300 border-slate-100 hover:border-emerald-200 hover:text-emerald-500'}`}
                                      title="Mark Present"
                                    >
                                      <CheckCircle2 size={22}/>
                                    </button>
                                    <button 
                                      onClick={() => markAttendance(std.id, 'absent')} 
                                      disabled={attendanceState[std.id] === 'present'}
                                      className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center border-2 ${
                                        attendanceState[std.id] === 'absent' 
                                          ? 'bg-rose-500 text-white border-rose-500 shadow-xl scale-110' 
                                          : attendanceState[std.id] === 'present'
                                            ? 'bg-slate-50 text-slate-100 border-slate-50 opacity-20 cursor-not-allowed'
                                            : 'bg-white text-slate-300 border-slate-100 hover:border-rose-200 hover:text-rose-500'
                                      }`}
                                      title={attendanceState[std.id] === 'present' ? "Locked" : "Mark Absent"}
                                    >
                                      <XCircle size={22}/>
                                    </button>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center justify-center">
                                    <button 
                                      onClick={() => { setSelectedStudentForHistory(std); setCurrentView('STUDENT_HISTORY'); }}
                                      className="p-3 bg-rose-50 text-[#3d0413] rounded-xl hover:bg-[#3d0413] hover:text-white transition-all shadow-sm group/hist"
                                      title="View Attendance Calendar"
                                    >
                                      <CalendarSearch size={20} className="group-hover/hist:scale-110 transition-transform" />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}
           {subPortal === 'TIMETABLE' && (
             <div className="space-y-12 animate-in fade-in duration-500">
                <header className="flex justify-between items-center bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-6">
                      {returnToModal && (
                        <button 
                          onClick={() => {
                            setCurrentView('PHYSICAL_CLASSES_OVERVIEW');
                            setIsAddClassModalOpen(true);
                            setReturnToModal(false);
                          }}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-[#3d0413] transition-all active:scale-95 shadow-sm"
                        >
                          <ArrowLeft size={24} />
                        </button>
                      )}
                      <div>
                        <h4 className="text-3xl font-black text-[#1a202c] uppercase tracking-tighter">CLASS SCHEDULE MATRIX</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Multi-node scheduling interface</p>
                      </div>
                   </div>
                   <button onClick={() => setIsAddingSlot(true)} className="px-10 py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 hover:bg-black transition-all"><PlusCircle size={18}/> ADD SESSION SLOT</button>
                </header>
                <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden">
                   <div className="grid grid-cols-7 divide-x divide-slate-100">
                      {daysOfWeek.map(day => (
                        <div key={day} className={`p-8 min-h-[400px] transition-all ${day === activeDay ? 'bg-[#3d0413]/5' : ''}`}>
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 border-b border-slate-100 pb-4">{day.slice(0, 3)}</h5>
                           <div className="space-y-4">
                              {timetableData[day]?.slots
                                .filter(s => s.classId === selectedPhysicalClass?.id) // Only show sessions for THIS class
                                .map(s => (
                                <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-[10px] font-black uppercase tracking-tight relative group">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteSlot(day, s.id); }}
                                     className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                   >
                                     <Trash2 size={12} />
                                   </button>
                                   <div className="text-rose-900 mb-1">{s.time}</div>
                                   <div className="text-slate-900 leading-tight font-black">{s.className}</div>
                                   <div className="text-slate-400 mt-2 font-bold opacity-60">{s.room}</div>
                                </div>
                              ))}
                              <button onClick={() => { setActiveDay(day); setIsAddingSlot(true); }} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 hover:border-[#3d0413]/20 hover:text-[#3d0413]/20 transition-all"><Plus size={16}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {subPortal === 'RESOURCES' && (
             <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Institutional STORAGE</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">HISTORICAL REGISTRY ARCHIVE • ALL SAVED DATA</p>
                   </div>
                   <div className="flex gap-4">
                      <button className="px-8 py-4 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all flex items-center gap-3">
                         <HistoryIcon size={18}/> SYSTEM AUDIT
                      </button>
                      <button className="px-8 py-4 bg-white border-2 border-slate-100 text-[#3d0413] rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-[#3d0413] transition-all flex items-center gap-3">
                         <Download size={18}/> DOWNLOAD ALL
                      </button>
                   </div>
                </header>

                {/* PROMINENT CLASS NAME HEADER AS REQUESTED */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-rose-50 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-rose-100 transition-colors duration-700"></div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-[#3d0413] text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                       <GraduationCap size={32} />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{selectedPhysicalClass?.title}</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        ACTIVE REGISTRY STORAGE NODE • {selectedPhysicalClass?.code}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden relative">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="divide-x divide-slate-100">
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">REGISTRY DATE</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">CLASS NODE</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">FACILITY</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] text-center">ATTENDANCE</th>
                          <th className="px-10 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] text-center">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {historicalStorage
                           .filter(item => !selectedPhysicalClass || item.classCode === selectedPhysicalClass.code)
                           .map(item => (
                           <tr key={item.id} className="transition-all duration-300 divide-x divide-slate-50 hover:bg-slate-50/50 group">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#3d0413]/5 text-[#3d0413] flex items-center justify-center">
                                       <CalendarIcon size={20}/>
                                    </div>
                                    <span className="text-[14px] font-black uppercase text-slate-900 tracking-tight">
                                       {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <p className="text-[12px] font-black text-slate-900 uppercase leading-none">{item.classTitle}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.classCode}</p>
                              </td>
                              <td className="px-10 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">
                                 {item.room}
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex flex-col items-center">
                                    <span className="text-sm font-black text-slate-900">{item.present}/{item.total}</span>
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                       <div 
                                         className="h-full bg-emerald-500" 
                                         style={{ width: `${(item.present / item.total) * 100}%` }}
                                       ></div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex justify-center">
                                    <button 
                                      onClick={() => {
                                         const classMatch = myPhysicalClasses.find(c => c.code === item.classCode);
                                         if (classMatch) setSelectedPhysicalClass(classMatch);
                                         setSelectedHistoricalDate(item.date);
                                         setIsFromStorage(true); // Track origin
                                         setCurrentView('HISTORICAL_ATTENDANCE');
                                      }}
                                      className="px-6 py-3 bg-[#3d0413] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2"
                                    >
                                       <Eye size={14}/> VIEW REGISTER
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                   {historicalStorage.filter(item => !selectedPhysicalClass || item.classCode === selectedPhysicalClass.code).length === 0 && (
                     <div className="p-20 text-center text-slate-400">
                        <HistoryIcon size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">No matching history found for this node.</p>
                     </div>
                   )}
                </div>
                <div className="bg-[#3d0413]/5 border-2 border-dashed border-[#3d0413]/10 p-12 rounded-[3.5rem] text-center">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#3d0413] mx-auto mb-6 shadow-sm"><ShieldCheck size={32}/></div>
                   <h4 className="text-xl font-black text-slate-900 uppercase">CORE INTEGRITY VERIFIED</h4>
                   <p className="text-sm font-medium text-slate-500 max-w-md mx-auto mt-4 leading-relaxed uppercase tracking-widest">All registry entries are cryptographically signed and archived for institutional compliance.</p>
                </div>
             </div>
           )}

           {(subPortal === 'STUDENTS' || subPortal === 'ASSESSMENT') && (
             <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-40 h-40 bg-white rounded-[4rem] border border-slate-200 shadow-2xl flex items-center justify-center text-[#3d0413] mb-12 animate-bounce"><RefreshCw size={64} className="animate-spin duration-[4000ms]" /></div>
                <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{subPortal} NODE OFFLINE</h4>
                <p className="text-xs font-black text-slate-400 max-w-lg mt-6 leading-relaxed uppercase tracking-widest">This institutional module is currently undergoing core synchronization.</p>
                <button onClick={() => setSubPortal('COMMAND')} className="mt-12 px-12 py-5 bg-white border border-slate-200 text-[#3d0413] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Return to Command Center</button>
             </div>
           )}
        </div>
      </main>
    </div>
  );

  /**
   * Institutional General Calendar View
   * Clickable days synchronize navigation to specific Class Schedule Matrix nodes.
   */
  const SchoolCalendarView = (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-500 pb-20">
       <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6"><button onClick={() => setCurrentView('PHYSICAL_CLASSES_OVERVIEW')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95"><ArrowLeft size={24} /></button><div><h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Academic Master</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Institution registry chronology</p></div></div>
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100"><button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-3 text-slate-400 hover:text-[#3d0413] transition-colors"><ChevronLeft size={20}/></button><div className="px-6 py-3 text-sm font-black text-[#3d0413] uppercase tracking-widest min-w-[180px] text-center">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div><button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-3 text-slate-400 hover:text-[#3d0413] transition-colors"><ChevronRight size={20}/></button></div>
       </header>
       <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{d}</div>)}</div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-50">
             {(() => {
                const year = viewDate.getFullYear(); const month = viewDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate();
                const cells = [];
                for(let i = 0; i < firstDay; i++) cells.push(<div key={`p-${i}`} className="h-32 p-4 bg-slate-50/20 text-slate-200 font-black text-xs"></div>);
                for(let d = 1; d <= lastDate; d++) {
                  const dateObj = new Date(year, month, d);
                  const dayName = daysOfWeek[dateObj.getDay()];
                  const daySlots = timetableData[dayName]?.slots || [];
                  
                  // Helper to jump to a class portal from the calendar
                  const navigateToTimetable = () => {
                    if (daySlots.length > 0) {
                      const firstSlot = daySlots[0];
                      const targetClass = myPhysicalClasses.find(c => c.id === firstSlot.classId) || myPhysicalClasses[0];
                      setSelectedPhysicalClass(targetClass);
                      setSubPortal('TIMETABLE');
                      setCurrentView('PHYSICAL_CLASS_DETAIL');
                    } else if (myPhysicalClasses.length > 0) {
                      // If no sessions, go to first class timetable anyway to add one
                      setSelectedPhysicalClass(myPhysicalClasses[0]);
                      setSubPortal('TIMETABLE');
                      setCurrentView('PHYSICAL_CLASS_DETAIL');
                    }
                  };

                  cells.push(
                    <div key={d} onClick={navigateToTimetable} className="h-32 p-6 transition-all hover:bg-slate-50/50 cursor-pointer overflow-hidden group">
                       <div className="flex justify-between items-start mb-2">
                          <span className="text-lg font-black leading-none text-slate-900">{d}</span>
                          {daySlots.length > 0 && <span className="text-[7px] font-black bg-rose-50 text-[#3d0413] px-1.5 py-0.5 rounded-md border border-rose-100">{daySlots.length} SESSION{daySlots.length > 1 ? 'S' : ''}</span>}
                       </div>
                       <div className="space-y-1">
                          {daySlots.slice(0, 2).map(s => (
                            <div key={s.id} className="text-[8px] font-black uppercase text-slate-400 truncate bg-slate-50 p-1 rounded-md border border-slate-100 group-hover:border-[#3d0413]/20 group-hover:bg-white transition-all">
                               {s.time} • {s.className}
                            </div>
                          ))}
                          {daySlots.length > 2 && <div className="text-[7px] font-black text-[#3d0413] pl-1">+{daySlots.length - 2} more...</div>}
                       </div>
                    </div>
                  );
                }
                return cells;
             })()}
          </div>
       </div>
    </div>
  );

  /**
   * Student Attendance History View (Calendar Page)
   * SYNCED WITH CLASS SCHEDULE MATRIX & ATTENDANCE LAB
   */
  const StudentHistoryView = (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-500 pb-20">
       <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
             <button onClick={() => { setCurrentView('PHYSICAL_CLASS_DETAIL'); setSubPortal('ATTENDANCE'); }} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95"><ArrowLeft size={24} /></button>
             <div>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Attendance Node Registry</h2>
                <div className="flex items-center gap-3 mt-2">
                   <div className="w-10 h-10 bg-[#3d0413] text-white rounded-xl flex items-center justify-center font-black">{selectedStudentForHistory?.name.charAt(0)}</div>
                   <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{selectedStudentForHistory?.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">UNIT: {selectedPhysicalClass?.code} • {selectedPhysicalClass?.title}</p>
                   </div>
                </div>
             </div>
          </div>
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
             <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-3 text-slate-400 hover:text-[#3d0413] transition-colors"><ChevronLeft size={20}/></button>
             <div className="px-6 py-3 text-sm font-black text-[#3d0413] uppercase tracking-widest min-w-[180px] text-center">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
             <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-3 text-slate-400 hover:text-[#3d0413] transition-colors"><ChevronRight size={20}/></button>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3">
             <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/30">
                   {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-50">
                   {(() => {
                      const year = viewDate.getFullYear(); const month = viewDate.getMonth();
                      const firstDay = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate();
                      const cells = [];
                      for(let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="h-28 bg-slate-50/20"></div>);
                      for(let d = 1; d <= lastDate; d++) {
                        const dateObj = new Date(year, month, d);
                        const dayName = daysOfWeek[dateObj.getDay()];
                        
                        // SYNC LOGIC: Check if this class has a scheduled session on this day of the week
                        const hasScheduledSession = timetableData[dayName]?.slots.some(s => s.classId === selectedPhysicalClass?.id);
                        
                        // Determine past/present status
                        const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));
                        const isToday = dateObj.toDateString() === new Date().toDateString();
                        
                        let status: 'present' | 'absent' | 'none' = 'none';
                        
                        // IF TODAY: Use the live registry state
                        if (isToday && hasScheduledSession && selectedStudentForHistory) {
                           status = attendanceState[selectedStudentForHistory.id] || 'none';
                        } 
                        // IF PAST: Use simulated history
                        else if (hasScheduledSession && isPast) {
                           status = (d % 9 === 0) ? 'absent' : 'present';
                        }
                        
                        cells.push(
                          <div 
                            key={`day-${d}`} 
                            onClick={() => {
                                if (hasScheduledSession && (isPast || isToday)) {
                                    setSelectedHistoricalDate(dateObj);
                                    setIsFromStorage(false); // Coming from history view
                                    setCurrentView('HISTORICAL_ATTENDANCE');
                                }
                            }}
                            className={`h-28 p-4 transition-all relative overflow-hidden group ${!hasScheduledSession ? 'bg-slate-50/10' : 'hover:bg-slate-50/50 cursor-pointer'}`}
                          >
                             <div className="flex justify-between items-start">
                                <span className={`text-sm font-black transition-colors ${hasScheduledSession ? 'text-[#3d0413]' : 'text-slate-300'}`}>{d}</span>
                                {hasScheduledSession && (isPast || isToday) && (
                                   <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ExternalLink size={12} className="text-[#3d0413]" />
                                   </div>
                                )}
                             </div>
                             
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                {status === 'present' && <CheckCircle2 size={48} className="text-emerald-500" />}
                                {status === 'absent' && <XCircle size={48} className="text-rose-500" />}
                             </div>
                             
                             <div className="mt-2 relative z-10">
                                {status === 'present' && (
                                    <div className="px-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase border border-emerald-100 text-center animate-in zoom-in duration-300">
                                        CLASS ATTENDED
                                    </div>
                                )}
                                {status === 'absent' && (
                                    <div className="px-2 py-1.5 bg-rose-50 text-rose-600 rounded-md text-[8px] font-black uppercase border border-rose-100 text-center animate-in zoom-in duration-300">
                                        ABSENT
                                    </div>
                                )}
                                {!hasScheduledSession && (
                                    <div className="mt-1 px-2 py-1 text-slate-300 text-[7px] font-black uppercase tracking-widest text-center italic opacity-40">
                                        NO SESSION
                                    </div>
                                )}
                                {hasScheduledSession && status === 'none' && (
                                    <div className="mt-1 px-2 py-1 bg-slate-50 text-slate-400 rounded-md text-[7px] font-black uppercase border border-slate-100 text-center">
                                        {isPast || isToday ? 'AWAITING REGISTRY' : 'PENDING SYNC'}
                                    </div>
                                )}
                             </div>
                          </div>
                        );
                      }
                      return cells;
                   })()}
                </div>
             </div>
          </div>
          <div className="space-y-8">
             <div className="bg-[#3d0413] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-60">UNIT COMPLIANCE</p>
                <div className="space-y-6 relative z-10">
                   <div>
                      <h4 className="text-5xl font-black tracking-tighter">
                         {selectedStudentForHistory?.admNo.includes('001') ? '98%' : '94%'}
                      </h4>
                      <p className="text-[9px] font-bold text-rose-300 uppercase tracking-widest mt-1">Institutional Node Sync Rate</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                         <h5 className="text-2xl font-black">18</h5>
                         <p className="text-[7px] font-black uppercase text-rose-200">Total Classes</p>
                      </div>
                      <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                         <h5 className="text-2xl font-black">01</h5>
                         <p className="text-[7px] font-black uppercase text-rose-200">Missed</p>
                      </div>
                   </div>
                </div>
             </div>
             <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">PROTOCOL LEGEND</h4>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-sm"><CheckCircle2 size={16}/></div>
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest leading-none">CLASS ATTENDED</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shadow-sm"><XCircle size={16}/></div>
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest leading-none">ABSENT</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-200 flex items-center justify-center border border-slate-100"><Clock size={16}/></div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">NO SCHEDULED CLASS</span>
                   </div>
                </div>
             </div>
             <div className="p-8 bg-[#3d0413]/5 rounded-[2.5rem] border border-[#3d0413]/10">
                <p className="text-[9px] font-black text-[#3d0413] uppercase tracking-widest leading-relaxed">
                   Tip: Click any past session node (highlighted) to view the full unit registry portal for that day.
                </p>
             </div>
          </div>
       </div>
    </div>
  );

  /**
   * Historical Attendance Portal View
   * Refined to match Screenshot EXACTLY and follow removal instructions.
   */
  const HistoricalAttendancePortal = (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-500 pb-20">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
             <button 
              onClick={() => {
                if (isFromStorage) {
                  setCurrentView('PHYSICAL_CLASS_DETAIL');
                  setSubPortal('RESOURCES');
                  setIsFromStorage(false);
                } else {
                  setCurrentView('STUDENT_HISTORY');
                }
              }} 
              className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95 hover:text-[#3d0413]"
             >
              <ArrowLeft size={24} />
             </button>
             <div>
                <h2 className="text-4xl font-black text-[#1a202c] uppercase tracking-tighter">HISTORICAL PORTAL</h2>
                <div className="flex items-center gap-3 mt-1.5">
                   <div className="px-3 py-1 bg-[#1a0409] text-white rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">
                      {selectedHistoricalDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">UNIT REGISTRY AUDIT</p>
                </div>
             </div>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={handleExportPdf}
               disabled={isExportingPdf}
               className="px-10 py-5 bg-white border border-slate-100 text-[#1a0409] rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm hover:shadow-xl transition-all disabled:opacity-50"
             >
                {isExportingPdf ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18}/>} 
                {isExportingPdf ? 'GENERATING PDF...' : 'EXPORT AUDIT LOG'}
             </button>
             <button className="px-10 py-5 bg-white border border-slate-100 text-[#1a0409] rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm group">
                <Edit3 size={18} className="group-hover:text-rose-900 transition-colors" /> CORRECTION MODE
             </button>
          </div>
       </header>

       <div ref={historicalPortalRef} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden relative">
          <div className="bg-[#3d0413] px-12 py-10 flex justify-between items-center text-white">
             <div>
                <h4 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">{selectedPhysicalClass?.title || 'REGISTRY AUDIT'}</h4>
                <p className="text-[10px] font-bold text-rose-300/70 uppercase tracking-[0.2em]">VENUE: {selectedPhysicalClass?.room || 'MAIN CAMPUS'} • REGISTRY NODE SNAPSHOT</p>
             </div>
             <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter opacity-90">
                   {selectedHistoricalDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </h3>
             </div>
          </div>
          
          <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="divide-x divide-slate-100">
                   <th className="px-12 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.4em]">STUDENT NODE</th>
                   <th className="px-12 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.4em]">ADM NO</th>
                   <th className="px-12 py-8 text-[11px] font-black uppercase text-slate-500 tracking-[0.4em] text-center">HISTORICAL STATUS</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {students.map(std => {
                   // Historical simulation logic matching screenshot
                   const isAbsent = std.name.includes('Mary');
                   return (
                     <tr key={std.id} className="transition-all duration-300 divide-x divide-slate-50 hover:bg-slate-50/50">
                        <td className="px-12 py-7">
                           <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-sm ${isAbsent ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{std.name.charAt(0)}</div>
                              <span className="text-[14px] font-black uppercase text-slate-900 tracking-tight">{std.name}</span>
                           </div>
                        </td>
                        <td className="px-12 py-7 text-[12px] font-black text-slate-400 uppercase tracking-widest">{std.admNo}</td>
                        <td className="px-12 py-7">
                           <div className="flex justify-center">
                              {isAbsent ? (
                                <div className="px-6 py-3 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase border border-rose-100 flex items-center gap-2 shadow-sm">
                                   <XCircle size={16}/> ABSENT
                                </div>
                              ) : (
                                <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100 flex items-center gap-2 shadow-sm">
                                   <CheckCircle2 size={16}/> CLASS ATTENDED
                                </div>
                              )}
                           </div>
                        </td>
                     </tr>
                   );
                })}
             </tbody>
          </table>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 w-full overflow-x-hidden selection:bg-rose-950 selection:text-white">
      {currentView === 'HOME' && HomeView}
      {currentView === 'PHYSICAL_CLASSES_OVERVIEW' && PhysicalClassesOverview}
      {currentView === 'PHYSICAL_CLASS_DETAIL' && PhysicalClassDashboardDetail}
      {currentView === 'SCHOOL_CALENDAR' && SchoolCalendarView}
      {currentView === 'STUDENT_HISTORY' && StudentHistoryView}
      {currentView === 'HISTORICAL_ATTENDANCE' && HistoricalAttendancePortal}
      {currentView === 'GLOBAL_STUDENT_ROSTER' && (
        <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 animate-in slide-in-from-right-4 duration-500 pb-20">
           <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                 <button 
                  onClick={() => {
                    setCurrentView('PHYSICAL_CLASSES_OVERVIEW');
                    if (returnToModal) {
                      setIsAddClassModalOpen(true);
                      setReturnToModal(false);
                    }
                  }} 
                  className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95 hover:text-[#3d0413]"
                 >
                    <ArrowLeft size={24} />
                 </button>
                 <div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Institutional Student Roster</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Unified Node Management</p>
                 </div>
              </div>
              <button onClick={() => setIsAddingStudent(true)} className="px-8 py-4 border-2 border-[#3d0413] text-[#3d0413] rounded-lg font-black uppercase text-[12px] tracking-widest hover:bg-[#3d0413] hover:text-white transition-all shadow-sm">ADD NEW STUDENT</button>
           </header>
           {isAddingStudent && StudentAddForm}
           <div className="bg-white border-2 border-rose-900/10 rounded-[3rem] shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-rose-50/20 border-b border-rose-900/10">
                    <tr className="divide-x divide-rose-900/10">
                       <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">STUDENT NODE</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">ADM NO</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">PHONE</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em]">REGISTRY HISTORY</th>
                       <th className="px-8 py-6 text-[10px] font-black uppercase text-[#3d0413] tracking-[0.3em] text-center">ACTION</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-rose-900/10">
                    {students.map(std => (
                      <tr key={std.id} className="transition-all duration-300 divide-x divide-rose-900/10 hover:bg-rose-50/10 group cursor-pointer">
                         <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#3d0413] flex items-center justify-center font-black">{std.name.charAt(0)}</div><span className="text-[12px] font-black uppercase text-slate-800">{std.name}</span></div></td>
                         <td className="px-8 py-6 text-[11px] font-black text-slate-400 tracking-widest uppercase">{std.admNo}</td>
                         <td className="px-8 py-6 text-[11px] font-black text-slate-500 uppercase">{std.phone}</td>
                         <td className="px-8 py-6"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase border border-emerald-100">{std.history}</span></td>
                         <td className="px-8 py-6 text-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteStudent(std.id); }}
                              className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm active:scale-90"
                            >
                              <Trash2 size={18} />
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
      
      {currentView === 'ONLINE_CLASSES' && (
         <div className="max-w-6xl mx-auto space-y-10 py-10 px-6 animate-in fade-in duration-500">
           <div className="flex items-center gap-6"><button onClick={() => setCurrentView('HOME')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm transition-transform active:scale-95"><ArrowLeft size={24} /></button><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Virtual Hubs</h2></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[{ id: 'oc1', code: 'ICT 101', title: 'PROGRAMMING BASICS', platform: 'Virtual Lab' }].map(cls => (
               <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all">
                 <h3 className="text-xl font-black text-slate-900 mb-6 uppercase leading-tight">{cls.title}</h3>
                 <button onClick={() => { setSelectedOnlineClass(cls); setCurrentView('ONLINE_CLASS_DETAIL'); }} className="w-full py-4 bg-[#3d0413] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Connect Hub</button>
               </div>
             ))}
           </div>
         </div>
      )}

      {currentView === 'ONLINE_CLASS_DETAIL' && (
        <div className="max-w-7xl mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-500">
           <header className="flex items-center gap-6"><button onClick={() => setCurrentView('ONLINE_CLASSES')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm"><ArrowLeft size={24} /></button><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedOnlineClass?.code} Portal</h2></header>
           <div className="aspect-video bg-slate-950 rounded-[3rem] overflow-hidden relative shadow-2xl border-4 border-white/5 group">
              {isCameraActive ? <video ref={videoRefCallback} className="w-full h-full object-cover" autoPlay playsInline muted /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10"><MonitorPlay size={64} className="mb-4" /><p className="font-black uppercase tracking-widest text-[10px]">Transmission Offline</p></div>}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={toggleCamera} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isCameraActive ? 'bg-rose-50 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}><VideoIcon size={20}/></button>
                 <button className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all"><Mic size={20}/></button>
              </div>
           </div>
        </div>
      )}

      {isAiPanelOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsAiPanelOpen(false)}></div>
          <div className="relative w-full max-w-2xl h-full bg-white shadow-[-50px_0_100px_-20px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-500 flex flex-col">
            <header className="p-10 border-b border-slate-100 flex items-center justify-between"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">AI Command Intelligence</h3><button onClick={() => setIsAiPanelOpen(false)} className="p-3 text-slate-400 hover:text-rose-950 transition-colors"><X size={24}/></button></header>
            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              {aiResponse ? (
                <div className="animate-in fade-in duration-700">
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-sm font-medium text-slate-700">{aiResponse.text}</div>
                </div>
              ) : <div className="h-full flex flex-col items-center justify-center text-center opacity-30"><Search size={48} className="mb-4" /><p className="font-black uppercase tracking-widest text-[10px]">Awaiting query...</p></div>}
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

      {/* MODALS SECTION */}

      {/* Add Session Slot Modal */}
      {isAddingSlot && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsAddingSlot(false)}></div>
            <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] shadow-2xl p-12 overflow-hidden animate-in zoom-in duration-300">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-rose-50 text-[#3d0413] rounded-2xl flex items-center justify-center shadow-sm"><Clock size={24}/></div>
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Add Session Slot</h4>
               </div>
               <form className="space-y-6" onSubmit={handleAddSlot}>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Select Target Day</label>
                     <div className="grid grid-cols-4 gap-2">
                        {daysOfWeek.map(d => (
                          <button 
                            key={d} 
                            type="button" 
                            onClick={() => setActiveDay(d)}
                            className={`py-2 text-[10px] font-black rounded-lg border transition-all ${activeDay === d ? 'bg-[#3d0413] text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                          >
                             {d.slice(0, 3)}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Class Name</label>
                        <input type="text" placeholder="E.G. MATH 101" required value={newSlotData.className} onChange={e => setNewSlotData({...newSlotData, className: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-[#3d0413] transition-all" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Venue / Room</label>
                        <input type="text" placeholder="ROOM B2" required value={newSlotData.room} onChange={e => setNewSlotData({...newSlotData, room: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-[#3d0413] transition-all" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Start Time Configuration</label>
                     <div className="flex items-center gap-4">
                        <select value={selectedHour} onChange={e => setSelectedHour(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-black text-lg text-center outline-none focus:border-[#3d0413]">
                           {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="font-black text-slate-300 text-2xl">:</span>
                        <select value={selectedMinute} onChange={e => setSelectedMinute(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-black text-lg text-center outline-none focus:border-[#3d0413]">
                           {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                     </div>
                  </div>
                  <div className="pt-6 flex gap-4">
                     <button type="button" onClick={() => setIsAddingSlot(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">CANCEL</button>
                     <button type="submit" className="flex-1 py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">COMMIT SLOT</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Add Class Modal */}
      {isAddClassModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsAddClassModalOpen(false)}></div>
            <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] shadow-2xl p-12 overflow-hidden animate-in zoom-in duration-300">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div className="flex items-center gap-4 mb-8"><div className="w-12 h-12 bg-rose-50 text-[#3d0413] rounded-2xl flex items-center justify-center shadow-sm"><PlusCircle size={24}/></div><h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">ADD NEW CLASS</h4></div>
               <form className="space-y-6" onSubmit={handleAddClassSubmit}>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">CLASS TITLE / MODULE NAME</label><input type="text" placeholder="E.G. ADVANCED CALCULUS" value={newClass.title} onChange={(e) => setNewClass({...newClass, title: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">UNIT CODE</label><input type="text" placeholder="EE-XXX" value={newClass.code} onChange={(e) => setNewClass({...newClass, code: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">FACILITY / VENUE</label><input type="text" placeholder="ROOM NO / LAB" value={newClass.room} onChange={(e) => setNewClass({...newClass, room: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" /></div>
                  </div>
                  
                  <div className="pt-2 flex flex-wrap gap-4">
                    <button 
                      type="button" 
                      onClick={() => { 
                        setIsAddClassModalOpen(false); 
                        setReturnToModal(true); // Track source for back navigation
                        setCurrentView('GLOBAL_STUDENT_ROSTER'); 
                      }} 
                      className="flex-1 py-3 px-4 border-2 border-[#3d0413] text-[#3d0413] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#3d0413] hover:text-white transition-all"
                    >
                      ADD STUDENTS
                    </button>
                    <button type="button" onClick={() => { 
                      setIsAddClassModalOpen(false); 
                      setReturnToModal(true); // Track source for back navigation
                      if (myPhysicalClasses.length > 0) {
                        setSelectedPhysicalClass(myPhysicalClasses[0]);
                        setSubPortal('TIMETABLE');
                        setCurrentView('PHYSICAL_CLASS_DETAIL');
                      } else {
                        setCurrentView('SCHOOL_CALENDAR');
                      }
                    }} className="flex-1 py-3 px-4 border-2 border-[#3d0413] text-[#3d0413] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#3d0413] hover:text-white transition-all">ADD TO TIME TABLE</button>
                  </div>

                  <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsAddClassModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">CANCEL</button><button type="submit" className="flex-1 py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">COMMIT CLASS</button></div>
               </form>
            </div>
         </div>
       )}

       {isOpeningModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsOpeningModalOpen(false)}></div>
            <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] shadow-2xl p-12 overflow-hidden animate-in zoom-in duration-300">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div className="flex items-center gap-4 mb-8"><div className="w-12 h-12 bg-rose-50 text-[#3d0413] rounded-2xl flex items-center justify-center shadow-sm"><School size={24}/></div><h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Register School Opening</h4></div>
               <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); setIsOpeningModalOpen(false); }}>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Opening Date</label><input type="date" value={academicSchedule.openingDate} onChange={(e) => setAcademicSchedule({...academicSchedule, openingDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" required /></div>
                  <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsOpeningModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">CANCEL</button><button type="submit" className="flex-1 py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">COMMIT OPENING</button></div>
               </form>
            </div>
         </div>
       )}

       {isClosingModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsClosingModalOpen(false)}></div>
            <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] shadow-2xl p-12 overflow-hidden animate-in zoom-in duration-300">
               <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div className="flex items-center gap-4 mb-8"><div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center shadow-sm"><CalendarDays size={24}/></div><h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Register School Closing</h4></div>
               <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); setIsClosingModalOpen(false); }}>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Scheduled Closing Date</label><input type="date" value={academicSchedule.closingDate} onChange={(e) => setAcademicSchedule({...academicSchedule, closingDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-black text-lg outline-none focus:ring-4 focus:ring-[#3d0413]/5 focus:border-[#3d0413] transition-all" required /></div>
                  <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsClosingModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">CANCEL</button><button type="submit" className="flex-1 py-5 bg-[#3d0413] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">COMMIT CLOSING</button></div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

export default StaffDashboardHome;