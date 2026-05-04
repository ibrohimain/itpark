import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Course, CourseRequest } from '../types';
import { Plus, Search, MoreVertical, Trash2, Edit2, BookOpen, Send, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Courses: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseDuration, setCourseDuration] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = firestoreService.subscribeToDocuments<Course>('courses', [], (data) => {
      setCourses(data);
    });
    
    let unsubRequests = () => {};
    if (profile?.role === 'director' || ['ustoz', 'staff'].includes(profile?.role || '')) {
      unsubRequests = firestoreService.subscribeToDocuments<CourseRequest>('courseRequests', [], setRequests);
    }

    return () => {
      unsub();
      unsubRequests();
    };
  }, [profile]);

  const requestEnrollment = async (courseId: string) => {
    if (!profile) return;
    const request: CourseRequest = {
      id: Math.random().toString(36).substr(2, 9),
      courseId,
      userId: profile.uid,
      status: 'pending',
      fullName: profile.fullName,
      createdAt: new Date().toISOString()
    };
    await firestoreService.setDocument('courseRequests', request.id, request);
    alert('Soʻrov yuborildi!');
  };

  const handleRequestStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    await firestoreService.updateDocument('courseRequests', requestId, { status });
    const req = requests.find(r => r.id === requestId);
    if (status === 'accepted' && req) {
      await firestoreService.sendNotification(req.userId, 'Kursga qabul!', `${courses.find(c => c.id === req.courseId)?.name} kursiga soʻrovingiz qabul qilindi.`, 'system');
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const courseData = {
      name: courseName,
      description: courseDesc,
      duration: courseDuration,
      updatedBy: profile?.uid,
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      await firestoreService.updateDocument('courses', editingId, courseData);
    } else {
      await firestoreService.addDocument('courses', {
        ...courseData,
        createdBy: profile?.uid,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Haqiqatdan ham oʻchirmoqchimisiz?')) {
      await firestoreService.deleteDocument('courses', id);
    }
  };

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setCourseName(course.name);
    setCourseDesc(course.description);
    setCourseDuration(course.duration);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setCourseName('');
    setCourseDesc('');
    setCourseDuration('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Kurslar</h1>
          <p className="text-[#8E9299] text-sm mt-1">IT Park platformasidagi mavjud yoʻnalishlar</p>
        </div>
        
        {profile?.role === 'director' && (
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-[#141414] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Yangi kurs
          </button>
        )}
        
        {(profile?.role === 'director' || ['ustoz', 'staff'].includes(profile?.role || '')) && (
          <button
            onClick={() => setIsRequestsOpen(true)}
            className="bg-white border border-[#E4E3E0] text-[#141414] px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-[#F5F5F7] transition-all relative"
          >
            Soʻrovlar
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF4444] text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, i) => {
          const hasRequested = requests.some(r => r.courseId === course.id && r.userId === profile?.uid);
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm flex flex-col group relative"
            >
              <div className="w-14 h-14 bg-[#F5F5F7] rounded-2xl flex items-center justify-center text-[#141414] mb-6 group-hover:bg-[#141414] group-hover:text-white transition-all duration-300">
                <BookOpen size={28} />
              </div>
              
              <h3 className="text-xl font-bold text-[#141414] mb-3">{course.name}</h3>
              <p className="text-sm text-[#8E9299] line-clamp-3 mb-6 leading-relaxed">
                {course.description}
              </p>
              
              <div className="mt-auto pt-6 border-t border-[#E4E3E0] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#141414] tracking-wider uppercase">{course.duration}</span>
                  
                  {profile?.role === 'director' && (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(course)} className="p-2 text-[#8E9299] hover:text-[#141414]">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(course.id)} className="p-2 text-[#FF4444] hover:text-[#CC0000]">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {profile?.role === 'user' && !hasRequested && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => requestEnrollment(course.id)}
                    className="w-full bg-[#141414] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:shadow-none"
                  >
                    <Send size={16} /> Kursga yozilish
                  </motion.button>
                )}

                {hasRequested && (
                  <div className="w-full py-3 rounded-xl text-sm font-bold text-center bg-[#F5F5F7] text-[#8E9299]">
                    Soʻrov yuborilgan
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
              <h2 className="text-2xl font-bold text-[#141414] mb-6">{editingId ? 'Kursni tahrirlash' : 'Yangi kurs qoʻshish'}</h2>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2">Kurs nomi</label>
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2">Tavsif</label>
                  <textarea
                    required
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    rows={4}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2">Davomiyligi (masalan, 3 oy)</label>
                  <input
                    type="text"
                    required
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(e.target.value)}
                    className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                  />
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
                    {editingId ? 'Saqlash' : 'Yaratish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isRequestsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[#F5F5F7] flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#141414]">Kursga soʻrovlar</h2>
                <button onClick={() => setIsRequestsOpen(false)} className="text-[#8E9299] hover:text-[#141414]">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-8 space-y-4">
                {requests.filter(r => r.status === 'pending').length === 0 ? (
                  <p className="text-center text-[#8E9299]">Yangi soʻrovlar yoʻq</p>
                ) : (
                  requests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#141414]">{req.fullName}</p>
                        <p className="text-xs text-[#8E9299]">
                          Kurs: {courses.find(c => c.id === req.courseId)?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRequestStatus(req.id, 'accepted')}
                          className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button 
                          onClick={() => handleRequestStatus(req.id, 'rejected')}
                          className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Courses;
