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
  Calendar,
  AlertTriangle,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  Edit2,
  Sparkles
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
  const [attendances, setAttendances] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editAttDate, setEditAttDate] = useState('');
  const [editAttStatus, setEditAttStatus] = useState<'present' | 'absent' | 'late'>('absent');
  const [editAttCourseId, setEditAttCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'payments' | 'fines'>('payments');

  // Custom expandable student state for fine rows
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Dynamic fine rates state
  const [fineRates, setFineRates] = useState<{ absentFine: number; lateFine: number }>({
    absentFine: 10000,
    lateFine: 5000
  });
  const [editAbsentFine, setEditAbsentFine] = useState('10000');
  const [editLateFine, setEditLateFine] = useState('5000');
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
  const isStaff = isDirector || ['ustoz', 'staff'].includes(profile?.role || '');

  useEffect(() => {
    // Queries
    const unsubPayments = firestoreService.subscribeToDocuments<Payment>('payments', [], (data) => {
      if (isStaff) {
        setPayments(data.sort((a, b) => b.date.localeCompare(a.date)));
      } else if (profile) {
        setPayments(data.filter(p => p.studentId === profile.uid).sort((a, b) => b.date.localeCompare(a.date)));
      }
    });

    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
    });

    const unsubStudents = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
      if (isStaff) {
        setStudents(data.filter(s => ['o\'quvchi', 'student', 'shogirt', 'shogird'].includes(s.role)));
      } else if (profile) {
        setStudents(data.filter(s => s.uid === profile.uid));
      }
    });

    const unsubAttendances = firestoreService.subscribeToDocuments<any>('attendance', [], (data) => {
      if (isStaff) {
        setAttendances(data);
      } else if (profile) {
        setAttendances(data.filter(a => a.studentId === profile.uid));
      }
    });

    const unsubFineSettings = firestoreService.subscribeToDocuments<any>('fineSettings', [], (data) => {
      const ratesDoc = data.find(doc => doc.id === 'rates');
      if (ratesDoc) {
        setFineRates({
          absentFine: Number(ratesDoc.absentFine) || 10000,
          lateFine: Number(ratesDoc.lateFine) || 5000
        });
        setEditAbsentFine(String(ratesDoc.absentFine || 10000));
        setEditLateFine(String(ratesDoc.lateFine || 5000));
      }
    });

    return () => { 
      unsubPayments(); 
      unsubCourses(); 
      unsubStudents(); 
      unsubAttendances(); 
      unsubFineSettings();
    };
  }, [profile, isStaff]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const paymentData: any = {
      studentId,
      courseId,
      amount: Number(amount),
      date,
      dueDate,
      month,
      method,
      recordedBy: profile.uid,
      status: 'paid'
    };

    if (editingPaymentId) {
      paymentData.updatedAt = new Date().toISOString();
      await firestoreService.updateDocument('payments', editingPaymentId, paymentData);
      alert("Toʻlov muvaffaqiyatli yangilandi!");
    } else {
      paymentData.createdAt = new Date().toISOString();
      await firestoreService.addDocument('payments', paymentData);
      alert("Toʻlov muvaffaqiyatli qoʻshildi!");
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStudentId('');
    setCourseId('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDueDate(nextWeek.toISOString().split('T')[0]);
    setMonth(new Date().toISOString().slice(0, 7));
    setMethod('cash');
    setEditingPaymentId(null);
  };

  const handleEditPaymentSelect = (p: any) => {
    setEditingPaymentId(p.id);
    setStudentId(p.studentId);
    setCourseId(p.courseId);
    setAmount(String(p.amount));
    setDate(p.date || '');
    setDueDate(p.dueDate || '');
    setMonth(p.month || '');
    setMethod(p.method || 'cash');
    setIsModalOpen(true);
  };

  const handleSaveAttendanceFine = async (id: string, originalAtt: any) => {
    try {
      const updatedData = {
        ...originalAtt,
        date: editAttDate,
        status: editAttStatus,
        courseId: editAttCourseId,
        updatedAt: new Date().toISOString()
      };
      await firestoreService.updateDocument('attendance', id, updatedData);
      setEditingAttendanceId(null);
      alert("Davomat darsi / jarima muvaffaqiyatli tahrirlandi!");
    } catch (err) {
      console.error(err);
      alert("Dars / jarimani tahrirlashda xatolik yuz berdi.");
    }
  };

  const handleDeletePayment = async (payId: string) => {
    if (!isDirector) {
      alert("Faqat tashkilot direktori toʻlovlarni oʻchira oladi!");
      return;
    }
    if (window.confirm("Ushbu toʻlov rekordini butunlay oʻchirib tashlamoqchimisiz?")) {
      try {
        await firestoreService.deleteDocument('payments', payId);
      } catch (err) {
        console.error(err);
        alert("O'chirishda xatolik yuz berdi.");
      }
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector && !isStaff) return;
    setIsUpdatingRates(true);
    try {
      await firestoreService.setDocument('fineSettings', 'rates', {
        absentFine: Number(editAbsentFine),
        lateFine: Number(editLateFine),
        updatedAt: new Date().toISOString()
      });
      alert("Jarima narxlari muvaffaqiyatli yangilandi!");
    } catch (err) {
      console.error(err);
      alert("Narxlarni yangilashda xatolik yuz berdi.");
    } finally {
      setIsUpdatingRates(false);
    }
  };

  const handleDeleteAttendanceFine = async (attendanceId: string) => {
    if (!attendanceId) return;
    if (window.confirm("Ushbu dars qoldirilishi/kech qolishi yo'qlama jarimasini butunlay oʻchirib tashlamoqchimisiz?")) {
      try {
        await firestoreService.deleteDocument('attendance', attendanceId);
      } catch (err) {
        console.error(err);
        alert("Xatolik yuz berdi. O'chirishga ruxsat yo'q yoki tarmoq xatosi.");
      }
    }
  };

  const handleClearAllStudentFines = async (studentId: string, fullName: string) => {
    if (window.confirm(`${fullName} talabasining barcha yo'qlama jarimalari (dars qoldirish/kech qolish) va qarzdorliklarini butunlay oʻchirib tashlamoqchimisiz?`)) {
      try {
        const studentFines = attendances.filter(a => a.studentId === studentId && (a.status === 'absent' || a.status === 'late'));
        for (const f of studentFines) {
          if (f.id) {
            await firestoreService.deleteDocument('attendance', f.id);
          }
        }
        alert("Oʻquvchining barcha yo'qlama qarzdorliklari muvaffaqiyatli o'chirildi!");
      } catch (err) {
        console.error(err);
        alert("Xatolik yuz berdi.");
      }
    }
  };

  const getStudentName = (id: string) => students.find(s => s.uid === id)?.fullName || 'Nomaʼlum talaba';
  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Nomaʼlum kurs';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
  };

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalFines = attendances.filter(a => !a.paid).reduce((sum, a) => sum + (a.status === 'absent' ? fineRates.absentFine : a.status === 'late' ? fineRates.lateFine : 0), 0);
  
  const calculateFines = (sId: string) => {
    const studentAtts = attendances.filter(a => a.studentId === sId && !a.paid);
    const absents = studentAtts.filter(a => a.status === 'absent').length;
    const lates = studentAtts.filter(a => a.status === 'late').length;
    return {
      absents,
      lates,
      total: (absents * fineRates.absentFine) + (lates * fineRates.lateFine)
    };
  };

  // Student-specific calculations for balance and pays
  const studentAllAtts = attendances.filter(a => a.studentId === profile?.uid);
  const unpaidAttsForPoints = studentAllAtts.filter(a => !a.paid);
  const presentsCount = studentAllAtts.filter(a => a.status === 'present').length;
  
  const penaltyAtts = unpaidAttsForPoints.filter(a => a.date >= '2026-05-21');
  const penaltyAbsents = penaltyAtts.filter(a => a.status === 'absent').length;
  const penaltyLates = penaltyAtts.filter(a => a.status === 'late').length;
  const pointsDeduction = (penaltyAbsents * 5) + (penaltyLates * 3);
  const netPoints = Math.max(0, (profile?.points || 0) - pointsDeduction);

  const IS_AFTER_OR_ON_JUNE_3_2026 = new Date().toISOString() >= '2026-06-03';
  const pointBonusCash = IS_AFTER_OR_ON_JUNE_3_2026 ? (Math.floor(netPoints / 40) * 1000) : 0;
  
  const earnedBalance = (netPoints * 20) + (presentsCount * 300) + pointBonusCash;
  const myStudentCashBalance = Math.max(0, earnedBalance - (profile?.spentBalance || 0));

  const handlePayFine = async (attendanceDoc: any) => {
    if (!profile) return;
    
    const fineCost = attendanceDoc.status === 'absent' ? fineRates.absentFine : fineRates.lateFine;
    
    if (myStudentCashBalance < fineCost) {
      alert(`Xatolik: Balansingizda yetarli mablag' mavjud emas! Kelmagan (${formatCurrency(fineRates.absentFine)}) va kechikish (${formatCurrency(fineRates.lateFine)}) jarimalarini yopish uchun hisobingiz kash shaklida so'm yetarli bo'lishi lozim.`);
      return;
    }
    
    if (window.confirm(`Ushbu jarimani (Sana: ${attendanceDoc.date}, Kurs: ${getCourseName(attendanceDoc.courseId)}) balansingizdan ${formatCurrency(fineCost)} yechib to'lashni tasdiqlaysizmi?`)) {
      try {
        // 1. Mark attendance as paid
        await firestoreService.updateDocument('attendance', attendanceDoc.id, {
          paid: true
        });
        
        // 2. Update student spentBalance
        const currentSpent = profile.spentBalance || 0;
        await firestoreService.updateDocument('users', profile.uid, {
          spentBalance: currentSpent + fineCost,
          updatedAt: new Date().toISOString()
        });
        
        // 3. Create a notification
        await firestoreService.addDocument('notifications', {
          userId: profile.uid,
          title: "Davomat jarimasi yopildi",
          message: `${attendanceDoc.date} kungi kelmagan/kechikkanlik darsi bo'yicha ${formatCurrency(fineCost)} jarima umumiy balansingiz hisobidan muvaffaqiyatli to'lab yopildi. Jarima ballari qayta tiklandi!`,
          type: 'system',
          read: false,
          createdAt: new Date().toISOString()
        });
        
        alert("Jarima muvaffaqiyatli to'landi! Ballaringiz va hisob-kitobingiz qayta tiklandi.");
      } catch (err) {
        console.error(err);
        alert("To'lov jarayonida xatolik yuz berdi.");
      }
    }
  };

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
    doc.text(`Umumiy jarimalar: ${formatCurrency(totalFines)}`, 14, 30);
    
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
          <p className="text-[#8E9299] text-sm mt-1">Toʻlovlar, qarzdorliklar va jarimalar boshqaruvi</p>
        </div>
        
        <div className="flex gap-3">
          {isStaff && (
            <button 
              onClick={handleExportPDF}
              className="px-6 py-3 bg-white border border-[#E4E3E0] text-[#141414] rounded-2xl flex items-center gap-2 font-bold hover:bg-[#F5F5F7] transition-all"
            >
              <Download size={18} /> Hisobot PDF
            </button>
          )}
          {isDirector && (
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="px-6 py-3 bg-[#141414] text-white rounded-2xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#141414]/10"
            >
              <Plus size={18} /> Toʻlov qabul qilish
            </button>
          )}
        </div>
      </div>

      {isStaff ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm lg:col-span-1 flex flex-col justify-center"
          >
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-1">Umumiy tushum (Toʻlovlar)</p>
            <h2 className="text-3xl font-bold text-[#141414]">{formatCurrency(totalRevenue)}</h2>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
              <Plus size={12} /> Jami o'quvchilar to'lagan summa
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm lg:col-span-1 flex flex-col justify-center"
          >
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
              <AlertTriangle size={24} />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-1">Umumiy Yoʻqlama Jarimalari</p>
            <h2 className="text-3xl font-bold text-red-500">{formatCurrency(totalFines)}</h2>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-50 w-fit px-2 py-1 rounded-lg">
              Kelmagan dars ({formatCurrency(fineRates.absentFine)}) & Kech qolish ({formatCurrency(fineRates.lateFine)}) jarimalari yig'indisi
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm lg:col-span-1"
          >
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-4">Kurslar bo'yicha daromad</h3>
            <div className="space-y-3 max-h-[145px] overflow-y-auto pr-1">
              {revenueByCourse.slice(0, 4).map((c, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#141414] truncate max-w-[150px]">{c.name}</span>
                  <span className="font-mono text-[#8E9299]">{formatCurrency(c.amount)}</span>
                </div>
              ))}
              {revenueByCourse.length === 0 && (
                <p className="text-xs text-[#8E9299] italic">Hali toʻlovlar mavjud emas</p>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm flex flex-col justify-center"
          >
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-1">Mening Toʻlovlarim</p>
            <h2 className="text-3xl font-bold text-[#141414]">{formatCurrency(totalRevenue)}</h2>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
              Amalga oshirilgan to'lovlar jamlamasi
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm flex flex-col justify-center"
          >
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
              <AlertTriangle size={24} />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-1">Mening Davomat Jarimalarim</p>
            <h2 className="text-3xl font-bold text-red-500">{formatCurrency(calculateFines(profile?.uid || '').total)}</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded">
                Sariq (kelmagan) - {calculateFines(profile?.uid || '').absents} marta ({formatCurrency(fineRates.absentFine)})
              </span>
              <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded">
                Kech (kechikkan) - {calculateFines(profile?.uid || '').lates} marta ({formatCurrency(fineRates.lateFine)})
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm flex flex-col justify-center bg-emerald-50/5 border-emerald-200"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] mb-1">Mening Bo'sh Balansim</p>
            <h2 className="text-3xl font-bold text-emerald-600">{formatCurrency(myStudentCashBalance)}</h2>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              Balansdan foydalanib jarimalaringizni yoping!
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs Switcher Custom Elements */}
      <div className="flex border-b border-[#E4E3E0] gap-8">
        <button 
          onClick={() => { setActiveTab('payments'); setSearchTerm(''); }}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'payments' ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#8E9299] hover:text-[#141414]'}`}
        >
          {isStaff ? 'Toʻlovlar Roʻyxati' : 'Mening Toʻlovlarim Tarixi'}
        </button>
        <button 
          onClick={() => { setActiveTab('fines'); setSearchTerm(''); }}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'fines' ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#8E9299] hover:text-[#141414]'}`}
        >
          {isStaff ? 'Yoʻqlama Jarimalari & Qarzdorlik' : 'Mening Yoʻqlama Jarimalarim'}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#E4E3E0] bg-[#F5F5F7]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-[#141414] flex items-center gap-2">
            <Calendar size={18} className="text-[#8E9299]" />
            {activeTab === 'payments' 
              ? (isStaff ? 'Barcha Toʻlangan Toʻlovlar' : 'Mening Toʻlovlarim') 
              : (isStaff ? 'Talabalar Davomat Qarzdorligi' : 'Mening Yoʻqlama Jarimalarim Tafsiloti')}
          </h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={16} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'payments' 
                ? (isStaff ? "Talaba yoki kurs boʻyicha qidiruv..." : "Kurs boʻyicha qidiruv...")
                : (isStaff ? "Talaba ismi boʻyicha qidiruv..." : "Sana yoki kurs bo'yicha qidiruv...")}
              className="pl-11 pr-4 py-2 bg-white border border-[#E4E3E0] rounded-xl text-xs w-full md:w-64 focus:ring-2 focus:ring-[#141414] outline-none transition-all font-medium"
            />
          </div>
        </div>

        {activeTab === 'payments' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                <tr>
                  {isStaff && <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talaba</th>}
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Kurs</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Summa</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Toʻlangan oy</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Toʻlov muddati</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Toʻlangan sana</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Usul</th>
                  {isDirector && <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Amallar</th>}
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
                    {isStaff && (
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
                      <span className="text-red-600 bg-red-50 text-xs font-mono font-bold px-2.5 py-1 rounded-lg">{(p as any).dueDate || p.date || '-'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-green-600 bg-green-50 text-xs font-mono font-bold px-2.5 py-1 rounded-lg">{p.date}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-[#8E9299] text-[10px] font-bold uppercase tracking-widest">
                        <CreditCard size={12} />
                        {p.method === 'cash' ? 'Naqd' : p.method === 'card' ? 'Karta' : 'Oʻtkazma'}
                      </div>
                    </td>
                    {isDirector && (
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditPaymentSelect(p)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            title="To'lovni tahrirlash"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="Foydalanuvchi to'lovini o'chirish"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={isStaff ? (isDirector ? 8 : 7) : (isDirector ? 8 : 7)} className="px-8 py-20 text-center">
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
        ) : (
          /* Fines rendering inside sub-tab */
          <div className="space-y-6">
            {isStaff && (
              <div className="mx-6 mt-6 p-6 bg-[#F5F5F7]/50 border border-[#E4E3E0] rounded-2xl">
                <div className="flex items-center gap-2 text-sm font-bold text-[#141414] mb-4">
                  <Settings size={18} className="text-[#8E9299]" />
                  <span>Yoʻqlama Jarima Narxlarini Sozlash (Faol)</span>
                </div>
                <form onSubmit={handleSaveRates} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E9299] mb-2">Kelmagan kun uchun jarima (so'm)</label>
                    <input 
                      type="number"
                      value={editAbsentFine}
                      onChange={(e) => setEditAbsentFine(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-[#E4E3E0] rounded-xl text-xs font-mono font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                      required
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E9299] mb-2">Kech qolgan kun uchun jarima (so'm)</label>
                    <input 
                      type="number"
                      value={editLateFine}
                      onChange={(e) => setEditLateFine(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-[#E4E3E0] rounded-xl text-xs font-mono font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                      required
                      min={0}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isUpdatingRates}
                    className="w-full px-6 py-2.5 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-[#3E3E3E] disabled:opacity-50 transition-all"
                  >
                    {isUpdatingRates ? "Saqlanmoqda..." : "Narxlarni saqlash"}
                  </button>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              {isStaff ? (
                <table className="w-full text-left">
                  <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                    <tr>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talaba</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Kelmagan dars ({formatCurrency(fineRates.absentFine)})</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Kech qolish ({formatCurrency(fineRates.lateFine)})</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-right">Umumiy Yoʻqlama Jarimasi</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Batafsil / Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E3E0]">
                    {students
                      .filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((student, i) => {
                        const f = calculateFines(student.uid);
                        const isExpanded = expandedStudentId === student.uid;
                        const studentFinesList = attendances.filter(a => a.studentId === student.uid && (a.status === 'absent' || a.status === 'late'));
                        return (
                          <React.Fragment key={student.uid}>
                            <motion.tr 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className="hover:bg-[#F5F5F7]/30 transition-colors"
                            >
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center font-bold text-[10px] text-red-500">
                                    {student.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[#141414] text-xs block">{student.fullName}</span>
                                    <span className="text-[10px] text-[#8E9299] uppercase font-mono font-medium">{student.role}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="font-mono font-bold text-[#141414] text-xs">
                                  {f.absents} marta ({formatCurrency(f.absents * fineRates.absentFine)})
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <span className="font-mono font-bold text-[#141414] text-xs">
                                  {f.lates} marta ({formatCurrency(f.lates * fineRates.lateFine)})
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right font-mono font-bold text-red-600 text-sm">
                                {formatCurrency(f.total)}
                              </td>
                              <td className="px-8 py-5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setExpandedStudentId(isExpanded ? null : student.uid)}
                                    className="p-1.5 border border-[#E4E3E0] hover:bg-[#F5F5F7] rounded-lg text-[#8E9299] hover:text-[#141414] transition-all flex items-center gap-1 text-[10px] font-bold"
                                    title="Darslar bo'yicha batafsil ko'rish"
                                  >
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {isExpanded ? 'Yopish' : 'Koʻrish'} ({studentFinesList.length})
                                  </button>
                                  {studentFinesList.length > 0 && (
                                    <button
                                      onClick={() => handleClearAllStudentFines(student.uid, student.fullName)}
                                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all text-[10px] font-bold flex items-center gap-1"
                                      title="Barcha jarimalarni o'chirish"
                                    >
                                      <Trash2 size={13} />
                                      Tozalash
                                    </button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>

                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="bg-[#F5F5F7]/40 px-12 py-4">
                                  <div className="border border-[#E4E3E0] bg-white rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-4 bg-[#F5F5F7]/50 border-b border-[#E4E3E0] flex justify-between items-center">
                                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E9299]">
                                        {student.fullName} – Jarimalar Ro'yxati
                                      </span>
                                      <span className="text-[10px] font-bold text-red-500 font-mono">
                                        Jami: {formatCurrency(f.total)}
                                      </span>
                                    </div>
                                    <div className="divide-y divide-[#E4E3E0]">
                                      {studentFinesList.map((fat, fatIdx) => {
                                        const isEditing = editingAttendanceId === fat.id;
                                        if (isEditing) {
                                          return (
                                            <div key={fat.id || fatIdx} className="p-4 bg-blue-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs select-none">
                                              <div className="flex flex-wrap items-center gap-4">
                                                {/* Date */}
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-[9px] font-bold text-[#8E9299] uppercase font-mono">Sana</label>
                                                  <input 
                                                    type="date"
                                                    value={editAttDate}
                                                    onChange={e => setEditAttDate(e.target.value)}
                                                    className="px-2 py-1.5 border border-[#E4E3E0] bg-white rounded-lg font-medium text-xs text-[#141414] focus:ring-1 focus:ring-[#141414] focus:outline-none"
                                                  />
                                                </div>
                                                
                                                {/* Course */}
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-[9px] font-bold text-[#8E9299] uppercase font-mono">Kurs</label>
                                                  <select
                                                    value={editAttCourseId}
                                                    onChange={e => setEditAttCourseId(e.target.value)}
                                                    className="px-2 py-1.5 border border-[#E4E3E0] bg-white rounded-lg font-medium text-xs text-[#141414] focus:ring-1 focus:ring-[#141414] focus:outline-none"
                                                  >
                                                    {courses.map(c => (
                                                      <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                  </select>
                                                </div>

                                                {/* Status */}
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-[9px] font-bold text-[#8E9299] uppercase font-mono">Holat / Jarima</label>
                                                  <select
                                                    value={editAttStatus}
                                                    onChange={e => setEditAttStatus(e.target.value as any)}
                                                    className="px-2 py-1.5 border border-[#E4E3E0] bg-white rounded-lg font-medium text-xs text-[#141414] focus:ring-1 focus:ring-[#141414] focus:outline-none"
                                                  >
                                                    <option value="present">Kelgan – Jarimasiz (0 UZS)</option>
                                                    <option value="absent">Kelmagan ({formatCurrency(fineRates.absentFine)})</option>
                                                    <option value="late">Kech qolgan ({formatCurrency(fineRates.lateFine)})</option>
                                                  </select>
                                                </div>
                                              </div>

                                              {/* Actions */}
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => handleSaveAttendanceFine(fat.id, fat)}
                                                  className="px-3 py-2 bg-[#141414] text-white rounded-xl text-[10px] font-bold hover:bg-[#141414]/90 transition"
                                                >
                                                  Saqlash
                                                </button>
                                                <button
                                                  onClick={() => setEditingAttendanceId(null)}
                                                  className="px-3 py-2 bg-white border border-[#E4E3E0] text-[#8E9299] hover:text-[#141414] rounded-xl text-[10px] font-bold hover:bg-[#F5F5F7] transition"
                                                >
                                                  Bekor qilish
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div key={fat.id || fatIdx} className="p-4 flex items-center justify-between hover:bg-[#F5F5F7]/30 transition-all text-xs">
                                            <div className="flex items-center gap-6">
                                              <span className="font-medium text-[#141414]">{fat.date}</span>
                                              <span className="font-bold text-[#141414] bg-[#F5F5F7] px-2.5 py-1 rounded-lg">
                                                {getCourseName(fat.courseId)}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                fat.status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                              }`}>
                                                {fat.status === 'absent' ? 'Kelmagan' : 'Kech qolgan'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <span className="font-mono font-bold text-red-600">
                                                +{formatCurrency(fat.status === 'absent' ? fineRates.absentFine : fineRates.lateFine)}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                <button
                                                  onClick={() => {
                                                    setEditingAttendanceId(fat.id);
                                                    setEditAttDate(fat.date);
                                                    setEditAttStatus(fat.status);
                                                    setEditAttCourseId(fat.courseId);
                                                  }}
                                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                                  title="Sanani va jarima turini tahrirlash"
                                                >
                                                  <Edit2 size={13} />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteAttendanceFine(fat.id)}
                                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                  title="Sana yo'qlamasini o'chirish / Jarimani bekor qilish"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {studentFinesList.length === 0 && (
                                        <p className="p-4 italic text-[#8E9299] text-xs">Jarimalar mavjud emas.</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    {students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-[#8E9299] text-sm font-medium">
                          Talabalar topilmadi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                /* Student's own jarimalar records */
                <table className="w-full text-left">
                  <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                    <tr>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Sana</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Kurs</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Holat</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Jarima miqdori</th>
                      <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Amal (To'lash)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E3E0]">
                    {attendances
                      .filter(a => a.status === 'absent' || a.status === 'late')
                      .filter(a => getCourseName(a.courseId).toLowerCase().includes(searchTerm.toLowerCase()) || a.date.includes(searchTerm))
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((a, idx) => {
                        const fineCost = a.status === 'absent' ? fineRates.absentFine : fineRates.lateFine;
                        return (
                          <tr key={a.id || idx} className="hover:bg-[#F5F5F7]/30 transition-colors">
                            <td className="px-8 py-5 font-medium text-xs text-[#141414]">
                              {a.date}
                            </td>
                            <td className="px-8 py-5 font-bold text-xs text-[#141414]">
                              {getCourseName(a.courseId)}
                            </td>
                            <td className="px-8 py-5">
                              {a.paid ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  Yopilgan (To'langan)
                                </span>
                              ) : (
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  a.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {a.status === 'absent' ? 'Dars Qoldirdi' : 'Kech Qoldi'}
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 font-mono font-bold text-red-600 text-xs">
                              {a.paid ? (
                                <span className="text-emerald-600 line-through">{formatCurrency(fineCost)}</span>
                              ) : (
                                <span>{formatCurrency(fineCost)}</span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-center">
                              {a.paid ? (
                                <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                                  <Sparkles size={12} /> Yopilgan
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePayFine(a)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold active:scale-[0.98] transition-all"
                                >
                                  Balansdan yopish
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {attendances.filter(a => a.status === 'absent' || a.status === 'late').length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                              <Plus size={32} />
                            </div>
                            <p className="text-green-600 text-sm font-bold">Ajoyib! Sizda hech qanday davomat jarimasi yoʻq</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
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
                  <h2 className="text-2xl font-bold text-[#141414]">
                    {editingPaymentId ? "Toʻlovni tahrirlash" : "Toʻlov qabul qilish"}
                  </h2>
                  <p className="text-[#8E9299] text-sm italic">
                    {editingPaymentId ? "Toʻlov summasi va sanalarini oʻzgartirish" : "Moliyaviy operatsiyani roʻyxatdan oʻtkazish"}
                  </p>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Toʻlov oyi</label>
                    <input
                      type="month"
                      required
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Toʻlangan sana</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#141414] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Toʻlov muddati</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#141414] transition-all"
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
