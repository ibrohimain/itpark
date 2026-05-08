import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Schedule, Course, CalendarEvent } from '../types';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, Search, ChevronLeft, ChevronRight, FilePlus, Trash2, Bell, Info, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SchedulePage: React.FC = () => {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHWModalOpen, setIsHWModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  
  // Week navigation
  const [viewDate, setViewDate] = useState(new Date());

  // Form state
  const [courseId, setCourseId] = useState('');
  const [day, setDay] = useState(DAYS[0]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [room, setRoom] = useState('');

  // Homework Form
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<'holiday' | 'event' | 'trip' | 'meeting'>('event');

  useEffect(() => {
    const unsubSched = firestoreService.subscribeToDocuments<Schedule>('schedules', [], (data) => {
      setSchedules(data);
    });
    const unsubEvents = firestoreService.subscribeToDocuments<CalendarEvent>('events', [], (data) => {
      setEvents(data);
    });
    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
    });
    return () => { unsubSched(); unsubEvents(); unsubCourses(); };
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

  const handleDeleteSchedule = async (id: string | undefined) => {
    if (!id) return;
    if (window.confirm('Haqiqatan ham ushbu darsni oʻchirmoqchimisiz?')) {
      await firestoreService.deleteDocument('schedules', id);
    }
  };

  const handleCreateHW = async (e: React.FormEvent) => {
    e.preventDefault();
    await firestoreService.addDocument('homework', {
      courseId: selectedCourseId,
      title: hwTitle,
      description: hwDesc,
      dueDate: hwDueDate,
      staffId: profile?.uid
    });
    setIsHWModalOpen(false);
    setHwTitle('');
    setHwDesc('');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await firestoreService.addDocument('events', {
      title: eventTitle,
      description: eventDesc,
      date: eventDate,
      type: eventType,
      createdBy: profile?.uid,
      createdAt: new Date().toISOString()
    });
    setIsEventModalOpen(false);
    setEventTitle('');
    setEventDesc('');
    setEventDate('');
  };

  const handleDeleteEvent = async (id: string | undefined) => {
    if (!id) return;
    if (window.confirm('Ushbu tadbirni oʻchirmoqchimisiz?')) {
      await firestoreService.deleteDocument('events', id);
    }
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

  const getWeekRange = () => {
    const d = new Date(viewDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(d.setDate(diff + 6));
    
    return {
      monday,
      sunday,
      days: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return date;
      })
    };
  };

  const weekInfo = getWeekRange();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'holiday': return <CalendarDays size={14} />;
      case 'meeting': return <Bell size={14} />;
      case 'trip': return <MapPin size={14} />;
      default: return <Info size={14} />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-red-500 text-white border-red-600';
      case 'meeting': return 'bg-blue-500 text-white border-blue-600';
      case 'trip': return 'bg-green-500 text-white border-green-600';
      default: return 'bg-orange-500 text-white border-orange-600';
    }
  };

  const isPastLesson = (s: Schedule, lessonDate?: Date) => {
    const now = new Date();
    
    // If we have a specific date for this week's instance
    if (lessonDate) {
      const [hours, minutes] = s.endTime.split(':').map(Number);
      const lessonEnd = new Date(lessonDate);
      lessonEnd.setHours(hours, minutes, 0, 0);
      return now > lessonEnd;
    }

    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    const nowTime = now.toTimeString().slice(0, 5); 
    
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
          <div className="flex bg-white rounded-2xl border border-[#E4E3E0] p-1 shadow-sm">
            <button 
              onClick={() => setViewDate(d => new Date(d.setDate(d.getDate() - 7)))}
              className="p-2 hover:bg-[#F5F5F7] rounded-xl transition-all text-[#8E9299]"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 py-2 flex items-center gap-2">
              <CalendarIcon size={16} className="text-[#141414]" />
              <span className="text-sm font-bold text-[#141414]">
                {weekInfo.monday.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} - {weekInfo.sunday.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <button 
              onClick={() => setViewDate(d => new Date(d.setDate(d.getDate() + 7)))}
              className="p-2 hover:bg-[#F5F5F7] rounded-xl transition-all text-[#8E9299]"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {isStaff && (
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${monthlyLessonsCount >= 15 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#E4E3E0] text-[#141414]'}`}>
              <div className={`w-2 h-2 rounded-full ${monthlyLessonsCount >= 12 && monthlyLessonsCount <= 15 ? 'bg-green-500' : 'bg-[#E4E3E0]'}`}></div>
              <span className="text-sm font-bold">Oylik darslar: {monthlyLessonsCount}/15</span>
            </div>
          )}
          
          {isStaff && (
            <button
              onClick={() => {
                setEventDate(new Date().toISOString().split('T')[0]);
                setIsEventModalOpen(true);
              }}
              className="bg-white text-[#141414] border border-[#E4E3E0] px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-[#F5F5F7] transition-all"
            >
              <CalendarDays size={20} />
              Tadbir qoʻshish
            </button>
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
          const dayDate = weekInfo.days[idx];
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
                <p className="text-[10px] text-[#8E9299] mt-1 font-bold">{dayDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {/* Events for this day */}
                {events.filter(e => e.date === dayDate.toISOString().split('T')[0]).map(event => (
                  <div 
                    key={event.id} 
                    className={`p-3 rounded-xl border shadow-sm relative group ${getEventColor(event.type)}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-[10px]">
                        {getEventIcon(event.type)}
                        <span className="uppercase tracking-wider">{event.type === 'holiday' ? 'Dam olish' : event.type === 'trip' ? 'Sayohat' : event.type === 'meeting' ? 'Yig\'ilish' : 'Tadbir'}</span>
                      </div>
                      {isStaff && (
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                    <h5 className="text-[11px] font-bold leading-tight mb-1">{event.title}</h5>
                    <p className="text-[9px] opacity-90 line-clamp-2 leading-snug">{event.description}</p>
                  </div>
                ))}

                {daySchedules.length > 0 ? daySchedules.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(s => {
                  const past = isPastLesson(s, dayDate);
                  return (
                    <div key={s.id} className={`p-4 rounded-xl shadow-md group relative transition-all ${past ? 'bg-[#F5F5F7] text-[#8E9299] opacity-70' : 'bg-[#141414] text-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold">{getCourseName(s.courseId)}</h5>
                        <div className="flex items-center gap-1">
                          {past && <span className="text-[8px] font-mono uppercase bg-[#E4E3E0] px-1.5 py-0.5 rounded text-[#141414]">Oʻtildi</span>}
                          {isStaff && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchedule(s.id);
                              }}
                              className="p-1 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
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

                      {isStaff && !past && (
                        <button 
                          onClick={() => {
                            setSelectedCourseId(s.courseId);
                            const due = new Date(dayDate);
                            const [h, m] = s.startTime.split(':');
                            due.setHours(parseInt(h), parseInt(m));
                            setHwDueDate(due.toISOString().slice(0, 16));
                            setIsHWModalOpen(true);
                          }}
                          className="absolute -top-2 -right-2 bg-white text-[#141414] p-2 rounded-xl shadow-lg border border-[#E4E3E0] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all hover:bg-[#F5F5F7]"
                          title="Vazifa qo'shish"
                        >
                          <FilePlus size={14} />
                        </button>
                      )}
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

      {/* Homework Creation Modal */}
      <AnimatePresence>
        {isHWModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-[#141414] mb-2">Vazifa tayinlash</h2>
              <p className="text-[#8E9299] text-sm mb-6">{getCourseName(selectedCourseId)} kursi uchun</p>
              
              <form onSubmit={handleCreateHW} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Sarlavha</label>
                  <input
                    type="text"
                    required
                    value={hwTitle}
                    onChange={(e) => setHwTitle(e.target.value)}
                    placeholder="Vazifa nomi..."
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Tavsif</label>
                  <textarea
                    required
                    value={hwDesc}
                    onChange={(e) => setHwDesc(e.target.value)}
                    rows={4}
                    placeholder="Vazifa bo'yicha ko'rsatmalar..."
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Topshirish muddati</label>
                  <input
                    type="datetime-local"
                    required
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsHWModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299]"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold"
                  >
                    Tayinlash
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Creation Modal */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-[#141414] mb-6">Tadbir yoki dam olish kuni</h2>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Turi</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold"
                    >
                      <option value="holiday">Dam olish kuni</option>
                      <option value="event">Tadbir / E'lon</option>
                      <option value="trip">Sayoxat</option>
                      <option value="meeting">Yig'ilish</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Sana</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Sarlavha</label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Tadbir nomi..."
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Tavsif</label>
                  <textarea
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    rows={3}
                    placeholder="Batafsil ma'lumot..."
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299]"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold"
                  >
                    Saqlash
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
