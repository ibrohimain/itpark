import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Schedule, Course } from '../types';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SchedulePage: React.FC = () => {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [courseId, setCourseId] = useState('');
  const [day, setDay] = useState(DAYS[0]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    const unsubSched = firestoreService.subscribeToDocuments<Schedule>('schedules', [], (data) => {
      setSchedules(data);
    });
    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
    });
    return () => { unsubSched(); unsubCourses(); };
  }, []);

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    await firestoreService.addDocument('schedules', {
      courseId,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      room,
      staffId: profile?.uid
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCourseId('');
    setDay(DAYS[0]);
    setStart('');
    setEnd('');
    setRoom('');
  };

  const isStaff = profile?.role === 'director' || !['student', 'o\'quvchi', 'shogirt', 'user'].includes(profile?.role || '');
  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Nomaʼlum kurs';

  const teacherSchedules = schedules.filter(s => s.staffId === profile?.uid);
  const monthlyLessonsCount = teacherSchedules.length * 4;

  const isPastLesson = (s: Schedule) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const nowTime = new Date().toTimeString().slice(0, 5); // HH:mm
    
    const dayIndex = DAYS.indexOf(s.dayOfWeek);
    const todayIndex = DAYS.indexOf(today);
    
    if (dayIndex < todayIndex) return true;
    if (dayIndex === todayIndex) {
      return nowTime > s.endTime;
    }
    return false;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Dars jadvali</h1>
          <p className="text-[#8E9299] text-sm mt-1">Haftalik oʻquv mashgʻulotlari taqvimi</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isStaff && (
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${monthlyLessonsCount >= 15 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#E4E3E0] text-[#141414]'}`}>
              <div className={`w-2 h-2 rounded-full ${monthlyLessonsCount >= 12 && monthlyLessonsCount <= 15 ? 'bg-green-500' : 'bg-[#E4E3E0]'}`}></div>
              <span className="text-sm font-bold">Oylik darslar: {monthlyLessonsCount}/15</span>
            </div>
          )}
          
          {isStaff && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#141414] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={20} />
              Dars qoʻshish
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {DAYS.map((dayName, idx) => {
          const daySchedules = schedules.filter(s => s.dayOfWeek === dayName);
          return (
            <motion.div 
              key={dayName}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-[#E4E3E0] flex flex-col h-full min-h-[400px]"
            >
              <div className="p-4 border-b border-[#E4E3E0] bg-[#F5F5F7]">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#141414]">{dayName.slice(0, 3)}</h4>
              </div>
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {daySchedules.length > 0 ? daySchedules.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(s => {
                  const past = isPastLesson(s);
                  return (
                    <div key={s.id} className={`p-4 rounded-xl shadow-md group relative transition-all ${past ? 'bg-[#F5F5F7] text-[#8E9299] opacity-70' : 'bg-[#141414] text-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold">{getCourseName(s.courseId)}</h5>
                        {past && <span className="text-[8px] font-mono uppercase bg-[#E4E3E0] px-1.5 py-0.5 rounded text-[#141414]">Oʻtildi</span>}
                      </div>
                      <div className="space-y-2 opacity-80">
                        <div className="flex items-center gap-2 text-[10px]">
                          <Clock size={12} />
                          <span>{s.startTime}-{s.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <MapPin size={12} />
                          <span>{s.room}</span>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-[#F5F5F7] rounded-xl p-4">
                    <p className="text-[10px] text-[#8E9299] text-center italic">Darslar yoʻq</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-[#141414] mb-6">Dars jadvalini belgilash</h2>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Kurs</label>
                  <select
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  >
                    <option value="">Kursni tanlang...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Kun</label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                    >
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Xona</label>
                    <input
                      type="text"
                      required
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="Masalan: 302"
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Boshlanishi</label>
                    <input
                      type="time"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Tugashi</label>
                    <input
                      type="time"
                      required
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299]"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold"
                  >
                    Qoʻshish
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

export default SchedulePage;
