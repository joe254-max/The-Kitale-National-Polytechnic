
import React, { useState } from 'react';

interface HeroProps {
  onSearch: (q: string) => void;
  onBrowse: () => void;
}

const Hero: React.FC<HeroProps> = ({ onSearch, onBrowse }) => {
  const [val, setVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(val);
    onBrowse();
  };

  return (
    <div className="relative bg-slate-950 rounded-[3rem] overflow-hidden p-8 md:p-24 text-center text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)]">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-rose-950 rounded-full blur-[160px] -ml-40 -mt-40 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-950 rounded-full blur-[160px] -mr-40 -mb-40"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-300">Institutional Digital Hub</span>
        </div>
        <h1 className="text-4xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tighter">
          Elevate Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-red-600">
            Technical Future
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          The ultimate repository of lecture notes, past exams, and technical manuals specifically curated for the polytechnic community.
        </p>

        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto group">
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Search resources, unit codes, or authors..."
            className="w-full pl-8 pr-40 py-6 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-4 focus:ring-rose-950/30 transition shadow-2xl font-medium"
          />
          <button 
            type="submit"
            className="absolute right-3 top-3 bottom-3 px-10 bg-rose-950 hover:bg-black rounded-xl text-xs font-black tracking-[0.2em] uppercase transition shadow-xl active:scale-95 border border-white/10"
          >
            Explore
          </button>
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
          <span className="text-slate-600">Trending Search:</span>
          <button onClick={() => { setVal('ICT-201'); onSearch('ICT-201'); onBrowse(); }} className="hover:text-rose-500 transition">#ICT-201</button>
          <button onClick={() => { setVal('EE-302'); onSearch('EE-302'); onBrowse(); }} className="hover:text-rose-500 transition">#EE-302</button>
          <button onClick={() => { setVal('Past Papers'); onSearch('Past Papers'); onBrowse(); }} className="hover:text-rose-500 transition">#Exams</button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
