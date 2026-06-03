import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Group, UserProfile } from '../types';
import { Star, Save, Users, ChevronRight, Award, Trophy, Bookmark, Gift, Sparkles, CheckCircle, GraduationCap, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GradesPage: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Three-pronged grading states: Homework, Attendance/Participation, Q&A (each 0 - 5 stars)
  const [homeworkGrades, setHomeworkGrades] = useState<Record<string, number>>({});
  const [attendanceGrades, setAttendanceGrades] = useState<Record<string, number>>({});
  const [qaGrades, setQaGrades] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], setGroups);
    const unsubUsers = firestoreService.subscribeToDocuments<UserProfile>('users', [], setStudents);
    return () => {
      unsubGroups();
      unsubUsers();
    };
  }, []);

  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
  const isUstoz = profile?.role === 'ustoz';

  const visibleGroups = React.useMemo(() => {
    return groups.filter(g => {
      if (isDirector) return true;
      if (isUstoz) return g.teacherId === profile?.uid;
      if (profile?.role === 'ustoz' || profile?.role === 'yoramchi ustoz') {
        return g.teacherId === profile?.uid;
      }
      return true;
    });
  }, [groups, profile, isDirector, isUstoz]);

  useEffect(() => {
    if (visibleGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(visibleGroups[0].id);
    }
  }, [visibleGroups, selectedGroupId]);

  const selectedGroup = visibleGroups.find(g => g.id === selectedGroupId);
  const groupStudents = students.filter(s => selectedGroup?.studentIds.includes(s.uid));

  const handleHomeworkGradeChange = (studentId: string, stars: number) => {
    setHomeworkGrades(prev => ({
      ...prev,
      [studentId]: prev[studentId] === stars ? 0 : stars
    }));
  };

  const handleAttendanceGradeChange = (studentId: string, stars: number) => {
    setAttendanceGrades(prev => ({
      ...prev,
      [studentId]: prev[studentId] === stars ? 0 : stars
    }));
  };

  const handleQaGradeChange = (studentId: string, stars: number) => {
    setQaGrades(prev => ({
      ...prev,
      [studentId]: prev[studentId] === stars ? 0 : stars
    }));
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setComments(prev => ({
      ...prev,
      [studentId]: comment
    }));
  };

  const saveGrades = async () => {
    setIsSaving(true);
    try {
      // Collect students with updates
      const studentIdsToUpdate = Array.from(new Set([
        ...Object.keys(homeworkGrades),
        ...Object.keys(attendanceGrades),
        ...Object.keys(qaGrades),
        ...Object.keys(comments)
      ]));

      for (const studentId of studentIdsToUpdate) {
        const student = students.find(s => s.uid === studentId);
        if (student) {
          const hwStars = homeworkGrades[studentId] || 0;
          const attStars = attendanceGrades[studentId] || 0;
          const qaStars = qaGrades[studentId] || 0;
          const totalEarnedToday = hwStars + attStars + qaStars;
          const userComment = comments[studentId] || "Darsda faol ishtirok etdingiz!";

          if (totalEarnedToday > 0 || comments[studentId]) {
            const currentPoints = student.points || 0;
            const finalPoints = currentPoints + totalEarnedToday;

            // Only update points if there's an increase
            await firestoreService.updateDocument('users', studentId, {
              points: finalPoints,
              updatedAt: new Date().toISOString()
            });

            // Send rich detailed notification to the student
            const message = `${selectedGroup?.name} darsidan bugungi natijangiz:
• Uyga vazifa: ${hwStars} ball ⭐️
• Darsda qatnashgani: ${attStars} ball ⭐️
• Savol-javob: ${qaStars} ball ⭐️
Jami bugun to'plangan ballar: +${totalEarnedToday} ball!

O'qituvchi sharhi / izohi:
"${userComment}"

Jami umumiy reyting balingiz: ${finalPoints} ball. Baraka toping!`;

            await firestoreService.sendNotification(
              studentId, 
              'Bugungi dars ballari & Sharh! ⭐️', 
              message, 
              'grade'
            );
          }
        }
      }

      setHomeworkGrades({});
      setAttendanceGrades({});
      setQaGrades({});
      setComments({});
      alert("Kunlik baholar, izohlari bilan muvaffaqiyatli saqlandi va barcha o'quvchilarga xabar bo'lib jo'natildi!");
    } catch (err) {
      console.error(err);
      alert("Baholarni saqlashda xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const isStaff = profile?.role === 'director' || 
    ['ustoz', 'yoramchi ustoz', 'direktor o\'rin bosari', 'dasturchi', 'mobilograf', 'backent', 'frontend', 'dizayner', 'xodim III darajali', 'xodim II darajali', 'xodim I darajali', 'staff'].includes(profile?.role || '');

  if (!isStaff) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-12 rounded-3xl border border-[#E4E3E0] text-center max-w-2xl mx-auto space-y-4 shadow-sm">
          <GraduationCap size={48} className="text-yellow-500 mx-auto animate-bounce" />
          <h1 className="text-2xl font-bold text-[#141414]">Mening Baholarim</h1>
          <p className="text-[#8E9299] text-sm leading-relaxed">
            Har bir darsda olgan ballaringiz uyga vazifa (max 5 ball), darsda qatnashgani (max 5 ball) va savol-javob (max 5 ball) uchun mukofotlanadi. Dars oxirida ustozlaringiz qo&#39;ygan izohlari to&#39;g&#39;ridan-to&#39;g&#39;ri profil bildirishnomalarida aks etadi!
          </p>
        </div>
      </div>
    );
  }

  const changeCount = Object.keys(homeworkGrades).length + Object.keys(attendanceGrades).length + Object.keys(qaGrades).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Talabalarni Baholash</h1>
          <p className="text-[#8E9299] text-xs mt-1">
            Har bir uyga vazifa, darsdagi ishtirok hamda savol-javob dars turlari uchun 5 yulduzgacha baho va kunlik izoh yuborish
          </p>
        </div>

        {selectedGroupId && (changeCount > 0 || Object.keys(comments).length > 0) && (
          <button 
            onClick={saveGrades}
            disabled={isSaving}
            className="bg-[#141414] text-white px-6 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 shadow-md"
          >
            <Save size={16} />
            {isSaving ? 'Saqlanmoqda...' : `Barcha baho & izohlarni yuborish`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left column: Choose Group */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] px-2 font-mono">Guruhlar</h3>
          <div className="space-y-2">
            {visibleGroups.map(g => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setHomeworkGrades({});
                  setAttendanceGrades({});
                  setQaGrades({});
                  setComments({});
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

            {visibleGroups.length === 0 && (
              <p className="text-xs text-neutral-400 italic p-3 text-center">Guruhlar topilmadi.</p>
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
                    <p className="text-[10px] text-[#8E9299]">Standart, Uy ishi va Savol-javob turlariga 5 tagacha yulduz va kunlik izoh bering</p>
                  </div>
                </div>

                <div className="flex gap-4 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="fill-blue-500 text-blue-500" /> Uyga vazifa
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="fill-amber-500 text-amber-500" /> Dars faollik
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="fill-purple-600 text-purple-600" /> Savol-javob
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#F5F5F7]">
                {groupStudents.sort((a, b) => (b.points || 0) - (a.points || 0)).map((student, index) => {
                  const hwGrade = homeworkGrades[student.uid] || 0;
                  const attGrade = attendanceGrades[student.uid] || 0;
                  const qaGrade = qaGrades[student.uid] || 0;
                  const totalGraded = hwGrade + attGrade + qaGrade;
                  const currentComment = comments[student.uid] || '';

                  return (
                    <div 
                      key={student.uid} 
                      className={`p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-[#F5F5F7]/20 transition-all ${
                        index < 3 ? 'bg-amber-50/5' : ''
                      }`}
                    >
                      {/* Name Card */}
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
                          <p className="font-extrabold text-[#141414] text-sm flex items-center gap-1.5 flex-wrap">
                            {student.fullName}
                            {index === 0 && (
                              <span className="text-[8px] bg-yellow-400 text-white px-2 py-0.5 rounded-full uppercase font-mono tracking-wider font-bold">Top Lider</span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#8E9299] font-mono mt-0.5">Umumiy reyting: <span className="font-bold text-[#141414]">{student.points || 0} Ball</span></p>
                        </div>
                      </div>

                      {/* Grading Star Matrix (3 rows) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 max-w-2xl">
                        {/* 1. Homework */}
                        <div className="space-y-1 bg-blue-50/20 p-3 rounded-2xl border border-blue-100/10">
                          <span className="block text-[8px] font-mono font-bold uppercase tracking-widest text-blue-800">1. Uyga vazifa (5 yulduz)</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => handleHomeworkGradeChange(student.uid, star)}
                                className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all text-blue-500"
                                title={`Uyga vazifa: ${star} ball`}
                              >
                                <Star 
                                  size={16} 
                                  fill={hwGrade >= star ? 'currentColor' : 'none'} 
                                  className={hwGrade >= star ? 'text-blue-500' : 'text-neutral-200'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Class participation */}
                        <div className="space-y-1 bg-amber-50/20 p-3 rounded-2xl border border-amber-100/10">
                          <span className="block text-[8px] font-mono font-bold uppercase tracking-widest text-amber-800">2. Darsda qatnashganiga (5 yulduz)</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => handleAttendanceGradeChange(student.uid, star)}
                                className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all text-amber-500"
                                title={`Darsda qatnashgani: ${star} ball`}
                              >
                                <Star 
                                  size={16} 
                                  fill={attGrade >= star ? 'currentColor' : 'none'} 
                                  className={attGrade >= star ? 'text-amber-500' : 'text-neutral-200'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. QA / Q&A */}
                        <div className="space-y-1 bg-purple-50/20 p-3 rounded-2xl border border-purple-100/10">
                          <span className="block text-[8px] font-mono font-bold uppercase tracking-widest text-purple-800">3. Savol-javob (5 yulduz)</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => handleQaGradeChange(student.uid, star)}
                                className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-all text-purple-600"
                                title={`Savol-javob: ${star} ball`}
                              >
                                <Star 
                                  size={16} 
                                  fill={qaGrade >= star ? 'currentColor' : 'none'} 
                                  className={qaGrade >= star ? 'text-purple-600' : 'text-neutral-200'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Daily Commentary and submit summary info */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative w-full md:w-48">
                          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                          <input 
                            type="text"
                            placeholder="Izoh yozing..."
                            value={currentComment}
                            onChange={(e) => handleCommentChange(student.uid, e.target.value)}
                            className="pl-9 pr-3 py-2 w-full bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414] font-medium"
                          />
                        </div>

                        {totalGraded > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1 shadow-sm">
                            <Sparkles size={12} className="animate-pulse" />
                            +{totalGraded} ball
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {groupStudents.length === 0 && (
                  <p className="p-12 italic text-[#8E9299] text-xs text-center font-mono">Guruh a'zolari topilmadi.</p>
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
