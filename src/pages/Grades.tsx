import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Group, UserProfile } from '../types';
import { Star, Save, Users, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const GradesPage: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], setGroups);
    const unsubUsers = firestoreService.subscribeToDocuments<UserProfile>('users', [], setStudents);
    return () => {
      unsubGroups();
      unsubUsers();
    };
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupStudents = students.filter(s => selectedGroup?.studentIds.includes(s.uid));

  const handleGradeChange = (studentId: string, grade: number) => {
    setGrades(prev => ({ ...prev, [studentId]: grade }));
  };

  const saveGrades = async () => {
    setIsSaving(true);
    try {
      for (const [studentId, grade] of Object.entries(grades)) {
        const student = students.find(s => s.uid === studentId);
        if (student) {
          const currentPoints = student.points || 0;
          await firestoreService.updateDocument('users', studentId, {
            points: currentPoints + grade,
            updatedAt: new Date().toISOString()
          });
          
          await firestoreService.sendNotification(
            studentId, 
            'Yangi baho!', 
            `${selectedGroup?.name} darsidan ${grade} ball oldingiz. Umumiy balingiz: ${currentPoints + grade}`, 
            'grade'
          );
        }
      }
      setGrades({});
      alert('Baholar saqlandi va talabalarga bildirishnoma yuborildi!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const isStaff = profile?.role === 'director' || !['student', 'o\'quvchi', 'shogirt', 'user'].includes(profile?.role || '');

  if (!isStaff) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-[#141414]">Mening Baholarim</h1>
        <div className="bg-white p-8 rounded-3xl border border-[#E4E3E0] text-center">
          <p className="text-[#8E9299]">Reyting boʻlimidan umumiy ballaringizni koʻrishingiz mumkin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Baholash</h1>
          <p className="text-[#8E9299] text-sm mt-1">Darsdan soʻng talabalarni ballar bilan ragʻbatlantiring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#8E9299] px-2">Guruhlar</h3>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                selectedGroupId === g.id 
                  ? 'bg-[#141414] text-white border-[#141414] shadow-lg' 
                  : 'bg-white text-[#141414] border-[#E4E3E0] hover:bg-[#F5F5F7]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span className="font-bold text-sm">{g.name}</span>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selectedGroup ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden"
            >
              <div className="p-6 border-b border-[#F5F5F7] flex items-center justify-between bg-[#F5F5F7]/30">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-[#141414]">{selectedGroup.name} talabalari</h3>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-200">
                    Guruh Reytingi Faol
                  </div>
                </div>
                <button 
                  onClick={saveGrades}
                  disabled={Object.keys(grades).length === 0 || isSaving}
                  className="bg-[#141414] text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-all"
                >
                  <Save size={16} />
                  {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
              
              <div className="divide-y divide-[#F5F5F7]">
                {groupStudents.sort((a, b) => (b.points || 0) - (a.points || 0)).map((student, index) => (
                  <div key={student.uid} className={`p-6 flex items-center justify-between hover:bg-[#F5F5F7]/20 transition-all ${index < 3 ? 'bg-yellow-50/10' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-white shadow-md' : 
                        index === 1 ? 'bg-slate-300 text-white' : 
                        index === 2 ? 'bg-orange-400 text-white' : 
                        'bg-[#E4E3E0] text-[#141414]'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-[#141414] flex items-center gap-2">
                          {student.fullName}
                          {index === 0 && <span className="text-[10px] bg-yellow-400 text-white px-2 py-0.5 rounded-full">Top 1</span>}
                        </p>
                        <p className="text-xs text-[#8E9299]">Umumiy ball: {student.points || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleGradeChange(student.uid, star)}
                          className={`p-2 rounded-lg transition-all ${
                            grades[student.uid] === star ? 'bg-[#141414] text-yellow-400' : 'text-[#E4E3E0] hover:text-[#141414]'
                          }`}
                        >
                          <Star size={20} fill={grades[student.uid] === star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#F5F5F7] rounded-3xl border border-dashed border-[#E4E3E0] p-20 text-center">
              <Users className="mx-auto mb-4 text-[#8E9299]" size={48} />
              <p className="text-[#8E9299]">Baholashni boshlash uchun chapdan guruhni tanlang</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradesPage;
