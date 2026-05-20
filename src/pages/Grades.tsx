import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Group, UserProfile } from '../types';
import { Star, Save, Users, ChevronRight, Award, Trophy, Bookmark, Gift, Sparkles, CheckCircle, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GradesPage: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Two-tiered grading state: Standard grades (1-5) & Bonus grades (1-5)
  const [standardGrades, setStandardGrades] = useState<Record<string, number>>({});
  const [bonusGrades, setBonusGrades] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], setGroups);
    const unsubUsers = firestoreService.subscribeToDocuments<UserProfile>('users', [], setStudents);
    return () => {
      unsubGroups();
      unsubUsers();
    };
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupStudents = students.filter(s => selectedGroup?.studentIds.includes(s.uid));

  const handleStandardGradeChange = (studentId: string, stars: number) => {
    // If double clicking the same star, reset it to 0
    setStandardGrades(prev => ({
      ...prev,
      [studentId]: prev[studentId] === stars ? 0 : stars
    }));
  };

  const handleBonusGradeChange = (studentId: string, stars: number) => {
    // If double clicking the same star, reset it to 0
    setBonusGrades(prev => ({
      ...prev,
      [studentId]: prev[studentId] === stars ? 0 : stars
    }));
  };

  const saveGrades = async () => {
    setIsSaving(true);
    try {
      // Calculate list of students to update
      const studentIdsToUpdate = Array.from(new Set([
        ...Object.keys(standardGrades),
        ...Object.keys(bonusGrades)
      ]));

      for (const studentId of studentIdsToUpdate) {
        const student = students.find(s => s.uid === studentId);
        if (student) {
          const sStars = standardGrades[studentId] || 0;
          const bStars = bonusGrades[studentId] || 0;
          const totalEarnedToday = sStars + bStars;

          if (totalEarnedToday > 0) {
            const currentPoints = student.points || 0;
            const finalPoints = currentPoints + totalEarnedToday;

            await firestoreService.updateDocument('users', studentId, {
              points: finalPoints,
              updatedAt: new Date().toISOString()
            });

            // Send notification details
            await firestoreService.sendNotification(
              studentId, 
              'Yangi baholar qabul qilindi! ⭐️', 
              `${selectedGroup?.name} darsidan bugun ${sStars} ball faollik va +${bStars} ball bonus yutib oldingiz! Umumiy reyting balingiz: ${finalPoints} ball`, 
              'grade'
            );
          }
        }
      }

      setStandardGrades({});
      setBonusGrades({});
      alert("Baholar dars bo'yicha muvaffaqiyatli saqlandi va barcha talabalarga bildirishnomalar jo'natildi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const isStaff = profile?.role === 'director' || 
    ['ustoz', 'yoramchi ustoz', 'direktor o\'rin bosari', 'staff'].includes(profile?.role || '');

  if (!isStaff) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-12 rounded-3xl border border-[#E4E3E0] text-center max-w-2xl mx-auto space-y-4 shadow-sm">
          <GraduationCap size={48} className="text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold text-[#141414]">Talaba Baholar Tizimi</h1>
          <p className="text-[#8E9299] text-sm leading-relaxed">
            Sizning dars jarayonida to&#39;plagan ballaringiz, yulduzlaringiz va amaliy davomat penalty jarimalaringiz real-vaqt rejimida hisoblab chiqilib, <strong className="text-[#141414]">Reyting</strong> sahifasida unifikatsiyalangan balans shaklida aks etib boriladi.
          </p>
        </div>
      </div>
    );
  }

  // Count active graded inputs
  const changeCount = Object.keys(standardGrades).length + Object.keys(bonusGrades).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Talabalarni Baholash</h1>
          <p className="text-[#8E9299] text-xs mt-1">Dars oxirida har bir o&#39;quvchiga standart dars faolligi va qo&#39;shimcha yutuqlar uchun ballar yozish</p>
        </div>

        {selectedGroupId && changeCount > 0 && (
          <button 
            onClick={saveGrades}
            disabled={isSaving}
            className="bg-[#141414] text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 shadow-md"
          >
            <Save size={16} />
            {isSaving ? 'Saqlanmoqda...' : `Barcha ${changeCount} ta bahoni saqlash`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: Choose Group */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] px-2 font-mono">Faol Guruhlar</h3>
          <div className="space-y-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setStandardGrades({});
                  setBonusGrades({});
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  selectedGroupId === g.id 
                    ? 'bg-[#141414] text-white border-[#141414] shadow-lg translate-x-1.5' 
                    : 'bg-white text-[#141414] border-[#E4E3E0] hover:bg-[#F5F5F7] hover:translate-x-1'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={16} className={selectedGroupId === g.id ? 'text-yellow-400' : 'text-[#8E9299]'} />
                  <span className="font-extrabold text-xs text-left truncate max-w-[140px]">{g.name}</span>
                </div>
                <ChevronRight size={14} className="opacity-60" />
              </button>
            ))}

            {groups.length === 0 && (
              <p className="text-xs text-neutral-400 italic p-3 text-center">Mavjud guruhlar topilmadi.</p>
            )}
          </div>
        </div>

        {/* Right column: Roster and Grading matrix */}
        <div className="lg:col-span-3">
          {selectedGroup ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-[#E4E3E0] overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-[#F5F5F7] flex flex-wrap items-center justify-between bg-[#F5F5F7]/30 gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-[#141414] text-white rounded-xl font-bold text-xs font-mono">
                    {groupStudents.length}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#141414]">{selectedGroup.name} O&#39;quvchilari</h3>
                    <p className="text-[10px] text-[#8E9299]">Reyting ballarini kiritish uchun yulduzchalarni bosing</p>
                  </div>
                </div>

                <div className="flex gap-4 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star size={14} className="fill-current" /> Standart (Harakat)
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-600">
                    <Star size={14} className="fill-current" /> Bonus (Qo&#39;shimcha)
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#F5F5F7]">
                {groupStudents.sort((a, b) => (b.points || 0) - (a.points || 0)).map((student, index) => {
                  const sGrade = standardGrades[student.uid] || 0;
                  const bGrade = bonusGrades[student.uid] || 0;
                  const totalGraded = sGrade + bGrade;

                  return (
                    <div 
                      key={student.uid} 
                      className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F5F5F7]/20 transition-all ${
                        index < 3 ? 'bg-amber-50/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          index === 0 ? 'bg-yellow-400 text-white shadow-sm' : 
                          index === 1 ? 'bg-slate-300 text-white' : 
                          index === 2 ? 'bg-orange-400 text-white' : 
                          'bg-[#F2F1EC] text-[#8E9299]'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#141414] text-sm flex items-center gap-1.5">
                            {student.fullName}
                            {index === 0 && (
                              <span className="text-[9px] bg-yellow-400 text-white px-1.5 py-0.5 rounded-full uppercase font-mono tracking-tighter">Top Lider</span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#8E9299] font-mono">Umumiy reyting: <span className="font-bold text-[#141414]">{student.points || 0} Ball</span></p>
                        </div>
                      </div>

                      {/* Grading Star Controllers */}
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Standard Activity Stars: 1-5 */}
                        <div className="space-y-1">
                          <span className="block text-[8px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">Darsdagi Faollik (Max 5)</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => handleStandardGradeChange(student.uid, star)}
                                className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all text-amber-400"
                                title={`Darsdagi faollik: ${star} ball`}
                              >
                                <Star 
                                  size={18} 
                                  fill={sGrade >= star ? 'currentColor' : 'none'} 
                                  className={sGrade >= star ? 'text-amber-400' : 'text-neutral-200'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Extra Bonus Stars: 1-5 */}
                        <div className="space-y-1">
                          <span className="block text-[8px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">Bonus / Uy ishi (Max 5)</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => handleBonusGradeChange(student.uid, star)}
                                className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all text-purple-600"
                                title={`Qo'shimcha mukofot: ${star} ball`}
                              >
                                <Star 
                                  size={18} 
                                  fill={bGrade >= star ? 'currentColor' : 'none'} 
                                  className={bGrade >= star ? 'text-purple-600' : 'text-neutral-200'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Session Total live Indicator */}
                        {totalGraded > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1 animate-bounce">
                            <Sparkles size={12} />
                            +{totalGraded} ball
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {groupStudents.length === 0 && (
                  <p className="p-12 italic text-[#8E9299] text-xs text-center font-mono">Ushbu guruh guruh tarkibida o&#39;quvchilar aniqlanmadi.</p>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-dashed border-[#E4E3E0] p-16 text-center space-y-4 shadow-sm">
              <Users className="mx-auto text-[#8E9299]" size={40} />
              <h4 className="text-base font-bold text-[#141414]">Guruhni tanlang</h4>
              <p className="text-xs text-[#8E9299] max-w-xs mx-auto leading-relaxed">Sinf o&#39;quvchilariga ballar tarqatishni boshlash uchun chap tarafdan guruhlardan birini tanlang.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradesPage;
