import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile, Attendance } from '../types';
import { Trophy, Medal, Award, UserCircle, Shield, CreditCard, AlertTriangle, Search, TrendingDown, Target, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
};

const RankingPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [search, setSearch] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // Subscribe to all students and staff
    const unsubUsers = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
      const students = data.filter(u => ['student', 'o\'quvchi', 'shogirt', 'user'].includes(u.role));
      setUsers(students);
    });

    // Subscribe to all attendances
    const unsubAtts = firestoreService.subscribeToDocuments<Attendance>('attendance', [], setAttendances);

    return () => {
      unsubUsers();
      unsubAtts();
    };
  }, []);

  // Is director or supervisor
  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';

  const isLastDayOfMonth = () => {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return tomorrow.getDate() === 1;
  };

  const isTodayLastDay = isLastDayOfMonth();

  // First calculate base student metrics to sort them cleanly
  const sortedBase = users.map(student => {
    const studentAtts = attendances.filter(a => a.studentId === student.uid);
    const unpaidAtts = studentAtts.filter(a => !a.paid);
    
    // Penalties (points deduction -5 and -3) start on 2026-05-21 and won't affect earlier dates
    const penaltyAtts = unpaidAtts.filter(a => a.date >= '2026-05-21');
    const penaltyAbsents = penaltyAtts.filter(a => a.status === 'absent').length;
    const penaltyLates = penaltyAtts.filter(a => a.status === 'late').length;

    const absents = studentAtts.filter(a => a.status === 'absent' && !a.paid).length;
    const lates = studentAtts.filter(a => a.status === 'late' && !a.paid).length;
    const presents = studentAtts.filter(a => a.status === 'present').length;

    const deductionPoints = (penaltyAbsents * 5) + (penaltyLates * 3);
    const earnedPoints = student.points || 0;
    const netPoints = Math.max(0, earnedPoints - deductionPoints);

    return {
      ...student,
      absents,
      lates,
      presents,
      penaltyAbsents,
      penaltyLates,
      deductionPoints,
      earnedPoints,
      netPoints
    };
  }).sort((a, b) => b.netPoints - a.netPoints);

  // Now process final student metrics with user financial rules: 300 UZS/day present, 1000 UZS/40 points, and 10000 UZS 1st place champion bonus
  const renderedStudents = sortedBase.map((u, index) => {
    const isFirstPlace = index === 0 && u.netPoints > 0;
    
    // 1. 300 UZS daily bonus for attending class on-time (presents)
    const attendanceCash = u.presents * 300;
    
    // 2. 1000 UZS bonus per each 40 earned points starts on 03.06.2026
    const IS_BONUS_ACTIVE = new Date().toISOString() >= '2026-06-03';
    const pointBonusCash = IS_BONUS_ACTIVE ? (Math.floor(u.netPoints / 40) * 1000) : 0;
    
    // 3. 10000 UZS monthly leading top spot bonus (Only on the last day of the month)
    const leaderBonusCash = (isFirstPlace && isTodayLastDay) ? 10000 : 0;
    
    // Base standard rate: each remaining net point is transformed to 20 UZS
    const basePointsCash = u.netPoints * 20;

    // Net cash balance is (earned rewards) - (spent cash on fines)
    const rawCash = basePointsCash + attendanceCash + pointBonusCash + leaderBonusCash;
    const cashValue = Math.max(0, rawCash - (u.spentBalance || 0));

    return {
      ...u,
      isFirstPlace,
      attendanceCash,
      pointBonusCash,
      leaderBonusCash,
      basePointsCash,
      cashValue
    };
  });

  const filteredStudents = renderedStudents.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (u.major && u.major.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-24">
      {/* Informative Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-full text-xs font-bold tracking-widest uppercase mb-4 shadow-sm">
          <Trophy size={14} className="text-yellow-400" />
          Top 100 Reyting
        </div>
        <h1 className="text-5xl font-extrabold text-[#141414] tracking-tight md:text-6xl">
          Faol Talabalar Reytingi
        </h1>
        <p className="text-[#8E9299] max-w-2xl mx-auto text-base">
          Har bir orttirilgan ball darsdagi harakatlaringiz asosi. To&#39;plangan <span className="font-bold text-[#141414]">25 ball = 500 UZS</span> real mukofotga teng! Jarimalarni chetlab o&#39;ting va eng yuqori pog&#39;onalarni band eting!
        </p>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
        >
          <HelpCircle size={14} /> Qoidalar qanday ishlaydi?
        </button>
      </div>

      {/* Rules Explainer Alert */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-[#F5F5F7] border border-[#E4E3E0] rounded-3xl p-6 space-y-4 max-w-3xl mx-auto shadow-inner"
          >
            <h4 className="font-bold text-[#141414] text-sm">Reyting va Ballar Tizimi Nizomi:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#8E9299]">
              <div className="space-y-2">
                <p className="font-bold text-[#141414]">⭐ Ball to&#39;plash:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Dars jarayonidagi faol ishtirok uchun baholash: 1 tadan 5 tagacha standart yulduz (ball).</li>
                  <li>Amaliy vazifalar, darsdan tashqari faollik yoki qo&#39;shimcha yutuqlar uchun: qo&#39;shimcha 5 tagacha oltin/indigo yulduz bonuslari.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-[#141414]">🔻 Ball ayirish (Jarima):</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Har bir kelmagan (absent) kun uchun: <strong className="text-red-500 font-mono">-5 ball</strong> (21.05.2026 yildan boshlab).</li>
                  <li>Har bir kechikkan (late) kun uchun: <strong className="text-orange-500 font-mono">-3 ball</strong> (21.05.2026 yildan boshlab).</li>
                  <li>Inobatga olish: 21.05.2026 sanasigacha bo&#39;lgan yo&#39;qlamalar ballga ta&#39;sir qilmaydi.</li>
                  <li>Balans hisobi: <code className="bg-white px-1.5 py-0.5 rounded font-mono border">Net_Points = (Yulduzlar - Jarimalar)</code>.</li>
                  <li>Moliyaviy muvofiqlik: Net Ball × 20 UZS (25 ball = 500 UZS).</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Podium Top 3 Students */}
      <div className="relative pt-16 flex flex-col md:flex-row items-stretch justify-center gap-6 max-w-4xl mx-auto">
        {/* Silver Rank 2 */}
        {filteredStudents[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="w-full md:w-72 bg-white border border-[#E4E3E0] rounded-[2.5rem] p-8 flex flex-col justify-between text-center relative shadow-sm hover:shadow-md transition-all self-end h-[360px]"
          >
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                <UserCircle size={76} className="text-slate-400" />
              </div>
              <div className="bg-slate-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm absolute -bottom-1 border-2 border-white shadow-sm">2</div>
            </div>
            
            <div className="mt-12 space-y-2">
              <h3 className="font-extrabold text-lg text-[#141414] truncate px-2">{filteredStudents[1].fullName}</h3>
              <p className="text-xs text-[#8E9299] uppercase tracking-widest font-mono truncate">{filteredStudents[1].major || 'IT Specialist'}</p>
            </div>

            <div className="my-4 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1">
              <div className="flex justify-between text-xs text-[#8E9299]">
                <span>To&#39;plangan:</span>
                <span className="font-bold text-[#141414] font-mono">{filteredStudents[1].earnedPoints} ⭐️</span>
              </div>
              <div className="flex justify-between text-xs text-red-500">
                <span>Jarimalar:</span>
                <span className="font-bold font-mono">-{filteredStudents[1].deductionPoints} 🔻</span>
              </div>
              <hr className="border-[#E4E3E0]" />
              <div className="flex justify-between text-sm items-center pt-1">
                <span className="font-bold text-[#141414]">Net Ball:</span>
                <span className="font-black text-slate-700 text-base font-mono">{filteredStudents[1].netPoints}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">Hisoblangan mukofot:</span>
              <div className="text-lg font-black font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 py-1.5 rounded-xl">
                {formatCurrency(filteredStudents[1].cashValue)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Gold Rank 1 */}
        {filteredStudents[0] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="w-full md:w-80 bg-gradient-to-b from-[#1E1E1E] to-[#141414] text-white rounded-[3rem] p-8 pb-10 flex flex-col justify-between text-center relative shadow-2xl self-center h-[420px]"
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden ring-4 ring-[#141414]">
                <UserCircle size={90} className="text-white bg-[#141414]/20" />
              </div>
              <div className="bg-yellow-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-base absolute -bottom-1 border-2 border-[#141414]">1</div>
            </div>

            <div className="mt-14 space-y-2">
              <div className="flex justify-center mb-1">
                <Trophy className="text-yellow-400 animate-bounce" size={32} />
              </div>
              <h3 className="font-black text-2xl truncate">{filteredStudents[0].fullName}</h3>
              <p className="text-xs text-white/50 uppercase tracking-widest font-mono truncate">{filteredStudents[0].major || 'Absolyut Lider'}</p>
            </div>

            <div className="my-4 bg-white/10 rounded-3xl p-5 border border-white/10 space-y-1.5 backdrop-blur-sm">
              <div className="flex justify-between text-xs text-white/70">
                <span>To&#39;plangan:</span>
                <span className="font-bold font-mono">{filteredStudents[0].earnedPoints} ⭐️</span>
              </div>
              <div className="flex justify-between text-xs text-red-300">
                <span>Jarimalar:</span>
                <span className="font-bold font-mono">-{filteredStudents[0].deductionPoints} 🔻</span>
              </div>
              <hr className="border-white/10" />
              <div className="flex justify-between text-sm items-center pt-1">
                <span className="font-bold text-white">Xozirgi Net Ball:</span>
                <span className="font-black text-yellow-300 text-xl font-mono">{filteredStudents[0].netPoints}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest block">GRAND BAXO BALANSI:</span>
              <div className="text-xl font-black font-mono text-emerald-300 bg-white/10 border border-white/10 py-2 rounded-2xl">
                {formatCurrency(filteredStudents[0].cashValue)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Bronze Rank 3 */}
        {filteredStudents[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="w-full md:w-72 bg-white border border-[#E4E3E0] rounded-[2.5rem] p-8 flex flex-col justify-between text-center relative shadow-sm hover:shadow-md transition-all self-end h-[360px]"
          >
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                <UserCircle size={76} className="text-amber-800/40" />
              </div>
              <div className="bg-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm absolute -bottom-1 border-2 border-white shadow-sm">3</div>
            </div>

            <div className="mt-12 space-y-2">
              <h3 className="font-extrabold text-lg text-[#141414] truncate px-2">{filteredStudents[2].fullName}</h3>
              <p className="text-xs text-[#8E9299] uppercase tracking-widest font-mono truncate">{filteredStudents[2].major || 'IT Specialist'}</p>
            </div>

            <div className="my-4 bg-orange-50/40 rounded-2xl p-4 border border-orange-100/30 space-y-1">
              <div className="flex justify-between text-xs text-[#8E9299]">
                <span>To&#39;plangan:</span>
                <span className="font-bold text-[#141414] font-mono">{filteredStudents[2].earnedPoints} ⭐️</span>
              </div>
              <div className="flex justify-between text-xs text-red-500">
                <span>Jarimalar:</span>
                <span className="font-bold font-mono">-{filteredStudents[2].deductionPoints} 🔻</span>
              </div>
              <hr className="border-[#E4E3E0]" />
              <div className="flex justify-between text-sm items-center pt-1">
                <span className="font-bold text-[#141414]">Net Ball:</span>
                <span className="font-black text-neutral-700 text-base font-mono">{filteredStudents[2].netPoints}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">Hisoblangan mukofot:</span>
              <div className="text-lg font-black font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 py-1.5 rounded-xl">
                {formatCurrency(filteredStudents[2].cashValue)}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Student Registry & Director Financial Board */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#141414] text-white rounded-2xl">
              <Award size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#141414]">Barcha Talabalar Reyting Hisobi</h2>
              <p className="text-xs text-[#8E9299] mt-0.5">Yulduzlar, Davomat darslari, Jarimalar va Mukofot balansi qiyosiy jadvali</p>
            </div>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299] group-focus-within:text-[#141414]" size={16} />
            <input
              type="text"
              placeholder="Ism bo'yicha qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E3E0] rounded-xl text-xs focus:ring-1 focus:ring-[#141414] transition-all"
            />
          </div>
        </div>

        {/* Board Table */}
        <div className="bg-white rounded-[2.5rem] border border-[#E4E3E0] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                <tr>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center w-16">O&#39;rin</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talaba</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Asosiy ball</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Davomat jarimasi</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Sof ball</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-right">To&#39;planadigan pul (UZS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F7]">
                {filteredStudents.map((u, i) => {
                  const isTop3 = i < 3;
                  return (
                    <tr key={u.uid} className={`group hover:bg-[#F5F5F7]/40 transition-all ${isTop3 ? 'bg-amber-50/5' : ''}`}>
                      {/* Rank Indicator */}
                      <td className="px-8 py-5 text-center font-black text-xs">
                        {isTop3 ? (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            i === 0 ? 'bg-yellow-100 text-yellow-800' :
                            i === 1 ? 'bg-slate-100 text-slate-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            #{i + 1}
                          </span>
                        ) : (
                          <span className="text-[#8E9299] font-mono">{i + 1}</span>
                        )}
                      </td>

                      {/* Student info */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isTop3 ? 'bg-yellow-400/10 text-[#141414]' : 'bg-[#F2F1EC] text-[#8E9299]'
                          }`}>
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-[#141414] text-sm block">{u.fullName}</span>
                            <span className="text-[10px] text-[#8E9299] uppercase tracking-widest font-mono block mt-0.5">
                              {u.major || 'Talaba'} &bull; {u.age ? `${u.age} yosh` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Earned points (from stars) */}
                      <td className="px-8 py-5 text-center font-bold text-sm text-[#141414]">
                        {u.earnedPoints} ⭐️
                      </td>

                      {/* Deduct attendances */}
                      <td className="px-8 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          {u.deductionPoints > 0 ? (
                            <>
                              <span className="text-xs font-bold text-red-600 font-mono bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg text-nowrap">
                                -{u.deductionPoints} ball
                              </span>
                              <span className="text-[9px] text-red-500 font-mono mt-0.5 text-nowrap">
                                {u.penaltyAbsents} Kelm | {u.penaltyLates} Kech
                              </span>
                              <span className="text-[8px] text-stone-400 font-mono text-nowrap">
                                (21.05.2026 dan boshlab)
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Net points */}
                      <td className="px-8 py-5 text-center">
                        <span className="text-sm font-black font-mono text-slate-800">
                          {u.netPoints}
                        </span>
                      </td>

                      {/* Cash Reward Value */}
                      <td className="px-8 py-5 text-right font-sans">
                        <div className="inline-flex flex-col items-end space-y-1">
                          <span className="text-sm font-black font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-2xl block shadow-sm text-nowrap">
                            {formatCurrency(u.cashValue)}
                          </span>
                          <div className="text-[10px] text-[#8E9299] font-mono text-right bg-neutral-50/80 border border-neutral-100 p-2.5 rounded-xl mt-1 space-y-0.5 pointer-events-none leading-normal text-xs w-72 max-w-xs shadow-sm">
                            <div className="flex justify-between">
                              <span>Net ball bonusi (20 so'm/ball):</span>
                              <span className="font-bold text-neutral-700">{formatCurrency(u.basePointsCash)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Vaqtida kelgani (+300 so'm/kun):</span>
                              <span className="font-bold text-blue-600">+{formatCurrency(u.attendanceCash)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>40-ballik bonus (+1000 so'm):</span>
                              <span className="font-bold text-purple-600">+{formatCurrency(u.pointBonusCash)}</span>
                            </div>
                            {u.leaderBonusCash > 0 && (
                              <div className="flex justify-between text-amber-600 font-bold border-t border-amber-200 mt-1 pt-1">
                                <span>1-o'rin grand bonusi:</span>
                                <span>+10,000 UZS 🏆</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-10 py-24 text-center text-[#8E9299] italic">
                      Hech qanday talaba topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Special Director's Cash & Rewards Overview Section */}
      {isDirector && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-xl space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl text-yellow-400">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">Direktor Moliyaviy Nazorati</h3>
                <p className="text-xs text-white/50">Talabalarning jami to&#39;plagan reyting pullarini hisob-kitob qilish taxtasi</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-full text-xs font-mono font-bold">
              DIREKTOR HUQUQLARI FAOL
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider block">O&#39;quvchilar Jami Ballari</span>
              <p className="text-3xl font-black font-mono text-yellow-400">
                {renderedStudents.reduce((acc, current) => acc + current.earnedPoints, 0)} ⭐️
              </p>
              <span className="text-[10px] text-white/30 block">Baholash va dars yulduzlari umumiy yig&#39;indisi</span>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider block">Jarima Unutilgan Ballar</span>
              <p className="text-3xl font-black font-mono text-red-400">
                -{renderedStudents.reduce((acc, current) => acc + current.deductionPoints, 0)} 🔻
              </p>
              <span className="text-[10px] text-white/30 block">Davomat buzilishidan kesilgan umumiy ballar</span>
            </div>

            <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-2">
              <span className="text-xs text-emerald-400 font-mono uppercase tracking-wider block">Jadval Bo&#39;yicha Jami To&#39;lanadigan Summa</span>
              <p className="text-3xl font-black font-mono text-emerald-300">
                {formatCurrency(renderedStudents.reduce((acc, current) => acc + current.cashValue, 0))}
              </p>
              <span className="text-[10px] text-emerald-400/50 block">Bitiruvda mukofotlanadigan o&#39;quvchilar nominal balansi</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default RankingPage;
