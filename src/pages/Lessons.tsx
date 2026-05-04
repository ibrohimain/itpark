import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Course } from '../types';
import { Play, FileText, ExternalLink, Plus, BookOpen, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  videoUrl?: string;
  documentUrl?: string;
  content: string;
  createdAt: string;
}

const LessonsPage: React.FC = () => {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedCourse, setSelectedCourse] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    const unsubL = firestoreService.subscribeToDocuments<Lesson>('lessons', [], (data) => {
      setLessons(data);
    });
    const unsubC = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
      if (data.length > 0 && !selectedCourse) setSelectedCourse(data[0].id);
    });
    return () => { unsubL(); unsubC(); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await firestoreService.addDocument('lessons', {
      courseId: selectedCourse,
      title,
      content,
      videoUrl,
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setVideoUrl('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Darsni oʻchirib tashlamoqchimisiz?')) {
      await firestoreService.deleteDocument('lessons', id);
    }
  };

  const isStaff = profile?.role === 'director' || 
    ['ustoz', 'yoramchi ustoz', 'direktor o\'rin bosari', 'dasturchi', 'mobilograf', 'backent', 'frontend', 'dizayner', 'xodim III darajali', 'xodim II darajali', 'xodim I darajali', 'staff'].includes(profile?.role || '');

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Nomaʼlum';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Onlayn darslar</h1>
          <p className="text-[#8E9299] text-sm mt-1">Masofaviy taʼlim va video darsliklar</p>
        </div>
        
        {isStaff && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#141414] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Dars yuklash
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {lessons.map((lesson, i) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl border border-[#E4E3E0] shadow-sm overflow-hidden flex flex-col md:flex-row"
          >
            <div className="w-full md:w-48 bg-[#141414] flex items-center justify-center p-8 group">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Play size={24} fill="white" />
              </div>
            </div>
            
            <div className="flex-1 p-8 relative">
              {isStaff && (
                <button 
                  onClick={() => handleDelete(lesson.id)}
                  className="absolute top-4 right-4 text-[#8E9299] hover:text-[#FF4444] p-2 hover:bg-[#FFF5F5] rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <p className="text-[10px] font-mono font-bold text-[#8E9299] uppercase tracking-widest mb-1">{getCourseName(lesson.courseId)}</p>
              <h3 className="text-xl font-bold text-[#141414] mb-3">{lesson.title}</h3>
              <p className="text-sm text-[#8E9299] mb-6 line-clamp-2">{lesson.content}</p>
              
              <div className="flex gap-4">
                {lesson.videoUrl && (
                  <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-[#141414] hover:underline">
                    <ExternalLink size={14} /> Video darsni koʻrish
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
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
              <h2 className="text-2xl font-bold text-[#141414] mb-6">Yangi onlayn dars</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Kurs</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Sarlavha</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Video Link (Youtube/Vimeo)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Qisqacha mazmuni</label>
                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299]">Bekor qilish</button>
                  <button type="submit" className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold">Saqlash</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonsPage;
