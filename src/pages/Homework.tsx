import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Homework, Course, Submission, Group } from '../types';
import { Plus, FileText, Send, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const HomeworkPage: React.FC = () => {
  const { profile } = useAuth();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);

  // Form state
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeHW, setActiveHW] = useState<Homework | null>(null);
  const [content, setContent] = useState('');

  const isStaff = profile?.role === 'director' || 
    ['ustoz', 'yoramchi ustoz', 'direktor o\'rin bosari', 'dasturchi', 'mobilograf', 'backent', 'frontend', 'dizayner', 'xodim III darajali', 'xodim II darajali', 'xodim I darajali', 'staff'].includes(profile?.role || '');

  useEffect(() => {
    const unsubHW = firestoreService.subscribeToDocuments<Homework>('homework', [], (data) => {
      setHomeworks(data);
    });
    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
    });
    
    let unsubGroups = () => {};
    let unsubSub = () => {};

    if (profile) {
      if (!isStaff) {
        unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], (data) => {
          setUserGroups(data.filter(g => g.studentIds.includes(profile.uid)));
        });
        unsubSub = firestoreService.subscribeToDocuments<Submission>('submissions', [{ field: 'studentId', operator: '==', value: profile.uid }], setSubmissions);
      }
    }

    return () => { 
      unsubHW(); 
      unsubCourses(); 
      unsubGroups(); 
      unsubSub(); 
    };
  }, [profile]);

  const handleCreateHW = async (e: React.FormEvent) => {
    e.preventDefault();
    await firestoreService.addDocument('homework', {
      courseId,
      title,
      description: desc,
      dueDate,
      staffId: profile?.uid
    });
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmitHW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHW) return;
    await firestoreService.addDocument('submissions', {
      homeworkId: activeHW.id,
      studentId: profile?.uid,
      content,
      submittedAt: new Date().toISOString(),
    });
    setIsSubmitModalOpen(false);
    setContent('');
  };

  const resetForm = () => {
    setCourseId('');
    setTitle('');
    setDesc('');
    setDueDate('');
  };

  const [expandedHomeworks, setExpandedHomeworks] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedHomeworks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Nomaʼlum kurs';
  const getSubmission = (hwId: string) => submissions.find(s => s.homeworkId === hwId);
  
  const filteredHomeworks = homeworks.filter(hw => {
    if (isStaff) return true;
    return userGroups.some(g => g.courseId === hw.courseId);
  });

  const handleDeleteHW = async (id: string) => {
    if (window.confirm('Vazifani oʻchirib tashlamoqchimisiz?')) {
      await firestoreService.deleteDocument('homework', id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Vazifalar</h1>
          <p className="text-[#8E9299] text-sm mt-1">Oʻquv kurslari boʻyicha uyga vazifalar</p>
        </div>
        
        {isStaff && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#141414] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Yangi vazifa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHomeworks.map((hw, i) => {
          const submission = getSubmission(hw.id);
          const isLate = new Date(hw.dueDate) < new Date() && !submission;
          
          return (
            <motion.div
              key={hw.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm flex flex-col relative"
            >
              {isStaff && (
                <button 
                  onClick={() => handleDeleteHW(hw.id)}
                  className="absolute top-4 right-4 text-[#8E9299] hover:text-[#FF4444] p-2"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-[#F5F5F7] rounded-xl flex items-center justify-center text-[#141414]">
                  <FileText size={20} />
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  submission ? 'bg-green-100 text-green-700' : isLate ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {submission ? (submission.grade ? `Baho: ${submission.grade}` : 'Topshirilgan') : isLate ? 'Muddati oʻtgan' : 'Kutilmoqda'}
                </div>
              </div>
              
              <h4 className="text-xs font-mono font-bold text-[#8E9299] uppercase tracking-widest mb-1">{getCourseName(hw.courseId)}</h4>
              <h3 className="text-lg font-bold text-[#141414] mb-3">{hw.title}</h3>
              <div className="mb-8">
                <p className={`text-sm text-[#8E9299] leading-relaxed transition-all duration-300 ${expandedHomeworks[hw.id] ? '' : 'line-clamp-2'}`}>
                  {hw.description}
                </p>
                {hw.description.length > 80 && (
                  <button 
                    onClick={() => toggleExpand(hw.id)}
                    className="text-xs font-bold text-[#141414] mt-2 hover:underline"
                  >
                    {expandedHomeworks[hw.id] ? 'Yopish' : 'Batafsil oʻqish'}
                  </button>
                )}
              </div>
              
              <div className="mt-auto space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#8E9299]">
                  <Clock size={14} />
                  <span>Muddat: {new Date(hw.dueDate).toLocaleString()}</span>
                </div>
                
                {!isStaff && !submission && (
                  <button
                    onClick={() => { setActiveHW(hw); setIsSubmitModalOpen(true); }}
                    className="w-full bg-[#141414] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Send size={14} />
                    Topshirish
                  </button>
                )}
                
                {submission && (
                  <div className="bg-[#F5F5F7] p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-[10px] font-medium text-[#141414]">Muvaffaqiyatli topshirildi</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-[#141414] mb-6">Yangi vazifa yaratish</h2>
              <form onSubmit={handleCreateHW} className="space-y-4">
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
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Tavsif</label>
                  <textarea
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Muddati</label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299]">Bekor qilish</button>
                  <button type="submit" className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold">Yaratish</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-[#141414] mb-2">{activeHW?.title}</h2>
              <p className="text-[#8E9299] text-sm mb-6">Vazifa yechimini/linkini quyida yozib qoldiring</p>
              <form onSubmit={handleSubmitHW} className="space-y-4">
                <div>
                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    placeholder="Vazifa mazmuni yoki Github linki..."
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl border border-[#E4E3E0] font-bold text-[#8E9299]">Bekor qilish</button>
                  <button type="submit" className="flex-1 bg-[#141414] text-white px-6 py-4 rounded-2xl font-bold">Yuborish</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeworkPage;
