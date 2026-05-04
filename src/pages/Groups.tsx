import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Group, UserProfile, Course } from '../types';
import { Users, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { motion } from 'motion/react';

const GroupsPage: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', courseId: '', teacherId: '' });

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
    if (window.confirm('Guruhni oʻchirib tashlamoqchimisiz?')) {
      await firestoreService.deleteDocument('groups', id);
    }
  };

  const addStudentToGroup = async (groupId: string, studentId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group && !group.studentIds.includes(studentId)) {
      await firestoreService.updateDocument('groups', groupId, {
        studentIds: [...group.studentIds, studentId]
      });
    }
  };

  const removeStudentFromGroup = async (groupId: string, studentId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      await firestoreService.updateDocument('groups', groupId, {
        studentIds: group.studentIds.filter(id => id !== studentId)
      });
    }
  };

  const isDirectorOrStaff = profile?.role === 'director' || !['student', 'o\'quvchi', 'shogirt', 'user'].includes(profile?.role || '');

  if (!isDirectorOrStaff) {
    return <div className="text-center p-20 font-bold text-[#8E9299]">Ruxsat etilmagan</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Guruhlar</h1>
          <p className="text-[#8E9299] text-sm mt-1">Oʻquv guruhlarini boshqarish va talabalarni joshlash</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all shadow-md"
        >
          <Plus size={20} />
          Yangi guruh
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm max-w-xl"
        >
          <form onSubmit={handleCreateGroup} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2">Guruh nomi</label>
                <input
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414]"
                  placeholder="Masalan: Frontend 001"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2">Kurs</label>
                <select
                  required
                  value={newGroup.courseId}
                  onChange={(e) => setNewGroup({ ...newGroup, courseId: e.target.value })}
                  className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414]"
                >
                  <option value="">Kursni tanlang</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2">Mas'ul Ustoz</label>
                <select
                  required
                  value={newGroup.teacherId}
                  onChange={(e) => setNewGroup({ ...newGroup, teacherId: e.target.value })}
                  className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414]"
                >
                  <option value="">Ustozni tanlang</option>
                  {staff.map(s => <option key={s.uid} value={s.uid}>{s.fullName} ({s.role})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="flex-1 bg-[#141414] text-white py-4 rounded-2xl font-bold">Saqlash</button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 bg-[#F5F5F7] text-[#141414] rounded-2xl font-bold">Bekor qilish</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#F5F5F7] rounded-2xl flex items-center justify-center text-[#141414]">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#141414]">{group.name}</h3>
                  <p className="text-[#8E9299] text-xs font-mono uppercase tracking-tighter">
                    {courses.find(c => c.id === group.courseId)?.name}
                  </p>
                </div>
              </div>
              <button onClick={() => deleteGroup(group.id)} className="text-[#8E9299] hover:text-[#FF4444] p-2 hover:bg-[#FFF5F5] rounded-xl transition-all">
                <Trash2 size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-3">Ustoz</p>
                <div className="flex items-center gap-2 p-3 bg-[#F5F5F7] rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold ring-1 ring-[#E4E3E0]">
                    {staff.find(s => s.uid === group.teacherId)?.fullName.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-[#141414]">
                    {staff.find(s => s.uid === group.teacherId)?.fullName || 'Nomaʼlum'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talabalar ({group.studentIds.length})</p>
                  <div className="relative group">
                    <button className="text-xs font-bold text-[#141414] flex items-center gap-1 hover:underline">
                      <UserPlus size={14} /> Qoʻshish
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#E4E3E0] rounded-2xl shadow-xl z-10 hidden group-focus-within:block max-h-60 overflow-y-auto">
                      {students.filter(s => !group.studentIds.includes(s.uid)).map(s => (
                        <button 
                          key={s.uid}
                          onClick={() => addStudentToGroup(group.id, s.uid)}
                          className="w-full text-left px-4 py-3 hover:bg-[#F5F5F7] text-sm text-[#141414] border-b border-[#F5F5F7] last:border-none"
                        >
                          {s.fullName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.studentIds.map(sid => {
                    const student = students.find(s => s.uid === sid);
                    return (
                      <div key={sid} className="flex items-center justify-between p-2 bg-[#F5F5F7] rounded-lg">
                        <span className="text-xs font-medium text-[#141414] truncate">{student?.fullName || 'Nomaʼlum'}</span>
                        <button onClick={() => removeStudentFromGroup(group.id, sid)} className="text-[#8E9299] hover:text-[#FF4444]">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupsPage;
