import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Course, Schedule, Homework, Group, Payment, UserProfile } from '../types';
import { 
  Users, 
  BookOpen, 
  Calendar as CalendarIcon, 
  FileText, 
  Clock, 
  ArrowRight,
  MapPin,
  DollarSign,
  AlertTriangle,
  UserCircle,
  Edit,
  Send,
  Trash2,
  Calendar,
  MessageSquare,
  Sparkles,
  Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(val);
};

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [coursesCount, setCoursesCount] = useState(0);
  const [nextLesson, setNextLesson] = useState<Schedule | null>(null);
  const [activeHomework, setActiveHomework] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [usersCount, setUsersCount] = useState(0);

  // Student fines states
  const [studentFinesSummary, setStudentFinesSummary] = useState<{
    absents: number;
    lates: number;
    total: number;
  }>({ absents: 0, lates: 0, total: 0 });

  const [pointsDeduction, setPointsDeduction] = useState(0);
  const [presentDays, setPresentDays] = useState(0);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullNameIn, setFullNameIn] = useState('');
  const [birthYearIn, setBirthYearIn] = useState('');
  const [ageIn, setAgeIn] = useState('');
  const [bioIn, setBioIn] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Status editing states
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
  const netPoints = Math.max(0, (profile?.points || 0) - pointsDeduction);

  useEffect(() => {
    let unsubUsers = () => {};
    if (profile) {
      unsubUsers = firestoreService.subscribeToDocuments<UserProfile>('users', [], setAllUsers);
      setFullNameIn(profile.fullName || '');
      setBirthYearIn(profile.birthYear ? String(profile.birthYear) : '');
      setAgeIn(profile.age ? String(profile.age) : '');
      setBioIn(profile.bio || '');

      const fetchData = async () => {
        const cs = await firestoreService.listDocuments<Course>('courses');
        setCourses(cs);
        setCoursesCount(cs.length);

        if (isDirector) {
          const payments = await firestoreService.listDocuments<Payment>('payments');
          setTotalRevenue(payments.reduce((sum, p) => sum + p.amount, 0));
          const users = await firestoreService.listDocuments('users');
          setUsersCount(users.length);
        }

        const groups = await firestoreService.listDocuments<Group>('groups');
        const enrolledGroups = groups.filter(g => g.studentIds.includes(profile.uid));
        setUserGroups(enrolledGroups);

        const hw = await firestoreService.listDocuments<Homework>('homework');
        const isStaff = profile.role === 'director' || 
          ['ustoz', 'staff', 'direktor o\'rin bosari'].includes(profile.role);
          
        const filteredHw = isStaff ? hw : hw.filter(h => enrolledGroups.some(g => g.courseId === h.courseId));
        setActiveHomework(filteredHw.slice(0, 3));

        const schedules = await firestoreService.listDocuments<Schedule>('schedules');
        if (schedules.length > 0) {
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const nowTime = new Date().toTimeString().slice(0, 5);
          const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          
          const sorted = schedules.sort((a, b) => {
             const dayDiff = DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek);
             if (dayDiff !== 0) return dayDiff;
             return a.startTime.localeCompare(b.startTime);
          });

          const upcoming = sorted.find(s => {
             const dayIndex = DAYS.indexOf(s.dayOfWeek);
             const todayIndex = DAYS.indexOf(today);
             if (dayIndex > todayIndex) return true;
             if (dayIndex === todayIndex) return s.startTime > nowTime;
             return false;
          });

          setNextLesson(upcoming || sorted[0]);
        }

        // Fetch user personal fines
        try {
          const atts = await firestoreService.listDocuments<any>('attendance');
          const studentAllAtts = atts.filter(a => a.studentId === profile.uid);
          const personalAtts = studentAllAtts.filter(a => (a.status === 'absent' || a.status === 'late'));
          
          const settings = await firestoreService.listDocuments<any>('fineSettings');
          const ratesDoc = settings.find(doc => doc.id === 'rates');
          const absentFine = ratesDoc?.absentFine || 10000;
          const lateFine = ratesDoc?.lateFine || 5000;

          const absents = personalAtts.filter(a => a.status === 'absent').length;
          const lates = personalAtts.filter(a => a.status === 'late').length;
          const presents = studentAllAtts.filter(a => a.status === 'present').length;
          setPresentDays(presents);
          
          setStudentFinesSummary({
            absents,
            lates,
            total: (absents * absentFine) + (lates * lateFine)
          });

          // Points deduction only starts on 21.05.2026
          const penaltyAtts = personalAtts.filter(a => a.date >= '2026-05-21');
          const pAbsents = penaltyAtts.filter(a => a.status === 'absent').length;
          const pLates = penaltyAtts.filter(a => a.status === 'late').length;
          setPointsDeduction((pAbsents * 5) + (pLates * 3));
        } catch (e) {
          console.error("Fines retrieve error on dashboard:", e);
        }
      };
      fetchData();
    }
    return () => {
      unsubUsers();
    };
  }, [profile, isDirector]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingProfile(true);
    try {
      await firestoreService.updateDocument('users', profile.uid, {
        fullName: fullNameIn,
        birthYear: Number(birthYearIn) || null,
        age: Number(ageIn) || null,
        bio: bioIn,
        updatedAt: new Date().toISOString()
      });
      setIsEditingProfile(false);
      alert('Maʼlumotlar muvaffaqiyatli saqlandi!');
    } catch (err) {
      console.error(err);
      alert('Tahrirlashda xatolik yuz berdi.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Aggregate and sort statuses from all users (micro-blog style feed)
  const latestStatuses = React.useMemo(() => {
    const list: { id: string; text: string; createdAt: string; user: { uid: string; fullName: string; role: string } }[] = [];
    allUsers.forEach(u => {
      if (u.statuses && Array.isArray(u.statuses)) {
        u.statuses.forEach(st => {
          list.push({
            id: st.id,
            text: st.text,
            createdAt: st.createdAt || new Date().toISOString(),
            user: {
              uid: u.uid,
              fullName: u.fullName,
              role: u.role
            }
          });
        });
      }
    });
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  }, [allUsers]);

  const handlePublishStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newStatus.trim()) return;
    try {
      const entry = {
        id: Math.random().toString(36).substring(2, 9),
        text: newStatus.trim(),
        createdAt: new Date().toISOString()
      };
      const updatedStatuses = [entry, ...(profile.statuses || [])];
      await firestoreService.updateDocument('users', profile.uid, {
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString()
      });
      setNewStatus('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStatus = async (authorUid: string, statusId: string) => {
    if (!profile) return;
    const isOwner = profile.uid === authorUid;
    const isPrivileged = profile.role === 'director' || profile.role === 'direktor o\'rin bosari';

    if (!isOwner && !isPrivileged) {
      alert("Siz faqatgina o'zingiz yozgan statuslarni o'chira olasiz!");
      return;
    }

    if (window.confirm("Statusni oʻchirmoqchimisiz?")) {
      try {
        const targetUser = allUsers.find(u => u.uid === authorUid);
        if (!targetUser) return;
        const updatedStatuses = (targetUser.statuses || []).filter(s => s.id !== statusId);
        await firestoreService.updateDocument('users', authorUid, {
          statuses: updatedStatuses,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveEditStatus = async (e: React.FormEvent, authorUid: string, statusId: string) => {
    e.preventDefault();
    if (!profile || !editingText.trim()) return;
    try {
      const targetUser = allUsers.find(u => u.uid === authorUid);
      if (!targetUser) return;
      
      const updatedStatuses = (targetUser.statuses || []).map(s => {
        if (s.id === statusId) {
          return {
            ...s,
            text: editingText.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });

      await firestoreService.updateDocument('users', authorUid, {
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString()
      });
      setEditingStatusId(null);
      setEditingText('');
      alert("Status muvaffaqiyatli tahrirlandi!");
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi.");
    }
  };

  const stats = [
    { name: 'Kurslar', value: coursesCount, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: isDirector ? 'Foydalanuvchilar' : 'Guruhlar', value: isDirector ? usersCount : userGroups.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: isDirector ? 'Umumiy tushum' : 'Reyting ballaringiz (Net)', value: isDirector ? formatCurrency(totalRevenue) : `${netPoints} ball`, icon: isDirector ? DollarSign : Trophy, color: isDirector ? 'text-green-600' : 'text-yellow-600', bg: isDirector ? 'bg-green-50' : 'bg-yellow-50' },
    { name: 'Darslar', value: nextLesson ? 1 : 0, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-mono text-[#8E9299] uppercase tracking-widest mb-2"
          >
            Salom, {profile?.fullName.split(' ')[0]} 👋 &bull; {profile?.role.toUpperCase()}
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold text-[#141414] tracking-tight"
          >
            Boshqaruv Paneli
          </motion.h1>
        </div>
        <div 
          className="text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl font-bold flex flex-col items-end shadow-sm"
          title="Ballar: 20 so'm/ball, Davomat: +300 so'm/kun, 40-ballik bonus: +1000 so'm"
        >
          <div className="flex items-center gap-1.5 font-black text-emerald-700">
            <Sparkles size={14} className="animate-pulse" />
            Umumiy balans: {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(
              Math.max(0, (netPoints * 20) + (presentDays * 300) + (new Date().toISOString() >= '2026-06-03' ? Math.floor(netPoints / 40) * 1000 : 0) - (profile?.spentBalance || 0))
            )} UZS
          </div>
          <span className="text-[9px] text-[#8E9299] mt-0.5 font-medium">Batafsil ma'lumotni 'Ranking' (Reyting) bo'limida ko'ring</span>
        </div>
      </header>

      {/* Student warning fines banner */}
      {studentFinesSummary.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-red-900 text-base">Diqqat! Sizda toʻlanmagan yoʻqlama jarimalari mavjud</h3>
              <p className="text-red-700 text-xs mt-1">
                Kelmagan darslar: <strong className="font-mono">{studentFinesSummary.absents} marta</strong>, 
                kechikishlar: <strong className="font-mono">{studentFinesSummary.lates} marta</strong>. 
                Sizning yoʻqlama boʻyicha belgilangan qarz koʻrsatkichi quyida aks etgan.
              </p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[10px] font-mono text-red-500 uppercase font-bold tracking-wider block mb-1">Jami jarima miqdori</span>
            <span className="text-2xl font-bold font-mono text-red-600 bg-white border border-red-100 px-4 py-2 rounded-2xl inline-block shadow-sm">
              {formatCurrency(studentFinesSummary.total)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-[#8E9299] mb-1">{stat.name}</p>
            <p className="text-3xl font-bold text-[#141414] tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Dynamic Profile Creation and Daily Status updates */}
        <div className="lg:col-span-1 space-y-8">
          {/* Shaxsiy ma'lumotlar Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F7]">
              <h3 className="font-bold text-[#141414] text-base flex items-center gap-2">
                <UserCircle size={20} className="text-[#8E9299]" />
                Mening Profilim
              </h3>
              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Profilni tahrirlash"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 font-mono">Ism va Familiya</label>
                  <input 
                    type="text" 
                    required 
                    value={fullNameIn} 
                    onChange={e => setFullNameIn(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 font-mono">Tug&#39;ilgan yili</label>
                    <input 
                      type="number" 
                      placeholder="1999"
                      value={birthYearIn} 
                      onChange={e => setBirthYearIn(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 font-mono">Yoshi</label>
                    <input 
                      type="number" 
                      placeholder="25"
                      value={ageIn} 
                      onChange={e => setAgeIn(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 font-mono">Bio ma&#39;lumotlar</label>
                  <textarea 
                    rows={3}
                    placeholder="O'zingiz haqingizda qisqacha yozing..."
                    value={bioIn} 
                    onChange={e => setBioIn(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs resize-none focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="flex-1 px-4 py-2.5 bg-[#141414] text-white rounded-xl text-xs font-bold hover:scale-[1.02] disabled:opacity-50 transition"
                  >
                    Saqlash
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-200 transition"
                  >
                    Bekor qilish
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-[#141414] text-white rounded-2xl flex items-center justify-center font-black text-lg">
                    {profile?.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#141414] text-sm">{profile?.fullName}</h4>
                    <span className="text-[10px] font-mono text-[#8E9299] uppercase tracking-wider block mt-0.5">{profile?.role || 'Talaba'}</span>
                  </div>
                </div>

                <div className="bg-[#F5F5F7]/60 rounded-2xl p-4 border border-[#E4E3E0]/50 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#8E9299] font-mono">Tug&#39;ilgan yili:</span>
                    <span className="font-bold text-[#141414]">{profile?.birthYear || '—'} yil</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9299] font-mono">Yoshi:</span>
                    <span className="font-bold text-[#141414]">{profile?.age || '—'} yosh</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] font-mono block mb-1">Bio/Ma&#39;lumot:</span>
                    <p className="font-medium text-[#141414] italic">
                      {profile?.bio || "Hali ma'lumot kiritilmagan. Nashr qilish uchun tahrirlash belgisini bosing."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Kunlik Statuslar Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm space-y-4">
            <h3 className="font-bold text-[#141414] text-base flex items-center gap-1">
              <MessageSquare size={18} className="text-orange-500" />
              Kunlik Yangi Statuslar
            </h3>
            
            <form onSubmit={handlePublishStatus} className="flex gap-2">
              <input 
                type="text" 
                required
                placeholder="Bugun nimalar bilan bandsiz?.."
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="flex-1 px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
              />
              <button 
                type="submit"
                className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all"
              >
                <Send size={14} />
              </button>
            </form>

            <div className="space-y-3 font-sans max-h-[19rem] overflow-y-auto pr-1">
              {latestStatuses.length > 0 ? (
                latestStatuses.map((entry) => {
                  const roleColors: Record<string, string> = {
                    director: 'bg-red-50 text-red-700 border-red-100',
                    'direktor o\'rin bosari': 'bg-red-50 text-red-700 border-red-100',
                    ustoz: 'bg-blue-50 text-blue-700 border-blue-100',
                    staff: 'bg-purple-50 text-purple-700 border-purple-100'
                  };
                  const badgeStyle = roleColors[entry.user.role] || 'bg-amber-50 text-amber-800 border-amber-100';

                  return (
                    <motion.div 
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-xl relative group shadow-sm text-xs"
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-extrabold text-[#141414] truncate">{entry.user.fullName}</span>
                          <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-mono font-bold shrink-0 ${badgeStyle}`}>
                            {entry.user.role || 'Talaba'}
                          </span>
                        </div>
                      </div>
                      
                      {editingStatusId === entry.id ? (
                        <form onSubmit={(e) => handleSaveEditStatus(e, entry.user.uid, entry.id)} className="space-y-2 mt-2">
                          <textarea
                            required
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                            rows={2}
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStatusId(null);
                                setEditingText('');
                              }}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-[#8E9299] rounded-lg text-[9px] font-bold transition-all"
                            >
                              Bekor qilish
                            </button>
                            <button
                              type="submit"
                              className="px-2.5 py-1 bg-[#141414] hover:bg-neutral-800 text-white rounded-lg text-[9px] font-bold transition-all"
                            >
                              Saqlash
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p className="text-[#333333] leading-relaxed pr-6">{entry.text}</p>
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#F5F5F7]">
                            <span className="text-[9px] font-mono text-[#8E9299]">
                              {new Date(entry.createdAt).toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {(profile?.uid === entry.user.uid || isDirector) && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => {
                                    setEditingStatusId(entry.id);
                                    setEditingText(entry.text);
                                  }}
                                  className="text-blue-500 hover:text-blue-700 p-1 font-semibold"
                                  title="Tahrirlash"
                                >
                                  <Edit size={11} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteStatus(entry.user.uid, entry.id)}
                                  className="text-red-500 hover:text-red-700 p-1 font-semibold"
                                  title="Statusni o'chirish"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-center text-[#8E9299] text-xs italic py-4">Hali hech kim status nashr qilmadi.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Schedule Table & Homework items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Next Lesson Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#141414]">Dars jadvali</h3>
              <Link to="/schedule" className="text-xs font-bold text-[#141414] flex items-center gap-1 hover:underline">
                Barchasi <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="bg-[#141414] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-8">Navbatdagi dars</p>
                {nextLesson ? (
                  <>
                    <h2 className="text-2xl font-black mb-2">{courses.find(c => c.id === nextLesson.courseId)?.name || 'Dars'}</h2>
                    <p className="text-xs text-white/50 mb-6 font-mono font-bold tracking-wider uppercase">{nextLesson.dayOfWeek}</p>
                    <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-white/40" />
                        <span className="text-xs font-medium">{nextLesson.startTime} - {nextLesson.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-white/40" />
                        <span className="text-xs font-medium">Xona: {nextLesson.room}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm italic text-white/50 py-4">Darslar topilmadi</p>
                )}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            </div>
          </div>

          {/* Side tasks */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#141414]">Navbatdagi amaliy vazifalar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeHomework.length > 0 ? activeHomework.map((hw, i) => (
                <div key={hw.id} className="bg-white p-5 rounded-2xl border border-[#E4E3E0] shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-[#F5F5F7] rounded-xl text-orange-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] line-clamp-1">{hw.title}</h4>
                    <p className="text-xs text-[#8E9299] mt-1 italic">Muddati: {new Date(hw.dueDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#8E9299] italic col-span-2">Amaliy vazifalar yoʻq</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
