import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { DEPARTMENTS } from '../constants';
import { School, ShieldAlert, Fingerprint, Key, ArrowLeft, RefreshCw, CheckCircle2, Lock } from 'lucide-react';

// Define the missing LoginProps interface
interface LoginProps {
  onLogin: (user: User, remember: boolean) => void;
}

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" }
];

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=100&w=1600",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=100&w=1600",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=100&w=1600",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=100&w=1600",
  "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=100&w=1600"
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | '2fa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0].name);
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Quote typing effect and background synchronization logic
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');

  // Pre-fill email if remembered
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('poly_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Preload images for swift appearance
  useEffect(() => {
    BACKGROUND_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let timeout: any;
    const fullText = QUOTES[currentQuoteIndex].text;

    if (phase === 'typing') {
      if (displayedText.length < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length + 1));
        }, 50);
      } else {
        setPhase('pausing');
      }
    } else if (phase === 'pausing') {
      timeout = setTimeout(() => {
        setPhase('deleting');
      }, 10000); // 10 SECOND PAUSE
    } else if (phase === 'deleting') {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 30);
      } else {
        setCurrentQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, phase, currentQuoteIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot-password') {
      setResetEmailSent(true);
      return;
    }

    if (mode === 'register') {
      // Handle "Remember Email" logic
      if (rememberMe) {
        localStorage.setItem('poly_remembered_email', email);
      } else {
        localStorage.removeItem('poly_remembered_email');
      }

      // Complete registration
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        name: name || 'Institutional User',
        email: email || 'user@polytechnic.ac.ke',
        role,
        department,
        admissionNo: role === UserRole.STUDENT ? idNumber : undefined
      }, rememberMe);
      return;
    }

    // Handle 'login' and '2fa' modes
    if (mode === 'login' || mode === '2fa') {
      // Bypass 2FA check if explicitly enabled but form is empty
      if (mode === 'login' && role !== UserRole.STUDENT && is2FAEnabled && password.length > 0) {
        setMode('2fa');
        return;
      }

      // Handle "Remember Email" logic
      if (rememberMe && email) {
        localStorage.setItem('poly_remembered_email', email);
      } else if (!rememberMe) {
        localStorage.removeItem('poly_remembered_email');
      }

      // Complete login with bypass capability (defaults if empty)
      const finalEmail = email || 'guest@polytechnic.ac.ke';
      const finalName = finalEmail.split('@')[0].charAt(0).toUpperCase() + finalEmail.split('@')[0].slice(1);

      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        name: finalName,
        email: finalEmail,
        role,
        department,
        admissionNo: role === UserRole.STUDENT ? (idNumber || '2024/GUEST/01') : undefined
      }, rememberMe);
    }
  };

  const toggleMode = (newMode: 'login' | 'register' | 'forgot-password' | '2fa') => {
    setMode(newMode);
    setResetEmailSent(false);
    setTwoFactorCode('');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      {/* Left Side: Professional Branding & Animated Quotes */}
      <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-rose-950">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#3d0413] z-0"></div>
          {BACKGROUND_IMAGES.map((img, idx) => (
            <img 
              key={img}
              src={img} 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out scale-105 animate-[subtle-zoom_60s_infinite_alternate] ${
                (currentQuoteIndex % BACKGROUND_IMAGES.length) === idx ? 'opacity-80' : 'opacity-0'
              }`} 
              loading="eager"
              alt={`Academic background ${idx + 1}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#3d0413]/85 via-[#3d0413]/30 to-[#3d0413]/60 z-10"></div>
          <div className="absolute inset-0 bg-[#3d0413]/10 mix-blend-multiply z-20"></div>
        </div>

        <div className="relative z-30 flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#3d0413] shadow-2xl shrink-0 group transition-transform hover:scale-110">
            <School size={32} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col text-white drop-shadow-lg">
            <span className="text-2xl font-black tracking-tight uppercase leading-none">
              The Kitale National
            </span>
            <span className="text-2xl font-black tracking-tight uppercase leading-none mt-1">
              Polytechnic
            </span>
          </div>
        </div>

        <div className="relative z-30 max-w-xl mb-12">
          <h2 className="text-6xl font-black mb-10 leading-tight text-white tracking-tighter drop-shadow-2xl">
            {mode === 'login' ? 'Access' : mode === 'register' ? 'Join' : mode === '2fa' ? 'Verify' : 'Recover'} <br /> 
            <span className="text-rose-400">
              The Kitale National Polytechnic
            </span>
          </h2>
          
          <div className="min-h-[160px] flex flex-col justify-start">
            <div className="bg-white/10 backdrop-blur-[12px] p-8 rounded-[2.5rem] border border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-1000 max-w-lg relative overflow-hidden group">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-colors duration-1000"></div>
              
              <p className="text-sm font-normal leading-relaxed text-white/95 mb-4 relative z-10">
                "{displayedText}<span className="animate-pulse inline-block w-1 h-3.5 bg-rose-400 ml-1 align-middle"></span>"
              </p>
              <div className={`transition-all duration-1000 relative z-10 ${phase === 'pausing' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                <div className="h-px w-6 bg-rose-400/40 mb-3"></div>
                <p className="text-rose-400 font-bold uppercase text-[9px] tracking-[0.4em]">
                   {QUOTES[currentQuoteIndex].author}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-30 flex gap-10 text-[10px] font-black text-white/80 uppercase tracking-[0.4em]">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-400 rounded-full"></div> Institutional</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-400 rounded-full"></div> Verified</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-400 rounded-full"></div> Secure</span>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex items-center justify-center p-8 md:p-24 bg-white overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {mode === 'forgot-password' && resetEmailSent ? (
            <div className="animate-in fade-in zoom-in duration-500 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Email Dispatched</h1>
              <p className="text-slate-500 mb-10 font-medium leading-relaxed">
                We've sent a secure reset link to <span className="text-rose-950 font-black">{email}</span>. Please check your inbox and follow the instructions.
              </p>
              <button
                onClick={() => toggleMode('login')}
                className="w-full py-5 bg-[#3d0413] hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-rose-950/20 transition active:scale-95 border-b-4 border-black"
              >
                Return to Login
              </button>
            </div>
          ) : mode === '2fa' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-4 mb-4">
                  <button 
                    onClick={() => toggleMode('login')}
                    className="p-2 -ml-2 text-slate-400 hover:text-rose-950 transition"
                  >
                    <ArrowLeft size={24} strokeWidth={2.5} />
                  </button>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">2FA Required</h1>
               </div>
               <p className="text-slate-500 mb-10 font-medium">
                Enhanced security is enabled for your profile. Please enter the 6-digit code from your authentication app.
              </p>

              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="space-y-1">
                    <div className="flex justify-between items-center px-1 mb-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authenticator Code</label>
                       <Fingerprint size={16} className="text-rose-950" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000 000"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-950/10 focus:border-rose-950 outline-none transition font-black text-3xl tracking-[0.4em] text-center"
                    />
                 </div>

                 <button
                  type="submit"
                  className="w-full py-5 bg-[#3d0413] hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-rose-950/20 transition active:scale-95 border-b-4 border-black"
                >
                  Verify Access
                </button>

                <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <RefreshCw size={12} />
                  Code not working? <button type="button" className="text-rose-950 font-black hover:underline">Sync Device</button>
                </p>
              </form>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {mode === 'login' ? 'Portal Access' : mode === 'register' ? 'Staff Registration' : 'Account Recovery'}
                </h1>
                {mode === 'forgot-password' && (
                  <button onClick={() => toggleMode('login')} className="p-2 text-slate-400 hover:text-rose-950 transition">
                    <ArrowLeft size={24} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <p className="text-slate-500 mb-10 font-medium">
                {mode === 'login' 
                  ? 'Identify yourself to enter the institutional node.' 
                  : mode === 'register' 
                  ? 'Set up your professional credentials for the polytechnic network.'
                  : 'Specify your email to retrieve access keys.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {mode !== 'forgot-password' && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => { setRole(UserRole.STUDENT); setIs2FAEnabled(false); }}
                      className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${role === UserRole.STUDENT ? 'bg-white text-[#3d0413] shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.LECTURER)}
                      className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${role === UserRole.LECTURER ? 'bg-white text-[#3d0413] shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Staff / Lec
                    </button>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Full Legal Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. John Smith"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-950/10 focus:border-rose-950 outline-none transition font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Institutional Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@polytechnic.ac.ke"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-950/10 focus:border-rose-950 outline-none transition font-medium"
                  />
                </div>

                {mode !== 'forgot-password' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Passphrase</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => toggleMode('forgot-password')} className="text-[10px] font-black text-[#3d0413] hover:underline tracking-widest uppercase">Lost Key?</button>
                      )}
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-950/10 focus:border-rose-950 outline-none transition font-medium"
                    />
                  </div>
                )}

                {/* Remember Me & 2FA Options */}
                {mode !== 'forgot-password' && (
                  <div className="space-y-4 pt-2">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition group">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-[#3d0413] focus:ring-rose-950" 
                      />
                      <div className="flex-1">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">
                          Remember Me
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest leading-none">Persistent Session Key</p>
                      </div>
                    </label>

                    {role !== UserRole.STUDENT && (
                      <label className="flex items-center gap-3 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl cursor-pointer hover:bg-rose-50 transition group">
                        <input 
                          type="checkbox" 
                          checked={is2FAEnabled}
                          onChange={(e) => setIs2FAEnabled(e.target.checked)}
                          className="w-5 h-5 rounded-lg border-rose-200 text-[#3d0413] focus:ring-rose-950" 
                        />
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-rose-950 uppercase tracking-widest leading-none flex items-center gap-2">
                            <ShieldAlert size={14} className="group-hover:animate-bounce" />
                            Two-Factor Authentication
                          </p>
                          <p className="text-[10px] text-rose-800 font-medium mt-1 opacity-60 italic">Enhanced protection for staff accounts</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-5 bg-[#3d0413] hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-rose-950/20 transition active:scale-95 border-b-4 border-black mt-4"
                >
                  {mode === 'login' ? 'Authorize Access' : mode === 'register' ? 'Initialize Profile' : 'Dispatch Recovery'}
                </button>
              </form>

              <div className="mt-12 text-center">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                  {mode === 'login' ? "Need institutional access?" : mode === 'register' ? "Already have a key?" : "Remembered credentials?"} {' '}
                  <button onClick={() => toggleMode(mode === 'register' ? 'login' : mode === 'forgot-password' ? 'login' : 'register')} className="text-[#3d0413] font-black hover:underline">
                    {mode === 'login' ? 'Register' : 'Login'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;