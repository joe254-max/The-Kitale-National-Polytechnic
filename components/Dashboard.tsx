import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Resource } from '../types';
import { 
  Plus, ArrowLeft, X, ShieldCheck, Save, Video as VideoIcon,
  CheckCircle2, Users, MonitorPlay, Sparkles, 
  Search, Edit3, UserPlus, Presentation, FileCode, School,
  Mic, MicOff, VideoOff, MonitorUp, MessageSquare, Hand, Radio, Phone,
  UserCheck, Send, Activity, FileDown, PhoneCall, Check,
  UserCheck2, UserX2, Filter, RotateCcw, Info, Printer, Lock, History, FileText, CloudUpload, Mail, BarChart3, ArrowRight, ExternalLink, Monitor, Zap, Globe, Layers, BookOpen, Clock, Trash2, CalendarPlus, TrendingUp, AlertTriangle, Briefcase, Calendar, Power, DoorOpen
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DashboardProps {
  user: User;
  resources: Resource[];
}

type SystemView = 'HOME' | 'PHYSICAL_CLASS_DETAIL' | 'ONLINE_CLASS_DETAIL';
type ClassTab = 'REGISTER' | 'TIME TABLE' | 'STUDENTS' | 'MATERIALS';
type MaterialCategory = 'LECTURE_NOTES' | 'LAB_MANUALS' | 'PAST_PAPERS';

interface LectureNote {
  id: string;
  title: string;
  fileName: string;
  size: string;
  uploadedDate: string;
  downloads: number;
  format: 'PDF' | 'PPT' | 'DOC';
  week: number;
  category: MaterialCategory;
  tags: string[];
}

interface ScheduleSession {
  id: string;
  day: string;
  time: string;
  venue: string;
  type: 'LECTURE' | 'PRACTICAL' | 'SEMINAR';
}

interface Student {
  id: string;
  name: string;
  admNo: string;
  phone: string;
  attendance: number;
  gradeAverage: number;
  status: 'ACTIVE' | 'PROBATION' | 'DEFERRED';
  classId?: string;
}

interface PhysicalClass {
  id: string;
  code: string;
  title: string;
  room: string;
  studentCount: number;
  type: 'PHYSICAL';
  department: string;
  credits: number;
  staff: string;
  schedule: ScheduleSession[];
}

interface VirtualClass {
  id: string;
  code: string;
  title: string;
  platform: string;
  students: number;
  link: string;
  type: 'ONLINE';
  startTime: string;
}

const STORAGE_KEYS = {
  PHYSICAL: 'staff_physical_classes_v1',
  VIRTUAL: 'staff_virtual_classes_v1',
  STUDENT_REGISTRY: 'poly_institutional_registry',
  ENROLLED_STUDENTS: 'poly_enrolled_students'
};

const StaffDashboardHome: React.FC<DashboardProps> = ({ user, resources }) => {
  const [currentView, setCurrentView] = useState<SystemView>('HOME');
  const [activeClassTab, setActiveClassTab] = useState<ClassTab>('REGISTER');
  const [activeMaterialCategory, setActiveMaterialCategory] = useState<MaterialCategory | null>(null);
  const [selectedPhysicalClass, setSelectedPhysicalClass] = useState<PhysicalClass | null>(null);
  const [selectedOnlineClass, setSelectedOnlineClass] = useState<VirtualClass | null>(null);
  
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [materialsSearch, setMaterialsSearch] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const pdfPrintRef = useRef<HTMLDivElement>(null);
  const classFormRef = useRef<HTMLFormElement>(null);

  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Persistence Logic for Staff Dashboard
  const [physicalClasses, setPhysicalClasses] = useState<PhysicalClass[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PHYSICAL);
    return saved ? JSON.parse(saved) : [
      { 
        id: 'pc1', code: 'EE-402', title: 'POWER SYSTEMS II', room: 'POWER LAB 2', studentCount: 42, type: 'PHYSICAL' as const, department: 'ELECTRICAL ENGINEERING', credits: 3, staff: user.name,
        schedule: [
          { id: 's1', day: 'MONDAY', time: '08:00 AM - 11:00 AM', venue: 'POWER LAB 2', type: 'PRACTICAL' },
          { id: 's2', day: 'WEDNESDAY', time: '02:00 PM - 04:00 PM', venue: 'LT-04', type: 'LECTURE' },
        ],
      }
    ];
  });

  const [virtualClasses, setVirtualClasses] = useState<VirtualClass[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIRTUAL);
    return saved ? JSON.parse(saved) : [
      { id: 'v1', code: 'ICT-101', title: 'PROGRAMMING LOGIC', platform: 'MICROSOFT TEAMS', students: 42, link: 'https://teams.microsoft.com', type: 'ONLINE' as const, startTime: '10:00 AM' }
    ];
  });

  // Load students from Registry + Defaults
  const [students, setStudents] = useState<Student[]>(() => {
    const defaultStudents: Student[] = [
      { id: 'st1', name: 'BENJAMIN KIPROP', admNo: 'EE/001/2024', phone: '+254 711 000 001', attendance: 98, gradeAverage: 74, status: 'ACTIVE' },
      { id: 'st2', name: 'CYNTHIA ANYANGO', admNo: 'EE/042/2024', phone: '+254 711 000 002', attendance: 82, gradeAverage: 68, status: 'ACTIVE' },
      { id: 'st3', name: 'DOUGLAS MWANGI', admNo: 'EE/105/2024', phone: '+254 711 000 003', attendance: 45, gradeAverage: 52, status: 'PROBATION' },
    ];
    const saved = localStorage.getItem(STORAGE_KEYS.ENROLLED_STUDENTS);
    const joinedStudents: Student[] = saved ? JSON.parse(saved) : [];
    return [...defaultStudents, ...joinedStudents];
  });

  // Sync to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PHYSICAL, JSON.stringify(physicalClasses));
  }, [physicalClasses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIRTUAL, JSON.stringify(virtualClasses));
  }, [virtualClasses]);

  // Calendar Governance States
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarAction, setCalendarAction] = useState<'OPENING' | 'CLOSING'>('OPENING');
  const [academicConfig, setAcademicConfig] = useState({
    term: 1,
    openingDate: '2026-05-01',
    closingDate: '2026-08-15',
    status: 'ACTIVE' as 'ACTIVE' | 'BREAK'
  });

  const [attendanceLog, setAttendanceLog] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<PhysicalClass | VirtualClass | null>(null);
  const [provisionType, setProvisionType] = useState<'PHYSICAL' | 'ONLINE'>('PHYSICAL');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  
  const [messagingStudent, setMessagingStudent] = useState<Student | null>(null);
  const [analyticsStudent, setAnalyticsStudent] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ScheduleSession | null>(null);

  const [lectureNotes] = useState<LectureNote[]>([
    { id: 'n1', title: 'TRANSMISSION LINE MODELLING', fileName: 'EE402_WK1_TRANSMISSION.PDF', size: '4.8 MB', uploadedDate: 'FEB 1, 2026', downloads: 124, format: 'PDF', week: 1, category: 'LECTURE_NOTES', tags: ['Core'] },
    { id: 'n2', title: 'LAB MANUAL: FAULT ANALYSIS', fileName: 'LAB_EE402_P1.PDF', size: '12.4 MB', uploadedDate: 'FEB 5, 2026', downloads: 215, format: 'PDF', week: 1, category: 'LAB_MANUALS', tags: ['Mandatory'] },
    { id: 'n3', title: 'POWER PROTECTION SYSTEMS 2023', fileName: 'EXAM_EE402_S1_2023.PDF', size: '2.1 MB', uploadedDate: 'DEC 12, 2025', downloads: 89, format: 'PDF', week: 14, category: 'PAST_PAPERS', tags: ['Exam'] },
  ]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const setStudentStatus = (id: string, status: 'PRESENT' | 'ABSENT') => {
    setAttendanceLog(prev => ({ ...prev, [id]: status }));
  };

  const syncToGlobalRegistry = (node: PhysicalClass | VirtualClass, isRemoval: boolean = false) => {
    const currentRegistryStr = localStorage.getItem(STORAGE_KEYS.STUDENT_REGISTRY) || '[]';
    let currentRegistry = JSON.parse(currentRegistryStr);
    
    if (isRemoval) {
      currentRegistry = currentRegistry.filter((r: any) => r.id !== node.id);
    } else {
      const existingIdx = currentRegistry.findIndex((r: any) => r.id === node.id);
      const registryItem = {
        id: node.id,
        title: `${node.code}: ${node.title}`,
        teacher: user.name,
        room: node.type === 'PHYSICAL' ? (node as PhysicalClass).room : (node as VirtualClass).platform,
        schedule: node.type === 'PHYSICAL' ? 'In-person node' : 'Virtual session',
        type: node.type,
        studentCount: (node as any).studentCount || 0,
        department: user.department || 'General Academic Dept',
        platform: node.type === 'ONLINE' ? (node as VirtualClass).platform : undefined
      };

      if (existingIdx > -1) {
        currentRegistry[existingIdx] = registryItem;
      } else {
        currentRegistry.push(registryItem);
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.STUDENT_REGISTRY, JSON.stringify(currentRegistry));
  };

  const handleDeleteNode = (e: React.MouseEvent, id: string, type: 'PHYSICAL' | 'ONLINE') => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to terminate this academic node? This action is irreversible.")) return;
    
    if (type === 'PHYSICAL') {
      const nodeToRemove = physicalClasses.find(c => c.id === id);
      if (nodeToRemove) syncToGlobalRegistry(nodeToRemove, true);
      setPhysicalClasses(prev => prev.filter(c => c.id !== id));
    } else {
      const nodeToRemove = virtualClasses.find(c => c.id === id);
      if (nodeToRemove) syncToGlobalRegistry(nodeToRemove, true);
      setVirtualClasses(prev => prev.filter(c => c.id !== id));
    }
    showToast("Academic Node Terminated", "info");
  };

  const handleOpenEdit = (e: React.MouseEvent, node: PhysicalClass | VirtualClass) => {
    e.stopPropagation();
    setEditingNode(node);
    setProvisionType(node.type);
    setIsCreateClassModalOpen(true);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!selectedPhysicalClass) return;
    if (!window.confirm("Delete this session from the time table?")) return;

    const updatedSchedule = selectedPhysicalClass.schedule.filter(s => s.id !== sessionId);
    const updatedClass = { ...selectedPhysicalClass, schedule: updatedSchedule };
    
    setPhysicalClasses(prev => prev.map(c => c.id === selectedPhysicalClass.id ? updatedClass : c));
    setSelectedPhysicalClass(updatedClass);
    showToast("Session Removed", "info");
  };

  const handleOpenSessionModal = (session?: ScheduleSession) => {
    setEditingSession(session || null);
    setIsSessionModalOpen(true);
  };

  const handleToggleMic = () => {
    setIsMicOn(!isMicOn);
    showToast(!isMicOn ? "Microphone Authorized" : "Microphone Muted", "info");
  };

  const handleToggleVideo = async () => {
    if (isCamOn) {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
      setIsCamOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setMediaStream(stream);
        setIsCamOn(true);
      } catch (err) { showToast("Visual Input Denied", "info"); }
    }
  };

  const handleExportPDF = async () => {
    if (!pdfPrintRef.current) return;
    showToast("Generating Academic Document...", "info");
    try {
      pdfPrintRef.current.style.display = 'block';
      const canvas = await html2canvas(pdfPrintRef.current, { scale: 2, useCORS: true });
      pdfPrintRef.current.style.display = 'none';
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TKNP_Attendance_${selectedPhysicalClass?.code}.pdf`);
      showToast("Official Document Dispatched", "success");
    } catch (err) { showToast("PDF Sync Failure", "info"); }
  };

  // Filter students based on current selected class
  const classStudents = useMemo(() => {
    const currentId = selectedPhysicalClass?.id || selectedOnlineClass?.id;
    if (!currentId) return students;
    return students.filter(s => !s.classId || s.classId === currentId);
  }, [students, selectedPhysicalClass, selectedOnlineClass]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
      s.admNo.toLowerCase().includes(ledgerSearch.toLowerCase())
    );
  }, [classStudents, ledgerSearch]);

  const filteredMaterials = useMemo(() => {
    return lectureNotes.filter(note => {
      const query = materialsSearch.toLowerCase().trim();
      const matchesSearch = query === '' || 
                           note.title.toLowerCase().includes(query) || 
                           note.fileName.toLowerCase().includes(query) ||
                           note.tags.some(tag => tag.toLowerCase().includes(query));
      
      if (activeMaterialCategory) {
        return note.category === activeMaterialCategory && matchesSearch;
      }
      return matchesSearch;
    });
  }, [lectureNotes, activeMaterialCategory, materialsSearch]);

  const renderRegister = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Present Today</p>
          <p className="text-4xl font-black text-emerald-900">{Object.values(attendanceLog).filter(v => v === 'PRESENT').length}</p></div>
          <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><UserCheck size={24} /></div>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Absent Today</p>
          <p className="text-4xl font-black text-rose-900">{Object.values(attendanceLog).filter(v => v === 'ABSENT').length}</p></div>
          <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm"><X size={24} /></div>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Class Size</p>
          <p className="text-4xl font-black text-slate-900">{classStudents.length}</p></div>
          <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm"><Users size={24} /></div>
        </div>
        <div className="bg-[#3d0413] p-8 rounded-[2.5rem] flex items-center justify-between shadow-xl border-b-4 border-black">
          <div><p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Completion</p>
          <p className="text-4xl font-black text-white">{Math.round((Object.keys(attendanceLog).length / (classStudents.length || 1)) * 100) || 0}%</p></div>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Activity size={24} /></div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4 bg-slate-50/20">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Class Attendance</h3>
            <div className="mt-4 relative w-64">
              <input type="text" placeholder="Filter Ledger..." value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm" />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { classStudents.forEach(st => setStudentStatus(st.id, 'PRESENT')); showToast("Marked All Present"); }} className="px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition flex items-center gap-2 border border-emerald-100"><UserCheck2 size={16} /> Mark All Present</button>
            <button onClick={() => setIsAddStudentModalOpen(true)} className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition flex items-center gap-2"><UserPlus size={16} /> Enroll New</button>
            <button onClick={handleExportPDF} className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition flex items-center gap-2"><FileDown size={16} /> Official PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-10 py-6 text-left">Student Node</th>
                <th className="px-10 py-6 text-left">Admission No</th>
                <th className="px-10 py-6 text-left">Phone Node</th>
                <th className="px-10 py-6 text-center">Mark Presence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map(st => (
                <tr key={st.id} className="hover:bg-slate-50/30 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-[#3d0413]/10 text-[#3d0413] rounded-lg flex items-center justify-center font-black text-xs">
                        {st.name.charAt(0)}
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs">{st.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 font-black text-slate-600 text-[11px] tracking-widest">{st.admNo}</td>
                  <td className="px-10 py-6 font-black text-slate-600 text-[11px] tracking-widest">{st.phone}</td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-5">
                       <button onClick={() => setStudentStatus(st.id, 'PRESENT')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${attendanceLog[st.id] === 'PRESENT' ? 'bg-emerald-500 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-300 hover:text-emerald-500'}`}><Check size={20} strokeWidth={3} /></button>
                       <button onClick={() => setStudentStatus(st.id, 'ABSENT')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${attendanceLog[st.id] === 'ABSENT' ? 'bg-rose-600 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-300 hover:text-rose-600'}`}><X size={20} strokeWidth={3} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-20 text-center">
                     <Users size={48} className="mx-auto text-slate-200 mb-4" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching peer nodes in this module ledger</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTimetable = () => (
    <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-xl animate-in fade-in slide-in-from-right-8 duration-700 relative">
      <div className="flex items-center justify-between mb-12">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">TIME TABLE</h3>
        <button 
          onClick={() => handleOpenSessionModal()}
          className="px-8 py-4 bg-[#3d0413] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3 border-b-6 border-black"
        >
          <CalendarPlus size={20} /> Provision Session
        </button>
      </div>

      <div className="grid grid-cols-5 gap-8">
        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(day => (
          <div key={day} className="space-y-6">
            <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-[#3d0413] uppercase tracking-[0.3em]">{day}</span>
            </div>
            <div className="min-h-[350px] flex flex-col gap-4">
              {(selectedPhysicalClass?.schedule || []).filter(s => s.day === day).length === 0 && (
                <div className="flex-1 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex items-center justify-center opacity-20">
                  <Clock size={32} />
                </div>
              )}
              {(selectedPhysicalClass?.schedule || []).filter(s => s.day === day).map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenSessionModal(s)}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-[#3d0413] rounded-lg transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{s.time}</p>
                  <p className="font-black text-slate-900 uppercase text-xs mb-6 leading-tight">{s.venue}</p>
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${s.type === 'PRACTICAL' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {s.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-700">
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <input 
            type="text" 
            placeholder="Search Academic Roster..." 
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-[#3d0413]/5 transition-all" 
          />
          <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
        </div>
        <button onClick={() => setIsAddStudentModalOpen(true)} className="px-10 py-5 bg-[#3d0413] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-6 border-black">Enroll Peer Node</button>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-10 py-8 text-left">Academic Peer</th>
                <th className="px-10 py-8 text-left">Registry ID</th>
                <th className="px-10 py-8 text-left">Communication Node</th>
                <th className="px-10 py-8 text-center">Engagement %</th>
                <th className="px-10 py-8 text-center">Enrolment Status</th>
                <th className="px-10 py-8 text-center">Attendance History</th>
                <th className="px-10 py-8 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map(st => (
                <tr key={st.id} className="hover:bg-slate-50/30 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#3d0413] font-black group-hover:bg-[#3d0413] group-hover:text-white transition-all duration-300">
                        {st.name.charAt(0)}
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{st.name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 font-black text-slate-600 text-[11px] tracking-widest">{st.admNo}</td>
                  <td className="px-10 py-6 font-black text-slate-600 text-[11px] tracking-widest">{st.phone}</td>
                  <td className="px-10 py-6 text-center">
                    <div className="inline-flex items-center gap-2">
                      <span className="font-black text-slate-900 text-[11px]">{st.attendance}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${st.attendance > 75 ? 'bg-emerald-500' : st.attendance > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: `${st.attendance}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      st.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      st.status === 'PROBATION' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <button 
                      onClick={() => setHistoryStudent(st)}
                      className="p-3 bg-slate-50 text-[#3d0413] hover:bg-[#3d0413] hover:text-white rounded-xl shadow-sm transition-all"
                    >
                      <History size={18} />
                    </button>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setMessagingStudent(st)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-[#3d0413] hover:bg-white hover:shadow-md rounded-xl transition-all" 
                      >
                        <Mail size={16} />
                      </button>
                      <button 
                        onClick={() => setAnalyticsStudent(st)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-md rounded-xl transition-all" 
                      >
                        <BarChart3 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                   <td colSpan={7} className="px-10 py-20 text-center">
                      <Users size={64} className="mx-auto text-slate-100 mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No peer nodes joined this institutional repository module</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMaterials = () => {
    const isSearching = materialsSearch.trim().length > 0;
    const showList = activeMaterialCategory !== null || isSearching;
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-4xl font-black uppercase tracking-tight text-slate-900">
              {activeMaterialCategory ? activeMaterialCategory.replace('_', ' ') : isSearching ? 'Search Results' : 'Asset Repository'}
            </h3>
            {activeMaterialCategory && (
              <button 
                onClick={() => { setActiveMaterialCategory(null); setMaterialsSearch(''); }}
                className="text-[10px] font-black text-[#3d0413] uppercase tracking-widest hover:underline flex items-center gap-1 w-fit"
              >
                <ArrowLeft size={12} /> Back to Categories
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
             <div className="relative w-full md:w-80">
                <input 
                  type="text" 
                  placeholder="Filter Assets..." 
                  value={materialsSearch}
                  onChange={(e) => setMaterialsSearch(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-[#3d0413]/5 transition-all" 
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                {isSearching && (
                  <button 
                    onClick={() => setMaterialsSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
             </div>
             <button className="px-10 py-5 bg-[#3d0413] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3 border-b-6 border-black">
               <CloudUpload size={20} /> Provision Asset
             </button>
          </div>
        </div>
        {!showList ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { id: 'LECTURE_NOTES', title: 'Curriculum Nodes', icon: <FileText size={48} />, color: 'bg-emerald-50 text-emerald-600' },
              { id: 'LAB_MANUALS', title: 'Practical Logs', icon: <Lock size={48} />, color: 'bg-amber-50 text-amber-600' },
              { id: 'PAST_PAPERS', title: 'Historical Exams', icon: <History size={48} />, color: 'bg-indigo-50 text-indigo-600' },
            ].map(cat => (
              <div key={cat.id} onClick={() => setActiveMaterialCategory(cat.id as MaterialCategory)} className="bg-white p-14 rounded-[4.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer text-center">
                <div className={`w-28 h-28 ${cat.color} rounded-[3rem] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform shadow-inner`}>{cat.icon}</div>
                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">{cat.title}</h4>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select to view files</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredMaterials.map(note => (
              <div key={note.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col justify-between aspect-[5/6]">
                <div>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-[#3d0413] mb-6 group-hover:scale-110 transition-transform"><FileCode size={32} /></div>
                  <h4 className="text-lg font-black text-slate-900 mb-1 uppercase line-clamp-2 leading-tight group-hover:text-[#3d0413] transition-colors">{note.title}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 truncate">{note.fileName}</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                     {note.tags.map(tag => (
                       <span key={tag} className="px-2.5 py-1 bg-slate-50 text-[9px] font-black uppercase text-slate-400 border border-slate-100 rounded-lg group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">{tag}</span>
                     ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{note.size}</span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{note.uploadedDate}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-3 bg-slate-50 text-slate-400 hover:text-[#3d0413] hover:bg-white hover:shadow-md rounded-xl transition-all"><FileDown size={18} /></button>
                    <button className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:shadow-md rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOnlineClassDetail = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in slide-in-from-right-12 duration-1000">
      <div className="lg:col-span-2 space-y-12">
        <div className="relative bg-slate-950 aspect-video rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] group border border-white/5">
          {!isCamOn ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8"><VideoOff size={64} /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Institutional Feed Offline</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />
          )}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 p-6 bg-white/10 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
            <button onClick={handleToggleMic} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isMicOn ? 'bg-white text-[#3d0413]' : 'bg-rose-600 text-white'}`}>{isMicOn ? <Mic size={24} /> : <MicOff size={24} />}</button>
            <button onClick={handleToggleVideo} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isCamOn ? 'bg-white text-[#3d0413]' : 'bg-rose-600 text-white'}`}>{isCamOn ? <VideoIcon size={24} /> : <VideoOff size={24} />}</button>
            <button className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all"><MonitorUp size={24} /></button>
            <div className="w-px h-10 bg-white/10 mx-2"></div>
            <button onClick={() => { setCurrentView('HOME'); setSelectedOnlineClass(null); }} className="px-10 py-5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Terminate</button>
          </div>
          <div className="absolute top-12 left-12 px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl animate-pulse"><div className="w-2 h-2 bg-white rounded-full"></div> Live Feed Authorized</div>
        </div>
        <div className="bg-white p-14 rounded-[4.5rem] border border-slate-100 shadow-xl flex items-center justify-between">
           <div>
             <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{selectedOnlineClass?.title}</h3>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
               <span className="text-rose-600 font-black">{selectedOnlineClass?.platform}</span> • {selectedOnlineClass?.code}
             </p>
           </div>
           <a href={selectedOnlineClass?.link} target="_blank" rel="noopener noreferrer" className="px-12 py-6 bg-[#3d0413] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-4 border-b-6 border-black"><ExternalLink size={20} /> Open Platform Node</a>
        </div>
      </div>
      <div className="space-y-12">
        <div className="bg-slate-50 border border-slate-100 p-10 rounded-[4rem] flex items-center justify-between">
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Peers</p><p className="text-5xl font-black text-slate-900">{selectedOnlineClass?.students}</p></div>
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#3d0413] shadow-sm"><Users size={32} /></div>
        </div>
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl p-10 flex flex-col h-[500px]">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3"><MessageSquare size={16} /> Session Intelligence Chat</h3>
          <div className="flex-1 overflow-y-auto space-y-6 mb-8 pr-4 scrollbar-hide">
            <div className="bg-slate-50 p-6 rounded-[2rem] rounded-tl-none border border-slate-100 max-w-[85%]"><p className="text-[9px] font-black text-[#3d0413] uppercase tracking-widest mb-2">System Registry</p><p className="text-xs font-medium text-slate-600 leading-relaxed">Institutional Security Node Verified. All sessions cataloged.</p></div>
          </div>
          <div className="relative"><input type="text" placeholder="Broadcast to peers..." className="w-full pl-8 pr-20 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none" /><button className="absolute right-3 top-3 bottom-3 px-6 bg-[#3d0413] text-white rounded-xl shadow-xl active:scale-90 transition-all"><Send size={18} /></button></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[60rem] h-[60rem] bg-rose-50/40 rounded-full blur-[100px] -mr-[20rem] -mt-[20rem] pointer-events-none z-0 animate-pulse duration-[5000ms]"></div>
      <div className="max-w-[1600px] mx-auto p-12 lg:p-20 relative z-10">
        {notification && (
          <div className="fixed top-24 right-12 z-[1000] animate-in slide-in-from-right-8">
            <div className={`px-12 py-6 rounded-3xl shadow-2xl border-l-8 flex items-center gap-8 ${notification.type === 'success' ? 'bg-white border-emerald-500 text-slate-900' : 'bg-[#3d0413] border-rose-400 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={36} /> : <Info className="text-rose-400" size={36} />}
              <p className="text-base font-black uppercase tracking-[0.1em]">{notification.msg}</p>
            </div>
          </div>
        )}

        {currentView === 'HOME' && (
          <div className="space-y-24 animate-in fade-in duration-1000">
            <div className="flex flex-col items-center text-center max-w-5xl mx-auto space-y-4">
               <div className="flex items-center gap-4 mb-4">
                  <button 
                    onClick={() => { setCalendarAction('OPENING'); setIsCalendarModalOpen(true); }}
                    className="px-6 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition shadow-sm"
                  >
                    <DoorOpen size={14} /> Open School Node
                  </button>
                  <button 
                    onClick={() => { setCalendarAction('CLOSING'); setIsCalendarModalOpen(true); }}
                    className="px-6 py-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-100 transition shadow-sm"
                  >
                    <Power size={14} /> Close School Node
                  </button>
               </div>
               <div className="px-6 py-2 bg-[#3d0413]/5 rounded-full border border-[#3d0413]/10 flex items-center gap-3 mb-4">
                  <ShieldCheck size={14} className="text-[#3d0413]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#3d0413]/70">Secure Institutional Gateway Authorized</span>
               </div>
               <h1 className="text-5xl md:text-7xl font-black text-[#1a202c] uppercase tracking-tighter leading-[0.8]">
                 WELCOME <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#3d0413] via-[#800] to-rose-700">{user.name}</span>
               </h1>
               <div className="flex items-center gap-6 mt-4">
                 <p className="text-slate-400 font-black uppercase tracking-[0.6em] text-[10px] leading-loose opacity-70">SELECT MODULE</p>
                 <div className="h-px w-12 bg-slate-200"></div>
                 <span className="text-[10px] font-black text-[#3d0413] uppercase tracking-[0.3em]">Term {academicConfig.term} • {academicConfig.status}</span>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 max-w-[1300px] mx-auto px-4 pb-20">
              {physicalClasses.map(c => (
                <div key={c.id} onClick={() => { setSelectedPhysicalClass(c); setCurrentView('PHYSICAL_CLASS_DETAIL'); setActiveClassTab('REGISTER'); }} className="bg-[#f8f9fa] aspect-[4/5] rounded-[5rem] p-16 flex flex-col justify-between hover:shadow-[0_60px_100px_-30px_rgba(61,4,19,0.15)] transition-all duration-700 cursor-pointer group border border-slate-100 relative overflow-hidden active:scale-95">
                  <div className="absolute top-8 right-8 flex gap-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={(e) => handleOpenEdit(e, c)} className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-600 hover:text-[#3d0413] border border-slate-100"><Edit3 size={18} /></button>
                    <button onClick={(e) => handleDeleteNode(e, c.id, 'PHYSICAL')} className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-rose-600 border border-rose-100"><Trash2 size={18} /></button>
                  </div>
                  <div className="relative z-10 space-y-12">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-[#3d0413] shadow-lg border border-slate-50 group-hover:-rotate-12 transition-transform duration-500">
                      <School size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9] group-hover:text-[#3d0413] transition-colors">{c.title}</h4>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{c.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-12 relative z-10">
                    <span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em]">INITIALIZE REGISTRY</span>
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#3d0413] shadow-lg group-hover:translate-x-4 transition-transform border border-slate-100">
                      <ArrowRight size={28} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
              {virtualClasses.map(v => (
                <div key={v.id} onClick={() => { setSelectedOnlineClass(v); setCurrentView('ONLINE_CLASS_DETAIL'); }} className="bg-[#1a0208] aspect-[4/5] rounded-[5rem] p-16 flex flex-col justify-between hover:shadow-[0_60px_100px_-30px_rgba(225,29,72,0.3)] transition-all duration-700 cursor-pointer group border-b-[20px] border-black relative overflow-hidden active:scale-95 shadow-2xl">
                  <div className="absolute top-8 right-8 flex gap-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={(e) => handleOpenEdit(e, v)} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center text-white/80 border border-white/10"><Edit3 size={18} /></button>
                    <button onClick={(e) => handleDeleteNode(e, v.id, 'ONLINE')} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center text-rose-400 border border-rose-900/50"><Trash2 size={18} /></button>
                  </div>
                  <div className="relative z-10 space-y-12">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-3xl rounded-3xl flex items-center justify-center text-rose-400 shadow-2xl border border-white/20 group-hover:rotate-12 transition-transform duration-500">
                      <Monitor size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-3xl font-black text-white uppercase tracking-tighter leading-[0.9] group-hover:text-rose-400 transition-colors">{v.title}</h4>
                      <p className="text-sm font-black text-rose-300 uppercase tracking-widest">{v.platform}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-12 relative z-10">
                    <span className="text-[12px] font-black text-white uppercase tracking-[0.4em]">JOIN DIGITAL NODE</span>
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white shadow-lg group-hover:translate-x-4 transition-transform border border-white/20">
                      <ArrowRight size={28} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => { setEditingNode(null); setProvisionType('PHYSICAL'); setIsCreateClassModalOpen(true); }} 
                className="aspect-[4/5] bg-white border-4 border-dashed border-slate-200 rounded-[5rem] flex flex-col items-center justify-center gap-10 text-slate-300 hover:text-[#3d0413] hover:border-[#3d0413] hover:bg-[#3d0413]/5 transition-all duration-700 group active:scale-95 shadow-sm"
              >
                <div className="w-32 h-32 rounded-full border-4 border-dashed border-current flex items-center justify-center group-hover:scale-125 group-hover:border-solid transition-all">
                  <Plus size={80} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                </div>
                <span className="text-[14px] font-black uppercase tracking-[0.6em] block">ADD NEW CLASS</span>
              </button>
            </div>
          </div>
        )}

        {currentView === 'PHYSICAL_CLASS_DETAIL' && selectedPhysicalClass && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-700 space-y-12 pb-20 relative z-10">
            <header className="bg-white p-14 rounded-[4.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-10">
                <button onClick={() => { setCurrentView('HOME'); setSelectedPhysicalClass(null); }} className="p-6 bg-slate-50 text-slate-400 hover:text-[#3d0413] rounded-3xl transition-all shadow-sm"><ArrowLeft size={32} strokeWidth={3} /></button>
                <div>
                  <h2 className="text-6xl font-black text-slate-900 uppercase tracking-tight leading-none">{selectedPhysicalClass.title}</h2>
                  <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] mt-5 flex items-center gap-4"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>{selectedPhysicalClass.department} • {selectedPhysicalClass.code}</p>
                </div>
              </div>
              <div className="flex gap-2 bg-slate-50 p-3 rounded-[2.5rem] border border-slate-100 shadow-inner">
                {['REGISTER', 'TIME TABLE', 'STUDENTS', 'MATERIALS'].map(tab => (
                  <button key={tab} onClick={() => setActiveClassTab(tab as ClassTab)} className={`px-10 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeClassTab === tab ? 'bg-[#3d0413] text-white shadow-2xl' : 'text-slate-400 hover:text-slate-800'}`}>{tab}</button>
                ))}
              </div>
            </header>
            <div className="min-h-[500px]">
              {activeClassTab === 'REGISTER' && renderRegister()}
              {activeClassTab === 'TIME TABLE' && renderTimetable()}
              {activeClassTab === 'STUDENTS' && renderStudents()}
              {activeClassTab === 'MATERIALS' && renderMaterials()}
            </div>
          </div>
        )}
        {currentView === 'ONLINE_CLASS_DETAIL' && selectedOnlineClass && renderOnlineClassDetail()}
      </div>

      {/* CREATE / EDIT CLASS MODAL */}
      {isCreateClassModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8">
           <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => { setIsCreateClassModalOpen(false); setEditingNode(null); }}></div>
           <div className="relative w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in">
              <div className="bg-[#3d0413] p-14 flex justify-between items-center text-white">
                <h3 className="text-5xl font-black uppercase tracking-tighter leading-none">{editingNode ? 'Edit Node' : 'Provision Node'}</h3>
                <button onClick={() => { setIsCreateClassModalOpen(false); setEditingNode(null); }} className="p-5 bg-white/10 rounded-[1.5rem] hover:bg-white/20 transition-all"><X size={36}/></button>
              </div>
              <div className="p-14">
                <form 
                  ref={classFormRef}
                  onSubmit={(e) => {
                   e.preventDefault();
                   const formData = new FormData(e.currentTarget as HTMLFormElement);
                   const type = provisionType;
                   const code = (formData.get('code') as string).toUpperCase();
                   const title = (formData.get('title') as string).toUpperCase();
                   const target = (formData.get('target') as string).toUpperCase();
                   
                   const submitter = (e.nativeEvent as any).submitter?.name;
                   const destinationTab = submitter === 'STUDENTS' ? 'STUDENTS' : submitter === 'TIMETABLE' ? 'TIME TABLE' : 'REGISTER';

                   let classToSelect: PhysicalClass | VirtualClass | null = null;

                   if (editingNode) {
                      if (type === 'PHYSICAL') {
                        setPhysicalClasses(prev => prev.map(c => {
                          if (c.id === editingNode.id) {
                            const updated = { ...c, code, title, room: target, type: 'PHYSICAL' as const };
                            classToSelect = updated;
                            syncToGlobalRegistry(updated);
                            return updated;
                          }
                          return c;
                        }));
                      } else {
                        setVirtualClasses(prev => prev.map(c => {
                          if (c.id === editingNode.id) {
                            const updated = { ...c, code, title, platform: target, type: 'ONLINE' as const };
                            classToSelect = updated;
                            syncToGlobalRegistry(updated);
                            return updated;
                          }
                          return c;
                        }));
                      }
                      showToast("Academic Node Synchronized");
                   } else {
                      let newNode: any;
                      if (type === 'PHYSICAL') {
                        newNode = { id: `p-${Date.now()}`, code, title, room: target, studentCount: 0, type: 'PHYSICAL' as const, department: user.department || 'General', credits: 3, staff: user.name, schedule: [] };
                        setPhysicalClasses(prev => [...prev, newNode]);
                        classToSelect = newNode;
                        syncToGlobalRegistry(newNode);
                      } else {
                        newNode = { id: `v-${Date.now()}`, code, title, platform: target, students: 0, link: '#', type: 'ONLINE' as const, startTime: '12:00 PM' };
                        setVirtualClasses(prev => [...prev, newNode]);
                        classToSelect = newNode;
                        syncToGlobalRegistry(newNode);
                      }
                      showToast("Academic Node Provisioned");
                   }

                   if (submitter === 'STUDENTS' || submitter === 'TIMETABLE') {
                      if (type === 'PHYSICAL' && classToSelect) {
                        setSelectedPhysicalClass(classToSelect as PhysicalClass);
                        setCurrentView('PHYSICAL_CLASS_DETAIL');
                        setActiveClassTab(destinationTab as ClassTab);
                      } else if (type === 'ONLINE' && classToSelect) {
                        setSelectedOnlineClass(classToSelect as VirtualClass);
                        setCurrentView('ONLINE_CLASS_DETAIL');
                      }
                   }
                   setIsCreateClassModalOpen(false);
                   setEditingNode(null);
                 }} className="space-y-10">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Node Protocol</label>
                      <div className="flex p-1.5 bg-slate-100 rounded-[1.8rem] border border-slate-200 shadow-inner">
                        <button type="button" onClick={() => setProvisionType('PHYSICAL')} className={`flex-1 py-4 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest transition-all ${provisionType === 'PHYSICAL' ? 'bg-white text-[#3d0413] shadow-md' : 'text-slate-400'}`}>Physical Classroom</button>
                        <button type="button" onClick={() => setProvisionType('ONLINE')} className={`flex-1 py-4 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest transition-all ${provisionType === 'ONLINE' ? 'bg-[#3d0413] text-white shadow-lg' : 'text-slate-400'}`}>Online Class</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Unit Code</label><input name="code" defaultValue={editingNode?.code} required type="text" placeholder="EE-402" className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none focus:ring-4 focus:ring-[#3d0413]/5" /></div>
                        <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">{provisionType === 'PHYSICAL' ? 'Venue' : 'Platform'}</label><input name="target" defaultValue={(editingNode as any)?.room || (editingNode as any)?.platform} required type="text" placeholder={provisionType === 'PHYSICAL' ? "Power Lab 2" : "MS Teams"} className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none focus:ring-4 focus:ring-[#3d0413]/5" /></div>
                    </div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Unit Title</label><input name="title" defaultValue={editingNode?.title} required type="text" placeholder="Advanced Power Systems" className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none focus:ring-4 focus:ring-[#3d0413]/5" /></div>
                    <div className="grid grid-cols-2 gap-6">
                      <button type="submit" name="STUDENTS" className="py-6 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-3"><UserPlus size={16} /> Add Student</button>
                      <button type="submit" name="TIMETABLE" className="py-6 bg-amber-50 text-amber-700 border border-amber-100 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-amber-100 transition-all flex items-center justify-center gap-3"><Clock size={16} /> Add Time Table</button>
                    </div>
                    <button type="submit" className="w-full py-7 bg-[#3d0413] text-white rounded-[2.5rem] font-black uppercase text-sm shadow-2xl active:scale-95 border-b-8 border-black transition-all hover:bg-black">{editingNode ? 'Authorize Changes' : 'Authorize Provisioning'}</button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* SESSION MODAL */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-8">
           <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => { setIsSessionModalOpen(false); setEditingSession(null); }}></div>
           <div className="relative w-full max-w-xl bg-white rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in">
              <div className="bg-[#3d0413] p-12 flex justify-between items-center text-white">
                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">{editingSession ? 'Re-edit Session' : 'Add Session'}</h3>
                <button onClick={() => { setIsSessionModalOpen(false); setEditingSession(null); }} className="p-4 bg-white/10 rounded-[1.5rem] hover:bg-white/20 transition-all"><X size={32}/></button>
              </div>
              <div className="p-12">
                <form onSubmit={(e) => {
                   e.preventDefault();
                   if (!selectedPhysicalClass) return;
                   const formData = new FormData(e.currentTarget as HTMLFormElement);
                   const sessionData: ScheduleSession = {
                      id: editingSession?.id || `s-${Date.now()}`,
                      day: formData.get('day') as string,
                      time: formData.get('time') as string,
                      venue: (formData.get('venue') as string).toUpperCase(),
                      type: formData.get('type') as 'LECTURE' | 'PRACTICAL' | 'SEMINAR',
                   };
                   const updatedSchedule = editingSession 
                      ? selectedPhysicalClass.schedule.map(s => s.id === editingSession.id ? sessionData : s)
                      : [...selectedPhysicalClass.schedule, sessionData];
                   const updatedClass = { ...selectedPhysicalClass, schedule: updatedSchedule };
                   setPhysicalClasses(prev => prev.map(c => c.id === selectedPhysicalClass.id ? updatedClass : c));
                   setSelectedPhysicalClass(updatedClass);
                   showToast(editingSession ? "Session Synchronized" : "Session Provisioned");
                   setIsSessionModalOpen(false);
                   setEditingSession(null);
                 }} className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Weekday</label>
                           <select name="day" defaultValue={editingSession?.day || 'MONDAY'} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none appearance-none cursor-pointer">
                              {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(d => <option key={d} value={d}>{d}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Type</label>
                           <select name="type" defaultValue={editingSession?.type || 'LECTURE'} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none appearance-none cursor-pointer">
                              <option value="LECTURE">LECTURE</option>
                              <option value="PRACTICAL">PRACTICAL</option>
                              <option value="SEMINAR">SEMINAR</option>
                           </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Time</label>
                       <input name="time" defaultValue={editingSession?.time} required type="text" placeholder="08:00 AM - 11:00 AM" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] px-3">Venue</label>
                       <input name="venue" defaultValue={editingSession?.venue} required type="text" placeholder="POWER LAB 2" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none" />
                    </div>
                    <button type="submit" className="w-full py-6 bg-[#3d0413] text-white rounded-[2rem] font-black uppercase text-sm shadow-2xl active:scale-95 border-b-6 border-black">
                       {editingSession ? 'Authorize Session Change' : 'Provision Session Node'}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboardHome;