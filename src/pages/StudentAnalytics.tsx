import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Search, 
  Download, 
  Trash2, 
  Edit,
  UserCheck,
  UserMinus,
  ArrowRight,
  ClipboardList,
  GraduationCap,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentAnalytics: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [joinedDate, setJoinedDate] = useState('');
  const [leftDate, setLeftDate] = useState('');
  const [isGraduated, setIsGraduated] = useState(false);
  const [graduatedDate, setGraduatedDate] = useState('');
  const [isSavings, setIsSavings] = useState(false);

  // Filter out to only get director or supervisor access
  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';

  useEffect(() => {
    const unsub = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
      // Filter for student roles
      const studentList = data.filter(u => ['student', 'o\'quvchi', 'shogirt', 'shogird'].includes(u.role));
      setStudents(studentList);
    });
    return () => unsub();
  }, []);

  if (!isDirector) {
    return (
      <div className="text-center p-20">
        <h2 className="text-xl font-bold text-red-600">Ruxsat etilmagan!</h2>
        <p className="text-[#8E9299] text-sm mt-2">Ushbu sahifani ko&#39;rish faqat tizim rahbariga ruxsat etilgan.</p>
      </div>
    );
  }

  // Calculate statistics month by month
  // We'll gather counts from the last 6 months or specific year months
  const getMonthlyStats = () => {
    const months = [
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', 
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'
    ];

    return months.map(m => {
      let arrivals = 0;
      let departures = 0;
      let graduations = 0;

      students.forEach(s => {
        // Enforce fallback to createdAt if joinedDate is empty
        const sJoined = s.joinedDate || s.createdAt?.slice(0, 7) || '';
        const sLeft = s.leftDate || '';
        const sGraduated = s.graduatedDate || '';

        if (sJoined.slice(0, 7) === m) {
          arrivals++;
        }
        if (sLeft && sLeft.slice(0, 7) === m) {
          departures++;
        }
        if (s.isGraduated && sGraduated.slice(0, 7) === m) {
          graduations++;
        }
      });

      const monthName = new Date(m + '-02').toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });

      return {
        month: m,
        monthLabel: monthName,
        'Yangi kelganlar': arrivals,
        'Ketganlar': departures,
        'Bitirganlar': graduations,
        'Faol o\'quvchilar': arrivals - departures - graduations
      };
    });
  };

  const monthlyData = getMonthlyStats();

  // Filter students
  const filteredStudents = students.filter(s => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = s.fullName.toLowerCase().includes(query) || (s.email || '').toLowerCase().includes(query);
    return matchesSearch;
  });

  const handleEditDates = (student: UserProfile) => {
    setEditingStudent(student);
    setJoinedDate(student.joinedDate || student.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setLeftDate(student.leftDate || '');
    setIsGraduated(student.isGraduated || false);
    setGraduatedDate(student.graduatedDate || new Date().toISOString().slice(0, 10));
    setIsEditModalOpen(true);
  };

  const handleSaveDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavings(true);

    try {
      await firestoreService.updateDocument('users', editingStudent.uid, {
        joinedDate: joinedDate || null,
        leftDate: leftDate || null,
        isGraduated: isGraduated,
        graduatedDate: isGraduated ? (graduatedDate || new Date().toISOString().slice(0, 10)) : null,
        updatedAt: new Date().toISOString()
      });
      setIsEditModalOpen(false);
      setEditingStudent(null);
      alert("O'quvchi statistik sanalari va bitirish holati muvaffaqiyatli yangilandi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi.");
    } finally {
      setIsSavings(false);
    }
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("IT Park JizPI - O'quvchilar Statistika Hisoboti (Oyma-oy)", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tayyorlangan sana: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Tizim rahbari: ${profile?.fullName || 'Direktor'}`, 14, 34);

    const tableRows = monthlyData.map(d => [
      d.monthLabel,
      d['Yangi kelganlar'],
      d['Ketganlar'],
      d['Bitirganlar'],
      d['Yangi kelganlar'] - d['Ketganlar'] - d['Bitirganlar']
    ]);

    autoTable(doc, {
      startY: 42,
      head: [["Oy", "Kelgan o'quvchilar", "Ketganlar", "Bitirganlar", "Faol o'quvchilar (Balans)"]],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20] },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Signatures
    doc.setFontSize(10);
    doc.text("Tizim Rahbari Imzosi: ___________________", 14, finalY);
    doc.text("(Imzo va Muhr o'rni)", 14, finalY + 6);

    doc.save(`Student_Analytics_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-8" id="student_analytics_page">
      {/* Header and Download Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#141414] tracking-tight">O&#39;quvchilar Statistikasi</h2>
          <p className="text-sm text-[#8E9299]">Oyma-oy yangi kelgan va guruhlardan ketgan o&#39;quvchilar tahlili</p>
        </div>
        <button
          onClick={generatePDFReport}
          className="bg-[#141414] hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <Download size={14} />
          PDF Hisobot Yuklash
        </button>
      </div>

      {/* Grid of basic summary counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4E3E0] flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[10px] text-[#8E9299] font-medium uppercase font-mono tracking-wider">Umumiy O&#39;quvchilar</p>
            <p className="text-lg font-extrabold text-[#141414]">{students.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E3E0] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={18} />
          </div>
          <div>
            <p className="text-[10px] text-[#8E9299] font-medium uppercase font-mono tracking-wider">Faol O&#39;quvchilar</p>
            <p className="text-lg font-extrabold text-[#141414]">{students.filter(s => !s.leftDate && !s.isGraduated).length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E3E0] flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="text-[10px] text-[#8E9299] font-medium uppercase font-mono tracking-wider">Bitirganlar</p>
            <p className="text-lg font-extrabold text-[#141414]">{students.filter(s => s.isGraduated).length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E3E0] flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
            <UserMinus size={18} />
          </div>
          <div>
            <p className="text-[10px] text-[#8E9299] font-medium uppercase font-mono tracking-wider">Kursdan Ketganlar</p>
            <p className="text-lg font-extrabold text-[#141414]">{students.filter(s => !!s.leftDate).length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4E3E0] flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[10px] text-[#8E9299] font-medium uppercase font-mono tracking-wider">Joriy Oy Kelganlar</p>
            <p className="text-lg font-extrabold text-[#141414]">
              {students.filter(s => (s.joinedDate || s.createdAt).startsWith(new Date().toISOString().slice(0, 7))).length}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="bg-white p-6 rounded-3xl border border-[#E4E3E0]">
        <h3 className="text-sm font-bold text-[#141414] mb-6 font-mono uppercase tracking-wider">Oyma-oy O&#39;quvchilar Dinamikasi: Kelish, Ketish va Bitirish (2026)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F7" />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} fontSize={10} stroke="#8E9299" />
              <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#8E9299" />
              <Tooltip cursor={{ fill: '#F5F5F7' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="Yangi kelganlar" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ketganlar" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bitirganlar" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Students List and Control Panel */}
      <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
        <div className="p-6 border-b border-[#F5F5F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#141414]">O&#39;quvchilar va Ularning Kuzatuv Sanalari</h3>
            <p className="text-xs text-[#8E9299] mt-1">Har bir talaba uchun kelgan/ketgan sanasini tahrirlashingiz mumkin</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9299]" size={14} />
            <input
              type="text"
              placeholder="O'quvchini qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#F5F5F7] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#141414] w-full sm:w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F5F5F7] bg-[#F5F5F7]/30">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8E9299] font-mono">F.I.SH</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8E9299] font-mono">Kursga kelgan sana</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8E9299] font-mono">Kursdan ketgan sana</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8E9299] font-mono">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8E9299] font-mono text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F7]">
              {filteredStudents.map((student) => {
                const sJoined = student.joinedDate || student.createdAt?.slice(0, 10) || 'Kiritilmagan';
                const sLeft = student.leftDate || 'Hali ketmagan (Faol)';
                const isLeft = !!student.leftDate;

                return (
                  <tr key={student.uid} className="hover:bg-[#F5F5F7]/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-xs">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#141414]">{student.fullName}</p>
                          <p className="text-[10px] text-[#8E9299]">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#333333] font-medium font-mono">{sJoined}</td>
                    <td className="px-6 py-4 text-xs font-medium font-mono">
                      {isLeft ? (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{sLeft}</span>
                      ) : (
                        <span className="text-[#8E9299] italic">{sLeft}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {student.isGraduated ? (
                        <span className="px-2 rounded-full text-[10px] font-bold bg-[#FFF9E6] text-[#D97706] border border-[#FCD34D] inline-flex items-center gap-1">
                          <GraduationCap size={12} />
                          Bitirgan ({student.graduatedDate || 'Sanasiz'})
                        </span>
                      ) : isLeft ? (
                        <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">Tark etgan</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">Faol o&#39;quvchi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditDates(student)}
                        className="text-[#8E9299] hover:text-[#141414] p-2 hover:bg-[#F5F5F7] rounded-xl transition-all"
                        title="Tarixiy sanalarni tahrirlash"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-xs text-[#8E9299] italic">O&#39;quvchilar topilmadi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingStudent && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2rem] border border-[#E4E3E0] shadow-2xl max-w-sm w-full relative"
            >
              <h3 className="font-extrabold text-base text-[#141414] mb-2">Faollik sanalarini sozlash</h3>
              <p className="text-xs text-[#8E9299] mb-4">{editingStudent.fullName}</p>

              <form onSubmit={handleSaveDates} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-1.5 font-mono">Kursga kelgan sana</label>
                  <input
                    type="date"
                    required
                    value={joinedDate}
                    onChange={(e) => setJoinedDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-1.5 font-mono">Kursdan ketgan sana (Ixtiyoriy)</label>
                  <input
                    type="date"
                    value={leftDate}
                    onChange={(e) => {
                      setLeftDate(e.target.value);
                      if (e.target.value) setIsGraduated(false);
                    }}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                  <p className="text-[9px] text-[#8E9299] mt-1">O&#39;quvchi kursdan ketgan bo&#39;lsa, sanasini kiriting. Agar faol bo&#39;lsa bo&#39;sh qoldiring.</p>
                </div>

                <div className="border-t border-[#F5F5F7] pt-3 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGraduated}
                      onChange={(e) => {
                        setIsGraduated(e.target.checked);
                        if (e.target.checked) setLeftDate('');
                      }}
                      className="rounded border-[#E4E3E0] text-[#141414] focus:ring-[#141414] w-4 h-4"
                    />
                    <span className="text-xs font-bold text-[#141414] flex items-center gap-1.5 select-none hover:text-amber-700 transition">
                      <GraduationCap size={15} className="text-amber-600" />
                      Muvaffaqiyatli Bitirgan!
                    </span>
                  </label>
                </div>

                {isGraduated && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-1.5 font-mono">Kursni bitirgan sana</label>
                    <input
                      type="date"
                      required
                      value={graduatedDate}
                      onChange={(e) => setGraduatedDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavings}
                    className="flex-1 bg-[#141414] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition"
                  >
                    {isSavings ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingStudent(null);
                    }}
                    className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-xs hover:bg-neutral-200 transition"
                  >
                    Bekor qilish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAnalytics;
