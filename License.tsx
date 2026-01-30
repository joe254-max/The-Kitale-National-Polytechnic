import React from 'react';
import { ShieldCheck, Scale, FileText, Info } from 'lucide-react';

const InstitutionLicense: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] border border-slate-200 shadow-2xl mt-10">
      <header className="flex items-center gap-6 mb-12 border-b border-slate-100 pb-8">
        <div className="w-16 h-16 bg-[#3d0413] rounded-2xl flex items-center justify-center text-white shadow-xl">
          <ShieldCheck size={36} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Institutional Software License</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mt-2">The Kitale National Polytechnic • Academic Hub Protocol</p>
        </div>
      </header>

      <section className="space-y-10">
        <div className="flex gap-6">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-[#3d0413] shrink-0"><Scale size={20} /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase mb-2">Usage Governance</h2>
            <p className="text-slate-600 leading-relaxed font-medium text-sm">
              This digital resource management system is exclusively licensed to authorized academic personnel and registered students of The Kitale National Polytechnic. Unauthorized extraction of proprietary academic data or redistribution of institutional assets is strictly prohibited under the Intellectual Property Governance Act.
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><FileText size={20} /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase mb-2">Asset Privacy & Integrity</h2>
            <p className="text-slate-600 leading-relaxed font-medium text-sm">
              Users are mandated to maintain the integrity of uploaded materials. The system employs automated node synchronization and audit logging to verify identity and access patterns. Academic dishonesty through system manipulation will result in immediate revocation of digital hub privileges.
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Info size={20} /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase mb-2">Limited Liability</h2>
            <p className="text-slate-600 leading-relaxed font-medium text-sm">
              The Digital Library Protocol is provided "as-is" for technical vocational advancement. The institution reserves the right to suspend node access for central registry synchronization and maintenance without prior notification to student nodes.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t border-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <span>© 2024 TKNP Hub Management</span>
        <span className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100">License Reference: HUB-V5-ALPHA</span>
      </footer>
    </div>
  );
};

export default InstitutionLicense;