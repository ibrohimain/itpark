import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile, UserRole, Attendance } from '../types';
import { User, Shield, UserCircle, Search, Trash2, X, MessageSquare, Briefcase, Calendar, Award, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
};

const UsersPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Allow director and teachers
  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
  const isTeacher = ['ustoz', 'yoramchi ustoz', 'staff'].includes(profile?.role || '');
  const canAccess = isDirector || isTeacher;

  useEffect(() => {
    if (canAccess) {
      const unsub = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
        setUsers(data);
      });
      const unsubAtts = firestoreService.subscribeToDocuments<Attendance>('attendance', [], setAttendances);
      return () => {
        unsub();
        unsubAtts();
      };
    }
  }, [canAccess]);

  const updateRole = async (userId: string, newRole: UserRole) => {
    if (!isDirector) return;
    if (window.confirm(`Foydalanuvchi mavqeyini ${newRole} ga oʻzgartirmoqchimisiz?`)) {
      await firestoreService.updateDocument('users', userId, { role: newRole, updatedAt: new Date().toISOString() });
      if (selectedUser?.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    }
  };

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (!isDirector) return;
    if (window.confirm(`${fullName} foydalanuvchisini butunlay oʻchirib tashlamoqchimisiz?`)) {
      try {
        await firestoreService.deleteDocument('users', userId);
        setSelectedUser(null);
      } catch (err) {
        console.error(err);
        alert("Foydalanuvchini o'chirishda xatolik yuz berda.");
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role && u.role.toLowerCase().includes(search.toLowerCase()))
  );

  if (!canAccess) {
    return <div className="text-center p-20 font-bold text-[#8E9299]">Ushbu bo&#39;limga kirishga ruxsatingiz yo&#39;q.</div>;
  }

  // Calculate detailed statistics for active modal user
  const getSelectedUserStats = (user: UserProfile) => {
    const userAtts = attendances.filter(a => a.studentId === user.uid);
    const penaltyAtts = userAtts.filter(a => a.date >= '2026-05-21');
    const penaltyAbsents = penaltyAtts.filter(a => a.status === 'absent').length;
    const penaltyLates = penaltyAtts.filter(a => a.status === 'late').length;

    const absents = userAtts.filter(a => a.status === 'absent').length;
    const lates = userAtts.filter(a => a.status === 'late').length;

    const deductionPoints = (penaltyAbsents * 5) + (penaltyLates * 3);
    const earnedPoints = user.points || 0;
    const netPoints = Math.max(0, earnedPoints - deductionPoints);
    const cashValue = netPoints * 20;

    return {
      absents,
      lates,
      penaltyAbsents,
      penaltyLates,
      deductionPoints,
      earnedPoints,
      netPoints,
      cashValue
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Guruh A&#39;zolari & Foydalanuvchilar</h1>
          <p className="text-[#8E9299] text-sm mt-1">Guruh a&#39;zolarining shaxsiy anketalarini o&#39;rganish va boshqaruv taxtasi</p>
        </div>

        <div className="relative group max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299] group-focus-within:text-[#141414]" size={18} />
          <input
            type="text"
            placeholder="Qidiruv (ism, rol, email)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-[#E4E3E0] rounded-2xl text-sm focus:ring-1 focus:ring-[#141414] transition-all focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#E4E3E0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
              <tr>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Foydalanuvchi Ismi</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Email</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Asosiy mavqei</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-right">Reyting ball</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E3E0]">
              {filteredUsers.map((u, i) => (
                <motion.tr 
                  key={u.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  onClick={() => setSelectedUser(u)}
                  className="hover:bg-[#F5F5F7]/40 transition-colors cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                        {u.fullName.charAt(0)}
                      </div>
                      <span className="font-extrabold text-[#141414] text-sm">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-[#8E9299] font-mono">{u.email}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      u.role === 'director' ? 'bg-[#141414] text-white' : 
                      ['ustoz', 'staff'].includes(u.role) ? 'bg-blue-100 text-blue-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-black font-mono text-sm text-neutral-800">
                    {u.points || 0} Ball
                  </td>
                </motion.tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-16 text-center text-[#8E9299] italic">
                    Hech kim topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Detail Drawer/Modal */}
      <AnimatePresence>
        {selectedUser && (() => {
          const stats = getSelectedUserStats(selectedUser);
          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col p-8 border-l border-[#E4E3E0] relative"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-6 right-6 p-2 text-[#8E9299] hover:text-[#141414] hover:bg-[#F5F5F7] rounded-xl transition-all"
                >
                  <X size={20} />
                </button>

                {/* Profile Header */}
                <div className="space-y-6 pt-4 flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#141414] text-white rounded-[1.25rem] flex items-center justify-center font-black text-xl">
                      {selectedUser.fullName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#141414]">{selectedUser.fullName}</h2>
                      <p className="text-xs text-[#8E9299] font-mono mt-0.5">{selectedUser.email}</p>
                    </div>
                  </div>

                  {/* Profile properties */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F5F5F7] p-3 rounded-2xl border border-neutral-100 text-xs">
                      <span className="text-[#8E9299] font-mono block">Tug&#39;ilgan yili:</span>
                      <span className="font-extrabold text-[#141414] mt-1 block">
                        {selectedUser.birthYear ? `${selectedUser.birthYear} yil` : 'Kiritilmagan'}
                      </span>
                    </div>

                    <div className="bg-[#F5F5F7] p-3 rounded-2xl border border-neutral-100 text-xs">
                      <span className="text-[#8E9299] font-mono block">Yoshi:</span>
                      <span className="font-extrabold text-[#141414] mt-1 block">
                        {selectedUser.age ? `${selectedUser.age} yosh` : 'Kiritilmagan'}
                      </span>
                    </div>
                  </div>

                  {/* User BIO */}
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-xs">
                    <span className="text-[#8E9299] font-mono block mb-1">Mening bio ma&#39;lumotlarim:</span>
                    <p className="font-medium text-[#141414] leading-relaxed italic">
                      {selectedUser.bio || 'Foydalanuvchi hali biografiya maʼlumotlarini kiritmagan.'}
                    </p>
                  </div>

                  {/* Balance / Financial conversion details */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-xs space-y-2">
                    <span className="text-emerald-800 font-extrabold uppercase tracking-wider block font-mono">Reyting & Mukofot Balansi</span>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#8E9299]">To&#39;plangan dars yulduzlari:</span>
                      <span className="font-bold text-[#141414]">{stats.earnedPoints} ⭐️</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-red-600">
                      <span>Kelmagan darslar penalty (-5):</span>
                      <span className="font-bold">-{stats.penaltyAbsents * 5} 🔻 ({stats.penaltyAbsents} mart)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-orange-600">
                      <span>Kech qolish penalty (-3):</span>
                      <span className="font-bold">-{stats.penaltyLates * 3} 🔻 ({stats.penaltyLates} mart)</span>
                    </div>
                    <div className="text-[9px] text-stone-400 font-mono text-right pb-1">
                      (Jarima ballari 21.05.2026 yildan boshlab ayiriladi)
                    </div>
                    <hr className="border-emerald-100/60" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neural-700 text-xs">Ushbu foydalanuvchi Net balli:</span>
                      <span className="font-black text-slate-800 text-sm font-mono">{stats.netPoints} ball</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-emerald-200">
                      <span className="font-bold text-emerald-800">Rag&#39;bat mukofoti (20 UZS/ball):</span>
                      <span className="font-black text-emerald-700 bg-white border border-emerald-100 px-3 py-1 rounded-xl text-sm font-mono">
                        {formatCurrency(stats.cashValue)}
                      </span>
                    </div>
                  </div>

                  {/* User statuses stream */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-extrabold text-[#141414] text-xs flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-orange-500" />
                      Kunlik Yangi Statuslar
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedUser.statuses && selectedUser.statuses.length > 0 ? (
                        selectedUser.statuses.map((entry) => (
                          <div key={entry.id} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs space-y-1">
                            <p className="text-stone-700 leading-relaxed font-medium">{entry.text}</p>
                            <span className="text-[9px] text-[#8E9299] font-mono block">
                              {new Date(entry.createdAt).toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs italic text-[#8E9299] py-3 text-center bg-neutral-50/50 rounded-xl">Foydalanuvchi biron status yozmagan</p>
                      )}
                    </div>
                  </div>

                  {/* Director Role Changer block */}
                  {isDirector && (
                    <div className="border-t border-[#E4E3E0] pt-6 space-y-3">
                      <label className="block text-[10px] font-mono font-black uppercase text-[#8E9299]">Direktor Huquqlari: Rol O&#39;zgartirish</label>
                      <div className="flex gap-2">
                        <select 
                          value={selectedUser.role}
                          onChange={(e) => updateRole(selectedUser.uid, e.target.value as UserRole)}
                          disabled={selectedUser.email === 'direktor@gmail.com'}
                          className="flex-1 bg-[#F5F5F7] text-xs font-bold border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-[#141414] disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="shogirt">Shogirt</option>
                          <option value="yoramchi ustoz">Yordamchi Ustoz</option>
                          <option value="o'quvchi">O'quvchi</option>
                          <option value="ustoz">Ustoz</option>
                          <option value="direktor o'rin bosari">Direktor o'rin bosari</option>
                          <option value="dasturchi">Dasturchi</option>
                          <option value="mobilograf">Mobilograf</option>
                          <option value="backent">Backend</option>
                          <option value="frontend">Frontend</option>
                          <option value="dizayner">Dizayner</option>
                          <option value="xodim III darajali">Xodim III darajali</option>
                          <option value="xodim II darajali">Xodim II darajali</option>
                          <option value="xodim I darajali">Xodim I darajali</option>
                          <option value="director">Director</option>
                          <option value="staff">Staff</option>
                          <option value="student">Student</option>
                        </select>
                        {selectedUser.email !== 'direktor@gmail.com' && selectedUser.uid !== profile?.uid && (
                          <button
                            onClick={() => handleDeleteUser(selectedUser.uid, selectedUser.fullName)}
                            className="p-3 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition"
                            title="Xisobni butunlay o'chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
