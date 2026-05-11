import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Payment, Course, UserProfile } from '../types';
import { 
  Plus, 
  Search, 
  Download, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Filter,
  Users as UsersIcon,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const FinancePage: React.FC = () => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
  const isStaff = isDirector || ['ustoz', 'staff'].includes(profile?.role || '');

  useEffect(() => {
    // Queries
    const unsubPayments = firestoreService.subscribeToDocuments<Payment>('payments', [], (data) => {
      if (isDirector) {
        setPayments(data.sort((a, b) => b.date.localeCompare(a.date)));
      } else if (profile) {
        setPayments(data.filter(p => p.studentId === profile.uid).sort((a, b) => b.date.localeCompare(a.date)));
      }
    });

    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
    });

    if (isDirector) {
      const unsubStudents = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
        setStudents(data.filter(s => ['o\'quvchi', 'student', 'shogirt'].includes(s.role)));
      });
      return () => { unsubPayments(); unsubCourses(); unsubStudents(); };
    }

    return () => { unsubPayments(); unsubCourses(); };
  }, [profile, isDirector]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    await firestoreService.addDocument('payments', {
      studentId,
      courseId,
      amount: Number(amount),
      date,
      month,
      method,
      recordedBy: profile.uid,
      status: 'paid',
      createdAt: new Date().toISOString()
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStudentId('');
    setCourseId('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setMonth(new Date().toISOString().slice(0, 7));
    setMethod('cash');
  };

  const getStudentName = (id: string) => students.find(s => s.uid === id)?.fullName || 'Nomaʼlum talaba';
  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Nomaʼlum kurs';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
  };

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const revenueByCourse = courses.map(course => {
    const amount = payments
      .filter(p => p.courseId === course.id)
      .reduce((sum, p) => sum + p.amount, 0);
    return { name: course.name, amount };
  }).filter(c => c.amount > 0);

  const filteredPayments = payments.filter(p => 
    getStudentName(p.studentId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCourseName(p.courseId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Moliya Hisoboti - IT Park JizPI', 14, 15);
    doc.setFontSize(10);
    doc.text(`Umumiy tushum: ${formatCurrency(totalRevenue)}`, 14, 25);
    
    const tableHeaders = ['Talaba', 'Kurs', 'Sana', 'Oy', 'Summa', 'Usul'];
    const tableRows = filteredPayments.map(p => [
      getStudentName(p.studentId),
      getCourseName(p.courseId),
      p.date,
      p.month,
      formatCurrency(p.amount),
      p.method
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 20, 20] }
    });

    doc.save('finance_report.pdf');
  };

  const COLORS = ['#141414', '#3E3E3E', '#6E6E6E', '#9E9E9E', '#CECECE'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Moliya</h1>
          <p className="text-[#8E9299] text-sm mt-1">Toʻlovlar va moliyaviy oqimlar boshqaruvi</p>
        </div>
        
        {isDirector && (
          <div className="flex gap-3">
            <button 
              onClick={handleExportPDF}
              className="px-6 py-3 bg-white border border-[#E4E3E0] text-[#141414] rounded-2xl flex items-center gap-2 font-bold hover:bg-[#F5F5F7] transition-all"
            >
              <Download size={18} /> Hisobot PDF
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-[#141414] text-white rounded-2xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#141414]/10"
            >
              <Plus size={18} /> Toʻlov qabul qilish
            </button>
          </div>
        )}
      </div>

      {isDirector && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm lg:col-span-1 flex flex-col justify-center"
          >
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-1">Umumiy tushum</p>
            <h2 className="text-3xl font-bold text-[#141414]">{formatCurrency(totalRevenue)}</h2>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
              <Plus size={12} /> Barcha toʻlovlar jamlamasi
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm lg:col-span-2"
          >
            <h3 className="text-sm font-bold text-[#141414] mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#8E9299]" />
              Kurslar kesimida daromad
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByCourse}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F7" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#8E9299' }} 
                  />
                  <YAxis 
                    hide 
                  />
                  <Tooltip 
                    cursor={{ fill: '#F5F5F7' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Summa']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                    {revenueByCourse.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#E4E3E0] bg-[#F5F5F7]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-[#141414] flex items-center gap-2">
            <Calendar size={18} className="text-[#8E9299]" />
            {isDirector ? 'Barcha toʻlovlar' : 'Mening toʻlovlarim'}
          </h3>
          {isDirector && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Talaba yoki kurs boʻyicha qidiruv..."
                className="pl-11 pr-4 py-2 bg-white border border-[#E4E3E0] rounded-xl text-xs w-full md:w-64 focus:ring-2 focus:ring-[#141414] outline-none transition-all font-medium"
              />
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
              <tr>
                {isDirector && <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talaba</th>}
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Kurs</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Summa</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Toʻlangan oy</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Sana</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Usul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E3E0]">
              {filteredPayments.length > 0 ? filteredPayments.map((p, i) => (
                <motion.tr 
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-[#F5F5F7]/30 transition-colors"
                >
                  {isDirector && (
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F7] border border-[#E4E3E0] flex items-center justify-center font-bold text-[10px] text-[#141414]">
                          {getStudentName(p.studentId).charAt(0)}
                        </div>
                        <span className="font-bold text-[#141414] text-xs">{getStudentName(p.studentId)}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-5">
                    <span className="font-bold text-[#141414] text-xs">{getCourseName(p.courseId)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-mono font-bold text-green-600 text-xs">{formatCurrency(p.amount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 rounded-full bg-[#141414] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                      {p.month}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[#8E9299] text-xs font-medium">{p.date}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[#8E9299] text-[10px] font-bold uppercase tracking-widest">
                      <CreditCard size={12} />
                      {p.method === 'cash' ? 'Naqd' : p.method === 'card' ? 'Karta' : 'Oʻtkazma'}
                    </div>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={isDirector ? 6 : 5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-[#F5F5F7] rounded-full flex items-center justify-center text-[#8E9299]">
                        <DollarSign size={32} />
                      </div>
                      <p className="text-[#8E9299] text-sm font-medium">Toʻlovlar mavjud emas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-hidden relative"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#141414] rounded-2xl flex items-center justify-center text-white">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#141414]">Toʻlov qabul qilish</h2>
                  <p className="text-[#8E9299] text-sm italic">Moliyaviy operatsiyani roʻyxatdan oʻtkazish</p>
                </div>
              </div>
              
              <form onSubmit={handleAddPayment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Talaba</label>
                    <select
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                    >
                      <option value="">Tanlang...</option>
                      {students.map(s => <option key={s.uid} value={s.uid}>{s.fullName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Kurs</label>
                    <select
                      required
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                    >
                      <option value="">Tanlang...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Tushum summasi (UZS)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Masalan: 500000"
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Toʻlov oyi</label>
                    <input
                      type="month"
                      required
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Sana</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Toʻlov usuli</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'card', 'transfer'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                          method === m 
                            ? 'bg-[#141414] text-white border-[#141414]' 
                            : 'bg-[#F5F5F7] text-[#8E9299] border-transparent hover:border-[#E4E3E0]'
                        }`}
                      >
                        {m === 'cash' ? 'Naqd' : m === 'card' ? 'Karta' : 'Oʻtkazma'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299] hover:bg-[#F5F5F7] transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#141414]/10"
                  >
                    Tasdiqlash
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

export default FinancePage;
