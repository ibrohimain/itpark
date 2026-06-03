import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { Attendance, Course, UserProfile, Group } from '../types';
import { Check, X, Clock, Calendar as CalendarIcon, Filter, Users, ChevronRight, Download, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AttendancePage: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'marking' | 'monitoring'>('marking');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<'week' | 'month'>('month');

  const isStaff = profile?.role === 'director' || 
    ['ustoz', 'yoramchi ustoz', 'direktor o\'rin bosari', 'dasturchi', 'mobilograf', 'backent', 'frontend', 'dizayner', 'xodim III darajali', 'xodim II darajali', 'xodim I darajali', 'staff'].includes(profile?.role || '');

  const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
  const isUstoz = profile?.role === 'ustoz';

  const visibleGroups = React.useMemo(() => {
    return groups.filter(g => {
      if (isDirector) return true;
      if (isUstoz) return g.teacherId === profile?.uid;
      if (profile?.role === 'ustoz' || profile?.role === 'yoramchi ustoz') {
        return g.teacherId === profile?.uid;
      }
      return true;
    });
  }, [groups, profile, isDirector, isUstoz]);

  useEffect(() => {
    if (visibleGroups.length > 0 && (!selectedGroupId || !visibleGroups.some(g => g.id === selectedGroupId))) {
      setSelectedGroupId(visibleGroups[0].id);
    }
  }, [visibleGroups, selectedGroupId]);

  useEffect(() => {
    const unsubCourses = firestoreService.subscribeToDocuments<Course>('courses', [], setCourses);
    const unsubGroups = firestoreService.subscribeToDocuments<Group>('groups', [], (data) => {
      setGroups(data);
    });
    
    if (isStaff) {
      const unsubStudents = firestoreService.subscribeToDocuments<UserProfile>('users', [{ field: 'role', operator: '==', value: 'o\'quvchi' }], setStudents);
      return () => { unsubCourses(); unsubGroups(); unsubStudents(); };
    } else if (!isStaff) {
      const unsubAtt = firestoreService.subscribeToDocuments<Attendance>('attendance', [{ field: 'studentId', operator: '==', value: profile?.uid }], setAttendances);
      return () => { unsubCourses(); unsubGroups(); unsubAtt(); };
    }
    return () => { unsubCourses(); unsubGroups(); };
  }, [profile, isStaff]);

  useEffect(() => {
    if (profile && !isStaff) {
      const unsubAtt = firestoreService.subscribeToDocuments<Attendance>('attendance', [
        { field: 'studentId', operator: '==', value: profile.uid }
      ], (data) => {
        const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
        const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
        setAttendances(data.filter(a => a.date >= start && a.date <= end));
      });
      
      return () => unsubAtt();
    }
  }, [profile, isStaff, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedGroupId && isStaff) {
      const group = visibleGroups.find(g => g.id === selectedGroupId);
      if (group) {
        // Query only by courseId to avoid composite index requirement
        const unsubAtt = firestoreService.subscribeToDocuments<Attendance>('attendance', [
          { field: 'courseId', operator: '==', value: group.courseId }
        ], (data) => {
          if (viewMode === 'marking') {
            setAttendances(data.filter(a => a.date === selectedDate));
          } else {
            const start = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
            const end = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
            setAttendances(data.filter(a => a.date >= start && a.date <= end));
          }
        });
        return () => unsubAtt();
      }
    }
  }, [selectedGroupId, selectedDate, isStaff, visibleGroups, viewMode, selectedMonth, selectedYear]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    const group = visibleGroups.find(g => g.id === selectedGroupId);
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

  const selectedGroup = visibleGroups.find(g => g.id === selectedGroupId);
  const groupStudents = students
    .filter(s => selectedGroup?.studentIds.includes(s.uid))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const markAllStatus = async (status: 'present' | 'absent' | 'late') => {
    if (!selectedGroup) return;
    for (const student of groupStudents) {
      await markAttendance(student.uid, status);
    }
  };

  const getDates = () => {
    const dates = [];
    if (viewMode === 'monitoring') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(selectedYear, selectedMonth, i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else {
      const count = 7;
      const start = new Date();
      start.setDate(start.getDate() - (count - 1));
      for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const monitoringDates = getDates();

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const groupName = isStaff ? (selectedGroup?.name || 'Guruh') : 'Mening';
    const monthName = new Intl.DateTimeFormat('uz-UZ', { month: 'long' }).format(new Date(selectedYear, selectedMonth));
    
    doc.setFontSize(16);
    doc.text(`${groupName} - ${monthName} ${selectedYear} Davomat Hisoboti`, 14, 15);
    
    const tableHeaders = ['Talaba', ...monitoringDates.map(d => d.split('-')[2])];
    
    // If staff, export all group students. If student, export only self.
    const exportStudents = isStaff ? groupStudents : (profile ? [profile] : []);
    
    const tableRows = exportStudents.map(student => {
      const row = [student.fullName || 'Talaba'];
      monitoringDates.forEach(date => {
        const att = attendances.find(a => a.studentId === student.uid && a.date === date);
        if (att) {
          row.push(att.status === 'present' ? '+' : att.status === 'absent' ? '-' : 'k');
        } else {
          row.push('.');
        }
      });
      return row;
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [20, 20, 20] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
    });

    doc.save(`${groupName}_davomat_${monthName}_${selectedYear}.pdf`);
  };

  const changeMonth = (offset: number) => {
    let nextMonth = selectedMonth + offset;
    let nextYear = selectedYear;

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }

    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Davomat</h1>
          <p className="text-[#8E9299] text-sm mt-1">Darslarga kelish koʻrsatkichlari tizimi</p>
        </div>
        
        {isStaff ? (
          <div className="flex bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E4E3E0]">
            <button 
              onClick={() => setViewMode('marking')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'marking' ? 'bg-white text-[#141414] shadow-sm' : 'text-[#8E9299] hover:text-[#141414]'}`}
            >
              Qayd etish
            </button>
            <button 
              onClick={() => setViewMode('monitoring')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'monitoring' ? 'bg-white text-[#141414] shadow-sm' : 'text-[#8E9299] hover:text-[#141414]'}`}
            >
              Monitoring
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E4E3E0] gap-2">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-2 text-[#8E9299] hover:text-[#141414] hover:bg-white rounded-xl transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 py-1.5 bg-white rounded-xl shadow-sm text-xs font-bold text-[#141414] min-w-[120px] text-center">
              {new Intl.DateTimeFormat('uz-UZ', { month: 'long', year: 'numeric' }).format(new Date(selectedYear, selectedMonth))}
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-2 text-[#8E9299] hover:text-[#141414] hover:bg-white rounded-xl transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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
                {visibleGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({getCourseName(g.courseId)})</option>)}
              </select>
            </div>
            
            {viewMode === 'marking' ? (
              <div className="flex-1 space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Sana</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm"
                />
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                <label className="text-xs font-mono font-bold uppercase tracking-widest text-[#8E9299] px-1">Oy va Yil</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => changeMonth(-1)}
                    className="p-4 bg-[#F5F5F7] rounded-2xl text-[#141414] hover:bg-[#E4E3E0] transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="flex-1 px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {new Intl.DateTimeFormat('uz-UZ', { month: 'long' }).format(new Date(2000, i))}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-32 px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm font-bold"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => changeMonth(1)}
                    className="p-4 bg-[#F5F5F7] rounded-2xl text-[#141414] hover:bg-[#E4E3E0] transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {viewMode === 'marking' ? (
            <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#E4E3E0] bg-[#F5F5F7]/30 flex flex-wrap items-center justify-between gap-4">
                 <h3 className="font-bold text-[#141414]">{selectedGroup?.name} roʻyxati ({groupStudents.length} talaba)</h3>
                 <div className="flex gap-2">
                   <button onClick={() => markAllStatus('present')} className="px-4 py-2 bg-green-500 text-white text-[10px] font-bold rounded-xl hover:bg-green-600 transition-all flex items-center gap-1">
                     <Check size={14} /> Hammani keldi
                   </button>
                   <button onClick={() => markAllStatus('absent')} className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-1">
                     <X size={14} /> Hammani yoʻq
                   </button>
                 </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                  <tr>
                    <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Talaba</th>
                    <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Holat</th>
                    <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299] text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E3E0]">
                  {groupStudents.map((s, i) => {
                    const att = attendances.find(a => a.studentId === s.uid && a.date === selectedDate);
                    return (
                      <motion.tr 
                        key={s.uid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`${!att ? 'bg-blue-50/20' : ''} transition-colors`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${!att ? 'bg-blue-100 text-blue-600' : 'bg-[#E4E3E0] text-[#141414]'}`}>
                              {s.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-[#141414] text-sm block">{s.fullName}</span>
                              {!att && <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Belgilash zarur</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${getStatusColor(att?.status || '')}`}>
                            {att?.status || '—'}
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
          ) : (
            <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#F5F5F7] flex items-center justify-between">
                <h3 className="font-bold text-[#141414] flex items-center gap-2">
                  <CalendarIcon size={18} className="text-[#8E9299]" />
                  Davomat Monitoringi ({new Intl.DateTimeFormat('uz-UZ', { month: 'long' }).format(new Date(selectedYear, selectedMonth))} {selectedYear})
                </h3>
                <button 
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-[#141414] text-white text-[10px] font-bold rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Download size={14} /> PDF Yuklash
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F5F7] border-b border-[#E4E3E0]">
                    <tr>
                      <th className="sticky left-0 bg-[#F5F5F7] px-6 py-4 text-[10px] font-mono uppercase tracking-widest text-[#8E9299] min-w-[200px] border-r border-[#E4E3E0]">
                        Talaba Ismi
                      </th>
                      {monitoringDates.map(date => (
                        <th key={date} className="px-3 py-4 text-center min-w-[45px] text-[10px] font-mono text-[#8E9299] border-r border-[#E4E3E0]">
                          {date.split('-').slice(1).reverse().join('/')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E3E0]">
                    {groupStudents.map(student => (
                      <tr key={student.uid} className="hover:bg-[#F5F5F7]/30 transition-colors">
                        <td className="sticky left-0 bg-white px-6 py-3 font-bold text-[#141414] text-xs border-r border-[#E4E3E0] shadow-[5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                          {student.fullName}
                        </td>
                        {monitoringDates.map(date => {
                          const att = attendances.find(a => a.studentId === student.uid && a.date === date);
                          return (
                            <td key={date} className="p-2 border-r border-[#E4E3E0] text-center">
                              {att ? (
                                <div className={`w-6 h-6 mx-auto rounded-lg flex items-center justify-center ${
                                  att.status === 'present' ? 'bg-green-500 text-white' : 
                                  att.status === 'absent' ? 'bg-red-500 text-white' : 
                                  'bg-orange-500 text-white'
                                }`}>
                                  {att.status === 'present' ? <Check size={12} /> : 
                                   att.status === 'absent' ? <X size={12} /> : 
                                   <Clock size={12} />}
                                </div>
                              ) : (
                                <div className="w-1.5 h-1.5 bg-[#E4E3E0] rounded-full mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-[#F5F5F7] border-t border-[#E4E3E0] flex gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-green-500" />
                  <span className="text-[10px] font-bold text-[#8E9299]">Keldi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-red-500" />
                  <span className="text-[10px] font-bold text-[#8E9299]">Kelmagan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-orange-500" />
                  <span className="text-[10px] font-bold text-[#8E9299]">Kechikkan</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#F5F5F7] flex items-center justify-between">
              <h3 className="font-bold text-[#141414] flex items-center gap-2">
                <CalendarIcon size={18} className="text-[#8E9299]" />
                Shaxsiy Davomat Tarixi ({new Intl.DateTimeFormat('uz-UZ', { month: 'long' }).format(new Date(selectedYear, selectedMonth))} {selectedYear})
              </h3>
              <button 
                onClick={handleExportPDF}
                className="px-4 py-2 bg-[#141414] text-white text-[10px] font-bold rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download size={14} /> Tarixni PDF Yuklash
              </button>
            </div>
            
            <div className="p-6 overflow-x-auto">
              <div className="flex flex-wrap gap-2 min-w-[300px]">
                {monitoringDates.map(date => {
                  const att = attendances.find(a => a.date === date);
                  const day = date.split('-')[2];
                  return (
                    <div 
                      key={date}
                      className={`flex flex-col items-center justify-center w-12 h-16 rounded-xl border transition-all ${
                        att?.status === 'present' ? 'bg-green-50 border-green-200 text-green-700' : 
                        att?.status === 'absent' ? 'bg-red-50 border-red-200 text-red-700' : 
                        att?.status === 'late' ? 'bg-orange-50 border-orange-200 text-orange-700' : 
                        'bg-[#F5F5F7] border-[#E4E3E0] text-[#8E9299]'
                      }`}
                    >
                      <span className="text-[10px] font-mono opacity-60 mb-1">{day}</span>
                      {att?.status === 'present' ? <Check size={18} strokeWidth={3} /> : 
                       att?.status === 'absent' ? <X size={18} strokeWidth={3} /> : 
                       att?.status === 'late' ? <Clock size={18} strokeWidth={3} /> : 
                       <div className="w-1.5 h-1.5 bg-[#E4E3E0] rounded-full" />}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 bg-[#F5F5F7]/50 border-t border-[#E4E3E0] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#E4E3E0]">
                <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest mb-1">Keldi</p>
                <p className="text-xl font-bold text-green-600">{attendances.filter(a => a.status === 'present').length} kun</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#E4E3E0]">
                <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest mb-1">Kelmagan</p>
                <p className="text-xl font-bold text-red-600">{attendances.filter(a => a.status === 'absent').length} kun</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#E4E3E0]">
                <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest mb-1">Kechikkan</p>
                <p className="text-xl font-bold text-orange-600">{attendances.filter(a => a.status === 'late').length} kun</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#E4E3E0]">
                <p className="text-[10px] font-bold text-[#8E9299] uppercase tracking-widest mb-1">Davomat %</p>
                <p className="text-xl font-bold text-[#141414]">
                  {attendances.length > 0 
                    ? Math.round((attendances.filter(a => a.status === 'present').length / attendances.length) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attendances.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((att, i) => (
              <motion.div
                key={att.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-mono font-bold text-[#8E9299] uppercase tracking-widest">{getCourseName(att.courseId)}</p>
                  <h4 className="text-sm font-bold text-[#141414] mt-1">{new Date(att.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</h4>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${getStatusColor(att.status)}`}>
                  {att.status === 'present' ? 'Kelgan' : att.status === 'absent' ? 'Yoʻq' : 'Kechikkan'}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
