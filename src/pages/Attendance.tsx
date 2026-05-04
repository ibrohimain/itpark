import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Attendance, Course, UserProfile, Group } from '../types';
import { Check, X, Clock, Calendar as CalendarIcon, Filter, Users, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const AttendancePage: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const isStaff = profile?.role === 'director' || 
    ['ustoz', 'yoramchi ustoz', 'direktor o\'rin bosari', 'dasturchi', 'mobilograf', 'backent', 'frontend', 'dizayner', 'xodim III darajali', 'xodim II darajali', 'xodim I darajali', 'staff'].includes(profile?.role || '');

  useEffect(() => {
    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], setCourses);
    const unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], (data) => {
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) setSelectedGroupId(data[0].id);
    });
    
    if (isStaff) {
      const unsubStudents = firestoreService.subscribeToDocuments<UserProfile>('users', [{ field: 'role', operator: '==', value: 'student' }], setStudents);
      return () => { unsubCourses(); unsubGroups(); unsubStudents(); };
    } else if (profile?.role === 'student' || !isStaff) {
      const unsubAtt = firestoreService.subscribeToDocuments<Attendance>('attendance', [{ field: 'studentId', operator: '==', value: profile?.uid }], setAttendances);
      return () => { unsubCourses(); unsubGroups(); unsubAtt(); };
    }
    return () => { unsubCourses(); unsubGroups(); };
  }, [profile, isStaff]);

  useEffect(() => {
    if (selectedGroupId && selectedDate && isStaff) {
      const group = groups.find(g => g.id === selectedGroupId);
      if (group) {
        const unsubAtt = firestoreService.subscribeToDocuments<Attendance>('attendance', [
          { field: 'courseId', operator: '==', value: group.courseId },
          { field: 'date', operator: '==', value: selectedDate }
        ], setAttendances);
        return () => unsubAtt();
      }
    }
  }, [selectedGroupId, selectedDate, isStaff, groups]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;

    const existing = attendances.find(a => a.studentId === studentId && a.date === selectedDate && a.courseId === group.courseId);
    const data = {
      studentId,
      courseId: group.courseId,
      date: selectedDate,
      status,
      markedBy: profile?.uid,
    };

    if (existing) {
      await firestoreService.updateDocument('attendance', existing.id, data);
    } else {
      await firestoreService.addDocument('attendance', data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'late': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Nomaʼlum kurs';

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupStudents = students.filter(s => selectedGroup?.studentIds.includes(s.uid));

  const markAllStatus = async (status: 'present' | 'absent' | 'late') => {
    if (!selectedGroup) return;
    for (const student of groupStudents) {
      await markAttendance(student.uid, status);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Davomat</h1>
        <p className="text-[#8E9299] text-sm mt-1">Darslarga kelish koʻrsatkichlari tizimi</p>
      </div>

      {isStaff ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Guruhni tanlang</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
              >
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({getCourseName(g.courseId)})</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Sana</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#E4E3E0] bg-[#F5F5F7]/30 flex flex-wrap items-center justify-between gap-4">
               <h3 className="font-bold text-[#141414]">{selectedGroup?.name} roʻyxati</h3>
               <div className="flex gap-2">
                 <button onClick={() => markAllStatus('present')} className="px-4 py-2 bg-green-500 text-white text-[10px] font-bold rounded-xl hover:bg-green-600 transition-all flex items-center gap-1">
                   <Check size={14} /> Hammani keldi deb belgilash
                 </button>
                 <button onClick={() => markAllStatus('absent')} className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-1">
                   <X size={14} /> Hammani yoʻq deb belgilash
                 </button>
               </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                <tr>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talaba</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Holat</th>
                  <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Oʻzgartirish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E3E0]">
                {groupStudents.map((s, i) => {
                  const att = attendances.find(a => a.studentId === s.uid);
                  return (
                    <motion.tr 
                      key={s.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="px-8 py-5 font-bold text-[#141414] text-sm">{s.fullName}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${getStatusColor(att?.status || '')}`}>
                          {att?.status || 'Belgilanmagan'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => markAttendance(s.uid, 'present')} className="px-3 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold border border-green-100">
                            <Check size={14} /> Keldi
                          </button>
                          <button onClick={() => markAttendance(s.uid, 'absent')} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold border border-red-100">
                            <X size={14} /> Yoʻq
                          </button>
                          <button onClick={() => markAttendance(s.uid, 'late')} className="px-3 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold border border-orange-100">
                            <Clock size={14} /> Kech
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attendances.map((att, i) => (
            <motion.div
              key={att.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-mono font-bold text-[#8E9299] uppercase tracking-widest">{getCourseName(att.courseId)}</p>
                <h4 className="text-sm font-bold text-[#141414] mt-1">{att.date}</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${getStatusColor(att.status)}`}>
                {att.status}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
