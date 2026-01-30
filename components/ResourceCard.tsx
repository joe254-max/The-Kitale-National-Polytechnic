import React, { useState } from 'react';
import { Resource, ResourceType } from '../types';
import { Volume2, Loader2, Play } from 'lucide-react';
import { synthesizeSpeech } from '../geminiService';

interface ResourceCardProps {
  resource: Resource;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleListen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      const source = await synthesizeSpeech(resource.description);
      if (source) {
        source.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error(err);
      setIsSpeaking(false);
    }
  };

  const getTypeColor = (type: ResourceType) => {
    switch (type) {
      case ResourceType.LECTURE_NOTE: return 'bg-rose-100 text-rose-950';
      case ResourceType.PAST_PAPER: return 'bg-orange-100 text-orange-800';
      case ResourceType.EBOOK: return 'bg-purple-100 text-purple-800';
      case ResourceType.TECHNICAL_MANUAL: return 'bg-emerald-100 text-emerald-800';
      case ResourceType.RESEARCH_PAPER: return 'bg-slate-900 text-white';
      case ResourceType.VIDEO: return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img 
          src={resource.thumbnailUrl} 
          alt={resource.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md ${getTypeColor(resource.type)}`}>
            {resource.type.replace('_', ' ')}
          </span>
        </div>
        
        {/* Listen Button Overlay */}
        <button 
          onClick={handleListen}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-xl rounded-xl flex items-center justify-center text-[#3d0413] shadow-lg active:scale-90 transition-all opacity-0 group-hover:opacity-100"
          title="Listen to summary"
        >
          {isSpeaking ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
        </button>

        {resource.type === ResourceType.VIDEO && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-rose-950 shadow-xl group-hover:scale-110 transition-transform">
                <Play size={20} className="ml-1" fill="currentColor" />
              </div>
           </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-black text-slate-900 line-clamp-1 group-hover:text-rose-950 transition leading-none">
            {resource.title}
          </h3>
          <span className="flex items-center text-amber-500 text-xs font-black gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
            ★ {resource.rating}
          </span>
        </div>
        
        <p className="text-xs text-slate-500 mb-6 line-clamp-2 h-8 font-medium leading-relaxed">
          {resource.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100">
            {resource.unitCode}
          </span>
          <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100">
            {resource.department}
          </span>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{resource.downloads} Hits</span>
          </div>
          <button className="text-rose-950 hover:text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1 group/btn">
            Access
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover/btn:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
