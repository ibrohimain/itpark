import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Group, UserProfile, Course } from '../types';
import { Users, Plus, Trash2, UserPlus, X, Search, CheckCircle2, UserCircle, GraduationCap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GroupsPage: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', courseId: '', teacherId: '' });
  
  // Advanced Student-to-Group assignment modal state
  const [activeAssignGroup, setActiveAssignGroup] = useState<Group | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  useEffect(() => {
    const unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], setGroups);
    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], setCourses);
    const unsubUsers = firestoreService.subscribeToDocuments<UserProfile>('users', [], (allUsers) => {
      setStudents(allUsers.filter(u => ['student', 'o\'quvchi', 'shogirt'].includes(u.role)));
      setStaff(allUsers.filter(u => !['student', 'o\'quvchi', 'shogirt', 'user'].includes(u.role)));
    });

    return () => {
      unsubGroups();
      unsubCourses();
      unsubUsers();
    };
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const group: Group = {
      id: Math.random().toString(36).substr(2, 9),
      ...newGroup,
      studentIds: [],
      createdAt: new Date().toISOString()
    };
    await firestoreService.setDocument('groups', group.id, group);
    setIsAdding(false);
    setNewGroup({ name: '', courseId: '', teacherId: '' });
  };

  const deleteGroup = async (id: string) => {
    if (window.confirm('Guruhni barcha aʼzolari bilan birga butunlay oʻchirib tashlamoqchimisiz?')) {
      await firestoreService.deleteDocument('groups', id);
    }
  };

  const toggleStudentInGroup = async (groupId: string, studentId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    let updatedIds: string[];
    if (group.studentIds.includes(studentId)) {
      updatedIds = group.studentIds.filter(id => id !== studentId);
    } else {
      updatedIds = [...group.studentIds, studentId];
    }

    await firestoreService.updateDocument('groups', groupId, {
      studentIds: updatedIds
    });

    // Sync state for active modal representation
    if (activeAssignGroup && activeAssignGroup.id === groupId) {
      setActiveAssignGroup({
        ...activeAssignGroup,
        studentIds: updatedIds
      });
    }
  };

  const isDirectorOrStaff = profile?.role === 'director' || !['student', 'o\'quvchi', 'shogirt', 'user'].includes(profile?.role || '');

  if (!isDirectorOrStaff) {
    return <div className="text-center p-20 font-bold text-[#8E9299]">Ruxsat etilmagan</div>;
  }

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
    (courses.find(c => c.id === g.courseId)?.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">O&#39;quv Guruhlari</h1>
          <p className="text-[#8E9299] text-xs mt-1">Sinf darslarida qatnashuvchi talabalar jamoalari tarkibini shakllantirish</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative group w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299] group-focus-within:text-[#141414]" size={15} />
            <input
              type="text"
              placeholder="Guruhlarni qidirish..."
              value={groupSearchQuery}
              onChange={e => setGroupSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4E3E0] rounded-xl text-xs focus:ring-1 focus:ring-[#141414] focus:outline-none"
            />
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#141414] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:scale-[1.01] transition-all shadow-sm"
          >
            <Plus size={16} />
            Yangi Guruh
          </button>
        </div>
      </div>

      {/* Adding Group Modal Form */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] border border-[#E4E3E0] shadow-xl max-w-lg w-full relative"
            >
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 text-[#8E9299] hover:text-[#141414] rounded-lg"
              >
                <X size={18} />
              </button>

              <h3 className="font-extrabold text-xl text-[#141414] mb-4">Mavjud Kurs uchun yangi guruh</h3>
              
              <form onSubmit={handleCreateGroup} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-2 font-mono">Guruh nomi</label>
                  <input
                    type="text"
                    required
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                    placeholder="Masalan: Frontend UX-03"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-2 font-mono">Biriktirilgan Kurs</label>
                  <select
                    required
                    value={newGroup.courseId}
                    onChange={(e) => setNewGroup({ ...newGroup, courseId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  >
                    <option value="">Kursni tanlang</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9299] mb-2 font-mono">Mas'ul Ustoz</label>
                  <select
                    required
                    value={newGroup.teacherId}
                    onChange={(e) => setNewGroup({ ...newGroup, teacherId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  >
                    <option value="">Ustozni tanlang</option>
                    {staff.map(s => <option key={s.uid} value={s.uid}>{s.fullName} ({s.role.toUpperCase()})</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#141414] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#141414]/90 transition">
                    Guruhni Saqlash
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-xs hover:bg-neutral-200 transition">
                    Bekor qilish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Groups Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredGroups.map(group => {
          const course = courses.find(c => c.id === group.courseId);
          const teacher = staff.find(s => s.uid === group.teacherId);
          return (
            <div key={group.id} className="bg-white p-6 rounded-[2rem] border border-[#E4E3E0] shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F7]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#141414] leading-tight">{group.name}</h3>
                      <span className="text-[10px] text-orange-600 font-bold uppercase tracking-widest block font-mono">
                        {course?.name || 'KURS BIRIKTIRILMAGAN'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteGroup(group.id)} 
                    className="text-[#8E9299] hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition"
                    title="Guruhni o'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Supervisor details */}
                <div className="flex items-center justify-between bg-[#F5F5F7]/70 p-3.5 rounded-2xl border border-neutral-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#141414] text-white font-bold text-xs flex items-center justify-center">
                      {teacher?.fullName.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8E9299] font-mono uppercase font-bold block">Mas&#39;ul Ustoz</span>
                      <span className="font-bold text-[#141414]">{teacher?.fullName || 'Nomaʼlum ustoz'}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-white border border-[#E4E3E0] rounded-lg font-bold text-[10px] text-stone-600 capitalize">
                    {teacher?.role || 'Xodim'}
                  </span>
                </div>

                {/* Students list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono text-[#8E9299] tracking-wider">
                      Biriktirilgan Talabalar ({group.studentIds.length})
                    </span>
                    <button 
                      onClick={() => setActiveAssignGroup(group)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-extrabold hover:underline"
                    >
                      <UserPlus size={14} /> Tahrirlash
                    </button>
                  </div>

                  {/* Micro list of students */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {group.studentIds.map(sid => {
                      const student = students.find(s => s.uid === sid);
                      return (
                        <div key={sid} className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs">
                          <span className="font-extrabold text-neutral-700 truncate">{student?.fullName || 'Nomaʼlum'}</span>
                          <button 
                            onClick={() => toggleStudentInGroup(group.id, sid)} 
                            className="text-[#8E9299] hover:text-red-500 p-0.5 rounded-lg"
                            title="Tarkibdan chiqarish"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}

                    {group.studentIds.length === 0 && (
                      <p className="col-span-2 text-center text-[#8E9299] text-xs italic py-4">Guruhda hali biror shogird yo&#39;q.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced Assign Students Modal */}
      <AnimatePresence>
        {activeAssignGroup && (() => {
          const modalGroup = groups.find(g => g.id === activeAssignGroup.id) || activeAssignGroup;
          
          const filteredStudentsToAssign = students.filter(s => 
            s.fullName.toLowerCase().includes(assignSearch.toLowerCase()) || 
            s.email.toLowerCase().includes(assignSearch.toLowerCase())
          );

          return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-[2.5rem] border border-[#E4E3E0] shadow-2xl max-w-lg w-full relative flex flex-col max-h-[85vh]"
              >
                <button 
                  onClick={() => { setActiveAssignGroup(null); setAssignSearch(''); }}
                  className="absolute top-6 right-6 p-2 text-[#8E9299] hover:text-[#141414] rounded-lg"
                >
                  <X size={18} />
                </button>

                <div className="mb-4">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#8E9299]">A&#39;zolarni boshqarish</span>
                  <h3 className="font-black text-xl text-[#141414]">{modalGroup.name} tarkibi</h3>
                  <p className="text-xs text-[#8E9299] mt-0.5">Istagan o&#39;quvchini tanlash/bekor qilish orqali guruh tarkibiga qo&#39;shing yoki undan chetlashtiring.</p>
                </div>

                {/* Assign Search box */}
                <div className="relative group mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9299]" size={14} />
                  <input
                    type="text"
                    placeholder="Talabalarni ismi bo'yicha qidirish..."
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none"
                  />
                </div>

                {/* List scroll panel */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
                  {filteredStudentsToAssign.map(student => {
                    const isEnrolled = modalGroup.studentIds.includes(student.uid);
                    return (
                      <button
                        key={student.uid}
                        onClick={() => toggleStudentInGroup(modalGroup.id, student.uid)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          isEnrolled 
                            ? 'bg-[#141414]/5 border-neutral-300 ring-1 ring-neutral-400' 
                            : 'bg-white border-neutral-100 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isEnrolled ? 'bg-[#141414] text-white' : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-[#141414] block">{student.fullName}</span>
                            <span className="text-[10px] text-[#8E9299] font-mono block mt-0.5">{student.email}</span>
                          </div>
                        </div>
                        {isEnrolled ? (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-bold font-mono tracking-tighter uppercase">Tarkibda</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-400 font-mono">+ Qo&#39;shish</span>
                        )}
                      </button>
                    );
                  })}

                  {filteredStudentsToAssign.length === 0 && (
                    <p className="text-center text-[#8E9299] text-xs italic py-6">Foydalanuvchilar topilmadi.</p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#F5F5F7]">
                  <button 
                    onClick={() => { setActiveAssignGroup(null); setAssignSearch(''); }}
                    className="w-full py-3 bg-[#141414] text-white font-bold text-xs rounded-xl hover:scale-[1.01] transition-all"
                  >
                    O&#39;zgarishlarni Yakunlash ({modalGroup.studentIds.length} talaba)
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default GroupsPage;
