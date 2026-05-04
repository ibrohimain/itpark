import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Course, Schedule, Homework } from '../types';
import { 
  Users, 
  BookOpen, 
  Calendar as CalendarIcon, 
  FileText, 
  Clock, 
  ArrowRight,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [coursesCount, setCoursesCount] = useState(0);
  const [nextLesson, setNextLesson] = useState<Schedule | null>(null);
  const [activeHomework, setActiveHomework] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (profile) {
      // Fetch stats
      const fetchData = async () => {
        const cs = await firestoreService.listDocuments<Course>('courses');
        setCourses(cs);
        setCoursesCount(cs.length);

        const hw = await firestoreService.listDocuments<Homework>('homework');
        setActiveHomework(hw.slice(0, 3));

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
      };
      fetchData();
    }
  }, [profile]);

  const stats = [
    { name: 'Kurslar', value: coursesCount, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Xodimlar', value: 12, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Vazifalar', value: activeHomework.length, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Darslar', value: nextLesson ? 1 : 0, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-10">
      <header>
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs font-mono text-[#8E9299] uppercase tracking-widest mb-2"
        >
          Salom, {profile?.fullName.split(' ')[0]} 👋
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold text-[#141414] tracking-tight"
        >
          Xush kelibsiz
        </motion.h1>
      </header>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Next Lesson Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#141414]">Dars jadvali</h3>
            <Link to="/schedule" className="text-sm font-bold text-[#141414] flex items-center gap-1 hover:underline">
              Barchasi <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="bg-[#141414] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-mono uppercase tracking-widest text-white/60 mb-8">Navbatdagi dars</p>
              {nextLesson ? (
                <>
                  <h2 className="text-3xl font-bold mb-2">{courses.find(c => c.id === nextLesson.courseId)?.name || 'Dars'}</h2>
                  <p className="text-sm text-white/50 mb-6">{nextLesson.dayOfWeek}</p>
                  <div className="flex items-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-white/60" />
                      <span className="text-sm font-medium">{nextLesson.startTime} - {nextLesson.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-white/60" />
                      <span className="text-sm font-medium">Xona: {nextLesson.room}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-lg">Darslar topilmadi</p>
              )}
            </div>
            {/* Abstract Background Shape */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          </div>
        </motion.div>

        {/* Side tasks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <h3 className="text-xl font-bold text-[#141414]">Yangi vazifalar</h3>
          <div className="space-y-4">
            {activeHomework.length > 0 ? activeHomework.map((hw, i) => (
              <div key={hw.id} className="bg-white p-5 rounded-2xl border border-[#E4E3E0] shadow-sm flex items-start gap-4">
                <div className="p-3 bg-[#F5F5F7] rounded-xl text-[#141414]">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#141414] line-clamp-1">{hw.title}</h4>
                  <p className="text-xs text-[#8E9299] mt-1 italic">Muddati: {new Date(hw.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#8E9299] italic">Vazifalar yoʻq</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
