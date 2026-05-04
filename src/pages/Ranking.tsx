import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';
import { Trophy, Medal, Award, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

const RankingPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsub = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
      // Filter students and sort by points
      const students = data.filter(u => ['student', 'o\'quvchi', 'shogirt', 'user'].includes(u.role));
      setUsers(students.sort((a, b) => (b.points || 0) - (a.points || 0)));
    });
    return () => unsub();
  }, []);

  const getRankStyle = (index: number) => {
    switch(index) {
      case 0: return "bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-200 ring-2 ring-yellow-400";
      case 1: return "bg-gradient-to-br from-slate-100 to-slate-50 border-slate-200 ring-2 ring-slate-300";
      case 2: return "bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200 ring-2 ring-orange-300";
      default: return "bg-white border-[#E4E3E0]";
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-full text-xs font-bold tracking-widest uppercase mb-4">
          <Trophy size={14} className="text-yellow-400" />
          Top Talabalar
        </div>
        <h1 className="text-5xl font-bold text-[#141414] tracking-tight">IT Park JizPI Reytingi</h1>
        <p className="text-[#8E9299] max-w-xl mx-auto">Bilim va mahorat borasidagi musobaqamiz peshqadamlari. Faolroq boʻling va yuqoriga koʻtariling!</p>
      </div>

      <div className="relative pt-20 flex flex-col md:flex-row items-end justify-center gap-4 md:gap-0">
        {/* Silver - 2nd */}
        {users[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="w-full md:w-64 bg-white border border-[#E4E3E0] rounded-[2.5rem] p-8 pb-10 flex flex-col items-center text-center relative z-10 md:-mr-4"
          >
            <div className="absolute -top-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                 <UserCircle size={60} className="text-slate-400" />
              </div>
              <div className="bg-slate-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm absolute -bottom-2 border-2 border-white">2</div>
            </div>
            <h3 className="font-bold text-[#141414] mt-4 mb-1">{users[1].fullName}</h3>
            <p className="text-xs text-[#8E9299] mb-4 uppercase tracking-widest font-mono">{users[1].major || 'Talaba'}</p>
            <div className="text-2xl font-black text-[#141414]">{users[1].points || 0} <span className="text-[10px] font-mono text-[#8E9299] uppercase">Ball</span></div>
          </motion.div>
        )}

        {/* Gold - 1st */}
        {users[0] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full md:w-80 bg-[#141414] text-white rounded-[3rem] p-10 pb-16 flex flex-col items-center text-center relative z-20 shadow-2xl md:z-20"
          >
            <div className="absolute -top-14 flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden ring-4 ring-[#141414]">
                 <UserCircle size={80} className="text-white" />
              </div>
              <div className="bg-yellow-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg absolute -bottom-4 border-2 border-[#141414]">1</div>
            </div>
            <Trophy className="text-yellow-400 mt-8 mb-4 animate-bounce" size={40} />
            <h3 className="font-black text-2xl mb-1">{users[0].fullName}</h3>
            <p className="text-xs text-white/50 mb-6 uppercase tracking-widest font-mono">{users[0].major || 'Top Talaba'}</p>
            <div className="text-4xl font-black">{users[0].points || 0} <span className="text-sm font-mono text-white/40 uppercase">Ball</span></div>
            <div className="mt-8 px-6 py-2 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-white/10">Absolyut Peshqadam</div>
          </motion.div>
        )}

        {/* Bronze - 3rd */}
        {users[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="w-full md:w-64 bg-white border border-[#E4E3E0] rounded-[2.5rem] p-8 pb-10 flex flex-col items-center text-center relative z-10 md:-ml-4"
          >
            <div className="absolute -top-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                 <UserCircle size={60} className="text-orange-900/40" />
              </div>
              <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm absolute -bottom-2 border-2 border-white">3</div>
            </div>
            <h3 className="font-bold text-[#141414] mt-4 mb-1">{users[2].fullName}</h3>
            <p className="text-xs text-[#8E9299] mb-4 uppercase tracking-widest font-mono">{users[2].major || 'Talaba'}</p>
            <div className="text-2xl font-black text-[#141414]">{users[2].points || 0} <span className="text-[10px] font-mono text-[#8E9299] uppercase">Ball</span></div>
          </motion.div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[#E4E3E0] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-[#F5F5F7]">
          <h3 className="text-sm font-bold text-[#141414] uppercase tracking-widest">Boshqa barcha talabalar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-[#F5F5F7]">
              {users.slice(3).map((u, i) => (
                <tr key={u.uid} className="group hover:bg-[#F5F5F7]/50 transition-all">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-black text-[#8E9299] w-4">{i + 4}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] group-hover:bg-white transition-all flex items-center justify-center text-[#141414] font-bold">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-[#141414] block">{u.fullName}</span>
                          <span className="text-[10px] text-[#8E9299] uppercase tracking-widest font-mono">{u.major || 'Talaba'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <span className="text-lg font-black text-[#141414]">{u.points || 0}</span>
                       <span className="text-[10px] font-mono text-[#8E9299] uppercase">Ball</span>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length <= 3 && (
                <tr>
                  <td colSpan={2} className="px-10 py-20 text-center text-[#8E9299] italic">Hozircha reytingda boshqa talabalar yoʻq</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RankingPage;
