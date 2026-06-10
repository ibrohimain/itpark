import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile, Payment } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Download, 
  Calendar, 
  FileText, 
  Users, 
  Briefcase, 
  ClipboardList, 
  Settings,
  Flame,
  Printer,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ITParkSalary {
  id: string;
  month: string;
  staffId: string;
  staffName: string;
  reason: string;
  amount: number;
  date: string;
  createdAt: string;
}

interface ITParkExpense {
  id: string;
  month: string;
  purpose: string;
  amount: number;
  type: 'standard' | 'computer_service';
  date: string;
  createdAt: string;
}

interface ITParkIncome {
  id: string;
  month: string;
  source: string;
  amount: number;
  type: 'standard' | 'computer_service';
  date: string;
  createdAt: string;
}

interface ITParkSafeDeposit {
  id: string;
  month: string;
  amount: number;
  notes: string;
  date: string;
  createdAt: string;
}

const ITParkFinance: React.FC = () => {
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // e.g. "2026-06"
  
  // Data lists
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  
  const [salaries, setSalaries] = useState<ITParkSalary[]>([]);
  const [expenses, setExpenses] = useState<ITParkExpense[]>([]);
  const [customIncomes, setCustomIncomes] = useState<ITParkIncome[]>([]);
  const [safeDeposits, setSafeDeposits] = useState<ITParkSafeDeposit[]>([]);

  // Form toggles & states
  const [activeTab, setActiveTab] = useState<'sheet' | 'computer' | 'generator'>('sheet');
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSafeModalOpen, setIsSafeModalOpen] = useState(false);

  // Salary Form values
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [salaryReason, setSalaryReason] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDate, setSalaryDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Expense Form values
  const [expensePurpose, setExpensePurpose] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseType, setExpenseType] = useState<'standard' | 'computer_service'>('standard');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Income Form values
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeType, setIncomeType] = useState<'standard' | 'computer_service'>('standard');
  const [incomeDate, setIncomeDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Safe Form values
  const [safeAmount, setSafeAmount] = useState('');
  const [safeNotes, setSafeNotes] = useState('');
  const [safeDate, setSafeDate] = useState(() => new Date().toISOString().slice(0, 10));

  // PDF Generator local state
  const [genDocType, setGenDocType] = useState<'nakladnoy' | 'kelishuv' | 'oylik' | 'xarajat'>('nakladnoy');
  const [genXodimName, setGenXodimName] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [genReason, setGenReason] = useState('');
  const [genAmount, setGenAmount] = useState('');
  const [genDate, setGenDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';

  useEffect(() => {
    // 1. Fetch student payments to sum active student collection
    const unsubPayments = firestoreService.subscribeToDocuments<Payment>('payments', [], (data) => {
      setStudentPayments(data);
    });

    // 2. Fetch staff list for employee salary logs
    const unsubStaff = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
      const filteredStaff = data.filter(u => !['student', 'o\'quvchi', 'shogirt', 'shogird', 'user'].includes(u.role));
      setStaffList(filteredStaff);
    });

    // 3. Keep in sync all the customized director calculations
    const unsubSalaries = firestoreService.subscribeToDocuments<ITParkSalary>('itpark_salaries', [], setSalaries);
    const unsubExpenses = firestoreService.subscribeToDocuments<ITParkExpense>('itpark_expenses', [], setExpenses);
    const unsubIncomes = firestoreService.subscribeToDocuments<ITParkIncome>('itpark_incomes', [], setCustomIncomes);
    const unsubSafe = firestoreService.subscribeToDocuments<ITParkSafeDeposit>('itpark_safe', [], setSafeDeposits);

    return () => {
      unsubPayments();
      unsubStaff();
      unsubSalaries();
      unsubExpenses();
      unsubIncomes();
      unsubSafe();
    };
  }, []);

  if (!isDirector) {
    return (
      <div className="text-center p-20">
        <h2 className="text-xl font-bold text-red-600">Alidatsiya Rad Etildi!</h2>
        <p className="text-[#8E9299] text-sm mt-2">Bu boʻlim faqat Tizim Direktori uchun faollashtirilgan.</p>
      </div>
    );
  }

  // Segment current selections by selectedMonth (e.g., "2026-06")
  const currentStudentPayments = studentPayments.filter(p => p.month === selectedMonth && p.status === 'paid');
  const currentSalaries = salaries.filter(s => s.month === selectedMonth);
  const currentExpenses = expenses.filter(e => e.month === selectedMonth);
  const currentIncomes = customIncomes.filter(i => i.month === selectedMonth);
  const currentSafeDeposits = safeDeposits.filter(s => s.month === selectedMonth);

  // Computed Values
  // A. Total Student Payments
  const totalStudentPaymentsVal = currentStudentPayments.reduce((acc, curr) => acc + curr.amount, 0);

  // B. Computer Services Revenues
  const totalCompIncomesVal = currentIncomes
    .filter(i => i.type === 'computer_service')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // C. General/Standard Custom Revenues
  const totalStandardCustomIncomesVal = currentIncomes
    .filter(i => i.type === 'standard')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // D. Total Revenue (Umumiy tushum): Student repayments + comp service tushumi + standard custom incomes.
  const totalRevenueVal = totalStudentPaymentsVal + totalCompIncomesVal + totalStandardCustomIncomesVal;

  // E. IT Park 20% royalty payment
  const itParkRoyaltyVal = Math.round(totalRevenueVal * 0.20);

  // F. Salaries paid to instructors/employees
  const totalSalariesVal = currentSalaries.reduce((acc, curr) => acc + curr.amount, 0);

  // G. Custom standard expenses (excluding computer services)
  const totalStandardExpensesVal = currentExpenses
    .filter(e => e.type === 'standard')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // H. Computer services expenses
  const totalCompExpensesVal = currentExpenses
    .filter(e => e.type === 'computer_service')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Total overall expenses: salaries + general expenses + comp service expenses
  const totalExpensesSum = totalSalariesVal + totalStandardExpensesVal + totalCompExpensesVal;

  // I. Net Profit (Sof foida - "sof foida it park foizi tushumdan qolgan pul" or revenue - it park royalty)
  const netProfitVal = Math.max(0, totalRevenueVal - itParkRoyaltyVal);

  // J. Remaining Cash (Qolgan pul): Revenue - Royalty 20% - salaries - custom expenses
  const remainingCashVal = Math.max(0, totalRevenueVal - itParkRoyaltyVal - totalSalariesVal - totalStandardExpensesVal - totalCompExpensesVal);

  // K. Deposited to safe of computer/general
  const totalSafeDepositsVal = currentSafeDeposits.reduce((acc, curr) => acc + curr.amount, 0);

  // Format Helper
  const formatUZS = (val: number) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
  };

  // Submit Handlers
  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const stNode = staffList.find(s => s.uid === selectedStaffId);
    if (!stNode) return;

    const payload: ITParkSalary = {
      id: Math.random().toString(36).substr(2, 9),
      month: selectedMonth,
      staffId: selectedStaffId,
      staffName: stNode.fullName,
      reason: salaryReason,
      amount: Number(salaryAmount),
      date: salaryDate,
      createdAt: new Date().toISOString()
    };

    await firestoreService.addDocument('itpark_salaries', payload);
    setIsSalaryModalOpen(false);
    setSelectedStaffId('');
    setSalaryReason('');
    setSalaryAmount('');
    alert("Oylik maosh rekordi muvaffaqiyatli saqlandi!");
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ITParkExpense = {
      id: Math.random().toString(36).substr(2, 9),
      month: selectedMonth,
      purpose: expensePurpose,
      amount: Number(expenseAmount),
      type: expenseType,
      date: expenseDate,
      createdAt: new Date().toISOString()
    };

    await firestoreService.addDocument('itpark_expenses', payload);
    setIsExpenseModalOpen(false);
    setExpensePurpose('');
    setExpenseAmount('');
    alert("Xarajat muvaffaqiyatli saqlandi!");
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ITParkIncome = {
      id: Math.random().toString(36).substr(2, 9),
      month: selectedMonth,
      source: incomeSource,
      amount: Number(incomeAmount),
      type: incomeType,
      date: incomeDate,
      createdAt: new Date().toISOString()
    };

    await firestoreService.addDocument('itpark_incomes', payload);
    setIsIncomeModalOpen(false);
    setIncomeSource('');
    setIncomeAmount('');
    alert("Qo'shimcha tushum muvaffaqiyatli saqlandi!");
  };

  const handleAddSafeDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ITParkSafeDeposit = {
      id: Math.random().toString(36).substr(2, 9),
      month: selectedMonth,
      amount: Number(safeAmount),
      notes: safeNotes,
      date: safeDate,
      createdAt: new Date().toISOString()
    };

    await firestoreService.addDocument('itpark_safe', payload);
    setIsSafeModalOpen(false);
    setSafeAmount('');
    setSafeNotes('');
    alert("Seyfga pul solish rekordi yuklandi!");
  };

  // Delete Handlers
  const handleDeleteSalary = async (id: string) => {
    if (window.confirm("Maosh to'lovini bekor qilmoqchimisiz?")) {
      await firestoreService.deleteDocument('itpark_salaries', id);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm("Xarajat qaydini o'chirmoqchimisiz?")) {
      await firestoreService.deleteDocument('itpark_expenses', id);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (window.confirm("Ushbu tushum qaydini o'chirmoqchimisiz?")) {
      await firestoreService.deleteDocument('itpark_incomes', id);
    }
  };

  const handleDeleteSafeDeposit = async (id: string) => {
    if (window.confirm("Seyfdagi ushbu qaydni o'chirmoqchimisiz?")) {
      await firestoreService.deleteDocument('itpark_safe', id);
    }
  };

  // PDF Document Sign Generator
  const generateAgreementPDF = () => {
    const doc = new jsPDF();
    
    // Header Decor
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("IT PARK JIZPI RAQAMLI PLATFORMASI", 14, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RASMIY SHARTNOMA VA NAKLADNOY HUJJATLAR", 14, 32);

    // Body Text
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    
    let docTypeUz = '';
    if (genDocType === 'nakladnoy') docTypeUz = 'TUSHUM NAKLADOYI (INVOICE VOUCHER)';
    if (genDocType === 'kelishuv') docTypeUz = 'TIZIM IKKI TOMONLAMA KELISHUV SHARTNOMASI';
    if (genDocType === 'oylik') docTypeUz = 'XODIM OYLIK MAOSh TO\'LOV MAKTUBI';
    if (genDocType === 'xarajat') docTypeUz = 'RASMIY XARAJAT KASSA ORDERI (EXPENSE ORDER)';
    
    doc.text(`${docTypeUz}`, 14, 55);
    doc.setFontSize(10);
    doc.text(`Hujjat Raqami: IT-PK-${Math.floor(1000 + Math.random() * 9000)}`, 14, 63);
    doc.text(`Sana: ${genDate}`, 14, 69);
    
    // Draw horizontal separator line
    doc.setDrawColor(228, 227, 224);
    doc.line(14, 75, 196, 75);

    // Content
    doc.setFont("helvetica", "bold");
    doc.text("1. ISHTIROKCHILAR:", 14, 85);
    doc.setFont("helvetica", "normal");
    doc.text(`- Tizim Rahbari: ${profile?.fullName || 'IT Park Director'}`, 20, 93);
    doc.text(`- Mas'ul Xodim / Hamkor: ${genXodimName || 'Boshqa tomon'}`, 20, 99);

    doc.setFont("helvetica", "bold");
    doc.text("2. HUJJAT MAQSADI VA TAVSIFI:", 14, 110);
    doc.setFont("helvetica", "normal");
    doc.text(`- Sarlavha: ${genTitle || 'Moliya hujjati'}`, 20, 118);
    doc.text(`- Tafsilot: ${genReason || 'Hujjatda keltirilgan moliya o\'tkazmalari uchun belgilangan'}`, 20, 124);
    doc.text(`- Pul Miqdori: ${formatUZS(Number(genAmount) || 0)} UZS`, 20, 130);

    doc.setFont("helvetica", "bold");
    doc.text("3. SHARTLAR VA KELISHUV MATNI:", 14, 142);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Ushbu rasmiy hujjat IT Park JizPI tizim boshqaruvi tomonidan tasdiqlangan bo'lib,", 14, 150);
    doc.text("kirim va chiqim operatsiyalarining qonuniyligini ko'rsatadi. Har qanday moliyaviy o'zgarishlar,", 14, 155);
    doc.text("tizim ma'lumotlar bazasida doimiy saqlanadi va ushbu qog'oz nusxasi imzolangan paytdan boshlab kuchga kiradi.", 14, 160);
    doc.text("Xodim va tashkilot rahbari o'rtasida munosabatlar to'la tartibga solingan.", 14, 165);

    // Draw box for dynamic seal and signatures
    doc.rect(14, 180, 182, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TARAFLARNING IMZOLARI SOHASI (SIGNATURE AREA)", 18, 188);
    
    doc.setFont("helvetica", "normal");
    doc.text("Tizim Rahbari (Director):", 20, 202);
    doc.text("_________________________", 20, 210);
    doc.text("(Imzo, Muhr o'rni)", 20, 216);

    doc.text("Xodim / Hamkor (Signee):", 120, 202);
    doc.text("_________________________", 120, 210);
    doc.text("(Imzo, Muhr o'rni)", 120, 216);

    doc.save(`ITPARK_DOC_${genDocType.toUpperCase()}_${genDate}.pdf`);
    alert("PDF Hujjat muvaffaqiyatli tayyorlandi va yuklab olindi!");
  };

  return (
    <div className="space-y-8" id="itpark_finance_page">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E4E3E0]">
        <div>
          <h2 className="text-2xl font-extrabold text-[#141414] tracking-tight">IT Park JizPI Moliya Markazi</h2>
          <p className="text-xs text-[#8E9299] mt-1 uppercase font-mono tracking-widest">Faqat hisobot beruvchi Direktor uchun</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-[#F5F5F7] p-2 rounded-2xl">
          <Calendar size={16} className="text-[#8E9299] ml-2" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#141414] focus:outline-none pr-2 py-1"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E4E3E0] gap-4">
        <button
          onClick={() => setActiveTab('sheet')}
          className={`pb-4 px-2 font-bold text-xs transition relative ${
            activeTab === 'sheet' ? 'text-[#141414]' : 'text-[#8E9299]'
          }`}
        >
          Moliya Balance Varaqasi
          {activeTab === 'sheet' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#141414] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('computer')}
          className={`pb-4 px-2 font-bold text-xs transition relative ${
            activeTab === 'computer' ? 'text-[#141414]' : 'text-[#8E9299]'
          }`}
        >
          Kompyuter Xizmatlari
          {activeTab === 'computer' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#141414] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`pb-4 px-2 font-bold text-xs transition relative ${
            activeTab === 'generator' ? 'text-[#141414]' : 'text-[#8E9299]'
          }`}
        >
          Shartnoma & Nakladnoylar Generatori
          {activeTab === 'generator' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#141414] rounded-full" />}
        </button>
      </div>

      {/* RENDER TAB content */}
      <AnimatePresence mode="wait">
        {activeTab === 'sheet' && (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Balance Spreadsheet Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Card 1: Total Revenue */}
              <div className="bg-white p-6 rounded-3xl border border-[#E4E3E0]">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-[#8E9299] font-medium">1. Jami Tushum ({selectedMonth})</span>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-[#141414]">{formatUZS(totalRevenueVal)}</h3>
                <div className="text-[10px] text-[#8E9299] mt-2 space-y-1 font-mono">
                  <p>O'quvchilardan: {formatUZS(totalStudentPaymentsVal)}</p>
                  <p>Kompyuterdan: {formatUZS(totalCompIncomesVal)}</p>
                  <p>Qo'shimcha: {formatUZS(totalStandardCustomIncomesVal)}</p>
                </div>
              </div>

              {/* Card 2: IT Park 20% Percent check */}
              <div className="bg-[#FFFDF5] p-6 rounded-3xl border border-amber-200">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-amber-800 font-semibold">2. IT Park 20% To&#39;lovi</span>
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <Flame size={16} />
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-amber-800">{formatUZS(itParkRoyaltyVal)}</h3>
                <p className="text-[9px] text-[#8E9299] mt-2">Umumiy tushumdan shartnomaviy 20% royalty ajratmasi</p>
              </div>

              {/* Card 3: Sof Foyda */}
              <div className="bg-[#F5FFF8] p-6 rounded-3xl border border-emerald-200">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-emerald-800 font-semibold">3. Sof Foyda</span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-emerald-800">{formatUZS(netProfitVal)}</h3>
                <p className="text-[9px] text-[#8E9299] mt-2">IT Park 20% foizi chiqarib tashlanganidan keyingi daromad</p>
              </div>

              {/* Card 4: Qolgan pul */}
              <div className="bg-neutral-900 p-6 rounded-3xl text-white relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="text-xs text-neutral-300 font-medium">4. Sof Qolgan Pul</span>
                  <div className="p-2.5 bg-neutral-800 text-white rounded-xl">
                    <DollarSign size={16} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-white relative z-10">{formatUZS(remainingCashVal)}</h3>
                <div className="text-[10px] text-neutral-400 mt-2 relative z-10 space-y-0.5 font-mono">
                  <p>Maoshlar: -{formatUZS(totalSalariesVal)}</p>
                  <p>Xarajatlar: -{formatUZS(totalStandardExpensesVal + totalCompExpensesVal)}</p>
                </div>
              </div>
            </div>

            {/* Sub-block for Seyf (Vault) */}
            <div className="bg-[#FAFAFB] p-6 rounded-3xl border border-[#E4E3E0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-neutral-100 rounded-2xl text-neutral-800">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#141414]">Jami Seyfga joylangan mablag&#39;: {formatUZS(totalSafeDepositsVal)}</h4>
                  <p className="text-xs text-[#8E9299]">Seyfga topshirilgan jami naqd pullar reyestri</p>
                </div>
              </div>
              <button
                onClick={() => setIsSafeModalOpen(true)}
                className="bg-[#141414] hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus size={14} /> Seyfga Pul Solish
              </button>
            </div>

            {/* Multi-Section Accounting List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* STAFF SALARIES LEDGER */}
              <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#F5F5F7] flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[#141414] font-mono tracking-wider">Xodim Maoshlari</h3>
                    <p className="text-[10px] text-[#8E9299]">Oylik, mukofot va rag&#39;batlantirishlar</p>
                  </div>
                  <button
                    onClick={() => setIsSalaryModalOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-bold bg-[#141414] hover:bg-neutral-800 text-white px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus size={12} /> Maosh Qo&#39;shish
                  </button>
                </div>
                <div className="divide-y divide-[#F5F5F7] max-h-80 overflow-y-auto">
                  {currentSalaries.map(s => (
                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-neutral-50">
                      <div>
                        <p className="text-xs font-bold text-[#141414]">{s.staffName}</p>
                        <p className="text-[10px] text-[#8E9299] mt-0.5">Sana: {s.date} | Sabab: <span className="text-[#333333] italic">{s.reason}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-red-600">-{formatUZS(s.amount)}</span>
                        <button onClick={() => handleDeleteSalary(s.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentSalaries.length === 0 && (
                    <p className="text-center p-8 text-xs text-[#8E9299] italic">Ushbu oy uchun maoshlar kiritilmadi.</p>
                  )}
                </div>
              </div>

              {/* XARAJATLAR (EXPENSES) LEDGER */}
              <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#F5F5F7] flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[#141414] font-mono tracking-wider">Tizim Xarajatlari (Kassadan)</h3>
                    <p className="text-[10px] text-[#8E9299]">Kompyuter, ijara yoki ofis xarajatlari</p>
                  </div>
                  <button
                    onClick={() => {
                      setExpenseType('standard');
                      setIsExpenseModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold bg-[#141414] hover:bg-neutral-800 text-white px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus size={12} /> Xarajat Kirish
                  </button>
                </div>
                <div className="divide-y divide-[#F5F5F7] max-h-80 overflow-y-auto">
                  {currentExpenses.map(e => (
                    <div key={e.id} className="p-4 flex justify-between items-center hover:bg-neutral-50">
                      <div>
                        <p className="text-xs font-bold text-[#141414]">{e.purpose}</p>
                        <p className="text-[10px] text-[#8E9299] mt-0.5">
                          Sana: {e.date} | Turi: <span className="capitalize text-neutral-600">{e.type === 'computer_service' ? 'Kompyuter xizmat' : 'Umumiy'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-neutral-800">-{formatUZS(e.amount)}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentExpenses.length === 0 && (
                    <p className="text-center p-8 text-xs text-[#8E9299] italic">Ushbu oy uchun xarajatlar kiritilmadi.</p>
                  )}
                </div>
              </div>

              {/* SEYF (SAFE DEPOSIT) HISTORY */}
              <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#F5F5F7] bg-gray-50/50">
                  <h3 className="text-xs font-black uppercase text-[#141414] font-mono tracking-wider">Seyfga kirim qilingan pullar</h3>
                  <p className="text-[10px] text-[#8E9299]">Arxivlangan seyf amallari</p>
                </div>
                <div className="divide-y divide-[#F5F5F7] max-h-80 overflow-y-auto">
                  {currentSafeDeposits.map(s => (
                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-neutral-50">
                      <div>
                        <p className="text-xs font-bold text-[#141414]">{formatUZS(s.amount)}</p>
                        <p className="text-[10px] text-[#8E9299] mt-0.5">Sana: {s.date} | Izoh: <span className="italic">{s.notes}</span></p>
                      </div>
                      <button onClick={() => handleDeleteSafeDeposit(s.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {currentSafeDeposits.length === 0 && (
                    <p className="text-center p-8 text-xs text-[#8E9299] italic">Seyfga mablag' solinmagan.</p>
                  )}
                </div>
              </div>

              {/* CUSTOM INCOMES SECTION */}
              <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#F5F5F7] flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[#141414] font-mono tracking-wider">Boshqa Tushumlar / Kurs tashqari</h3>
                    <p className="text-[10px] text-[#8E9299]">Kompaniya qo&#39;shimcha aylanmalari</p>
                  </div>
                  <button
                    onClick={() => {
                      setIncomeType('standard');
                      setIsIncomeModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold bg-[#141414] hover:bg-neutral-800 text-white px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus size={12} /> Tushum Qo&#39;shish
                  </button>
                </div>
                <div className="divide-y divide-[#F5F5F7] max-h-80 overflow-y-auto">
                  {currentIncomes.filter(i => i.type === 'standard').map(inc => (
                    <div key={inc.id} className="p-4 flex justify-between items-center hover:bg-neutral-50">
                      <div>
                        <p className="text-xs font-bold text-[#141414]">{inc.source}</p>
                        <p className="text-[10px] text-[#8E9299] mt-0.5">Sana: {inc.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-emerald-600">+{formatUZS(inc.amount)}</span>
                        <button onClick={() => handleDeleteIncome(inc.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentIncomes.filter(i => i.type === 'standard').length === 0 && (
                    <p className="text-center p-8 text-xs text-[#8E9299] italic">Qo'shimcha kirimlar mavjud emas.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'computer' && (
          <motion.div
            key="computer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Computer Services Layout */}
            <div className="bg-white p-6 rounded-3xl border border-[#E4E3E0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#141414]">Kompyuter Xizmatlari Reyestri</h3>
                <p className="text-xs text-[#8E9299]">Kompyuter xizmat ko&#39;rsatishidan olinadigan tushumlar va unga hisoblangan xarajatlar</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIncomeType('computer_service');
                    setIsIncomeModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus size={12} /> Tushum Qo&#39;shish
                </button>
                <button
                  onClick={() => {
                    setExpenseType('computer_service');
                    setIsExpenseModalOpen(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus size={12} /> Xarajat Qo&#39;shish
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* COMP SERVICES TUSHUMLAR */}
              <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#F5F5F7] bg-emerald-50/50">
                  <h4 className="text-xs font-black uppercase text-[#141414] font-mono tracking-wider text-emerald-800">Kompyuter Xizmati Tushumlari</h4>
                </div>
                <div className="divide-y divide-[#F5F5F7] max-h-96 overflow-y-auto">
                  {currentIncomes.filter(i => i.type === 'computer_service').map(inc => (
                    <div key={inc.id} className="p-4 flex justify-between items-center hover:bg-neutral-50">
                      <div>
                        <p className="text-xs font-bold text-[#141414]">{inc.source}</p>
                        <p className="text-[10px] text-[#8E9299] mt-0.5">Sana: {inc.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-emerald-600">+{formatUZS(inc.amount)}</span>
                        <button onClick={() => handleDeleteIncome(inc.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentIncomes.filter(i => i.type === 'computer_service').length === 0 && (
                    <p className="text-center p-8 text-xs text-[#8E9299] italic">Ushbu oyda kompyuter xizmat tushumlari mavjud emas.</p>
                  )}
                </div>
              </div>

              {/* COMP SERVICES XARAJATLAR */}
              <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden">
                <div className="p-6 border-b border-[#F5F5F7] bg-red-50/50">
                  <h4 className="text-xs font-black uppercase text-[#141414] font-mono tracking-wider text-red-800">Kompyuter Xizmati Xarajatlari</h4>
                </div>
                <div className="divide-y divide-[#F5F5F7] max-h-96 overflow-y-auto">
                  {currentExpenses.filter(e => e.type === 'computer_service').map(exp => (
                    <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-neutral-50">
                      <div>
                        <p className="text-xs font-bold text-[#141414]">{exp.purpose}</p>
                        <p className="text-[10px] text-[#8E9299] mt-0.5">Sana: {exp.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-red-600">-{formatUZS(exp.amount)}</span>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentExpenses.filter(e => e.type === 'computer_service').length === 0 && (
                    <p className="text-center p-8 text-xs text-[#8E9299] italic">Ushbu oyda kompyuter xizmat xarajatlari kiritilmadi.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'generator' && (
          <motion.div
            key="generator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Dedicated Signature PDF Generator Form - Alohida joy */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-[#E4E3E0] space-y-5">
              <h3 className="text-sm font-bold text-[#141414] font-mono uppercase tracking-wider">Hujjat Parametrlari</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-[#8E9299] uppercase pr-2 font-mono mb-2">Hujjat Turi</label>
                <select
                  value={genDocType}
                  onChange={(e) => setGenDocType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                >
                  <option value="nakladnoy">Kirim Nakladnosi / To&#39;lov Hujjati</option>
                  <option value="kelishuv">Ikki Tomonlama Kelishuv Shartnomasi</option>
                  <option value="oylik">Xodim Oylik Maosh Voucheri</option>
                  <option value="xarajat">Kassa Chiqim Xarajat Orderi</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9299] uppercase pr-2 font-mono mb-2">Xodim / Hamkor To&#39;liq F.I.SH</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Umar Abdullayev"
                  value={genXodimName}
                  onChange={(e) => setGenXodimName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9299] uppercase pr-2 font-mono mb-2">Hujjat Sarlavhasi / Mavzu</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Frontend oylik to'lovi"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9299] uppercase pr-2 font-mono mb-2">Pul Miqdori (UZS)</label>
                <input
                  type="number"
                  required
                  placeholder="Masalan: 1200000"
                  value={genAmount}
                  onChange={(e) => setGenAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9299] uppercase pr-2 font-mono mb-2">Izoh / Tafsilotlar</label>
                <textarea
                  rows={3}
                  placeholder="Qo'shimcha kelishuv shartlarini yoki nakladnoy bandlarini belgilang..."
                  value={genReason}
                  onChange={(e) => setGenReason(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8E9299] uppercase pr-2 font-mono mb-2">Imzo Quyilish Sanasi</label>
                <input
                  type="date"
                  value={genDate}
                  onChange={(e) => setGenDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                />
              </div>

              <button
                onClick={generateAgreementPDF}
                className="w-full py-3 bg-[#141414] hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Download size={14} /> PDF Tayyorlash & Yuklash
              </button>
            </div>

            {/* Template preview area */}
            <div className="lg:col-span-2 bg-[#F5F5F7] p-8 rounded-3xl border border-[#E4E3E0] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-wider mb-6">Bosma Shartnoma Interaktiv Vizualizatsiyasi (Ko&#39;rinishi)</h3>
                
                <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-md space-y-6 aspect-[1/1.4] overflow-hidden text-[#141414]">
                  {/* Mock print header */}
                  <div className="flex border-b pb-4 items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black tracking-tight uppercase">IT PARK JIZPI TIZIMI</h4>
                      <p className="text-[9px] text-[#8E9299] font-mono">ID: IT-PK-{Math.floor(1000 + Math.random() * 9000)}</p>
                    </div>
                    <FileCheck className="text-neutral-800" size={24} />
                  </div>

                  {/* Mock content fields */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase underline">
                      {genDocType === 'nakladnoy' ? 'Kirim Nakladnosi' : genDocType === 'kelishuv' ? 'Kelishuv Shartnomasi' : genDocType === 'oylik' ? 'Oylik Maosh Voucheri' : 'Chiqim Xarajat Orderi'}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <p className="text-[#8E9299]">Tizim rahbari:</p>
                        <p className="font-bold">{profile?.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[#8E9299]">Qabul qiluvchi / Xodim:</p>
                        <p className="font-bold">{genXodimName || '_____________________'}</p>
                      </div>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-[10px] space-y-2">
                      <div className="flex justify-between font-bold border-b pb-1.5">
                        <span>Hujjat sarlavhasi / Maqsad</span>
                        <span>Summa</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>{genTitle || 'Kurs faoliyati hisob-kitoblari'}</span>
                        <span className="font-mono">{formatUZS(Number(genAmount) || 0)}</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 italic pt-1 border-t">{genReason || 'Qo\'shimcha izoh mavjud emas'}</p>
                    </div>

                    <div className="text-[9px] text-neutral-400">
                      Ushbu hujjat kassa amaliyotlari va shartnomalar me'yoriga mos ravishda tayyorlangan va har ikki tarafning imzolovchi vakillari tomonidan tasdiqlanishi kutilmoqda.
                    </div>
                  </div>

                  {/* Mock Footer signatures */}
                  <div className="flex justify-between pt-10 text-[9px] border-t border-dashed">
                    <div className="text-center">
                      <p className="text-[#8E9299]">Tizim Rahbari Imzosi: (Muhr)</p>
                      <p className="font-mono mt-4">_______________________</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[#8E9299]">Hamkor / Xodim Imzosi:</p>
                      <p className="font-mono mt-4">_______________________</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-[10px] text-[#8E9299] text-center mt-6">Hujjatlarni yuklab olganingizdan so&#39;ng, xodim va tizim rahbari jismoniy imzolab, arxivda saqlab boradi.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Salary Addition Drawer / Modal */}
      <AnimatePresence>
        {isSalaryModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2rem] border border-[#E4E3E0] shadow-2xl max-w-sm w-full relative"
            >
              <h3 className="font-extrabold text-[#141414] text-base mb-4">Oylik maosh to&#39;lovini yozish</h3>

              <form onSubmit={handleAddSalary} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Xodimni tanlang</label>
                  <select
                    required
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  >
                    <option value="">Hamkor/Xodimni tanlang</option>
                    {staffList.map(s => <option key={s.uid} value={s.uid}>{s.fullName} ({s.role})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">To&#39;lov Miqdori (UZS)</label>
                  <input
                    type="number"
                    required
                    placeholder="Masalan: 1500000"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Sabab / O&#39;tilgan darslar / Mukofot</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: May oyi uchun 16 ta dars to'lovi"
                    value={salaryReason}
                    onChange={(e) => setSalaryReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Sanasi</label>
                  <input
                    type="date"
                    required
                    value={salaryDate}
                    onChange={(e) => setSalaryDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#141414] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition">
                    Tasdiqlash
                  </button>
                  <button type="button" onClick={() => setIsSalaryModalOpen(false)} className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-xs hover:bg-neutral-200 transition">
                    Bekor qilish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2rem] border border-[#E4E3E0] shadow-2xl max-w-sm w-full relative"
            >
              <h3 className="font-extrabold text-[#141414] text-base mb-4">Xarajat qaydini yozish</h3>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Xarajat maqsadi</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Ofis uchun ruchka va daftarlar"
                    value={expensePurpose}
                    onChange={(e) => setExpensePurpose(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Miqdori (UZS)</label>
                  <input
                    type="number"
                    required
                    placeholder="Masalan: 45000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Turi</label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  >
                    <option value="standard">Umumiy IT Park Chiqimi</option>
                    <option value="computer_service">Kompyuter xizmati chiqimi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Sanalari</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#141414] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition">
                    Saqlash
                  </button>
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-xs hover:bg-neutral-200 transition">
                    Bekor qilish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Income Modal */}
      <AnimatePresence>
        {isIncomeModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2rem] border border-[#E4E3E0] shadow-2xl max-w-sm w-full relative"
            >
              <h3 className="font-extrabold text-[#141414] text-base mb-4">Kirim/Tushum yozish</h3>

              <form onSubmit={handleAddIncome} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Tushum Manbasi</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Windows 11 o'rnatish tushumi"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Tushum Summasi (UZS)</label>
                  <input
                    type="number"
                    required
                    placeholder="Masalan: 120000"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Tushum Turi</label>
                  <select
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  >
                    <option value="standard">Umumiy IT Park Kirimi</option>
                    <option value="computer_service">Kompyuter xizmati kirimi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Sanasi</label>
                  <input
                    type="date"
                    required
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#141414] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition">
                    Tasdiqlash
                  </button>
                  <button type="button" onClick={() => setIsIncomeModalOpen(false)} className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-xs hover:bg-neutral-200 transition">
                    Bekor qilish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Safe Deposit Modal */}
      <AnimatePresence>
        {isSafeModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2rem] border border-[#E4E3E0] shadow-2xl max-w-sm w-full relative"
            >
              <h3 className="font-extrabold text-[#141414] text-base mb-4">Seyfga mablag&#39; topshirish</h3>

              <form onSubmit={handleAddSafeDeposit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Summa (UZS)</label>
                  <input
                    type="number"
                    required
                    placeholder="Masalan: 500000"
                    value={safeAmount}
                    onChange={(e) => setSafeAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Izohlar / Topshiruvchi</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: May oyi qolgan kassasi seyfga"
                    value={safeNotes}
                    onChange={(e) => setSafeNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase font-mono mb-1.5">Sanalari</label>
                  <input
                    type="date"
                    required
                    value={safeDate}
                    onChange={(e) => setSafeDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#141414] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-neutral-800 transition">
                    Topshirish
                  </button>
                  <button type="button" onClick={() => setIsSafeModalOpen(false)} className="px-4 py-2.5 bg-neutral-100 text-[#141414] rounded-xl font-bold text-xs hover:bg-neutral-200 transition">
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

export default ITParkFinance;
