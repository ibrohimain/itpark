import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile } from '../types';
import { MessageSquare, Send, Trash2, Search, UserCircle, Sparkles, Filter, Calendar, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatusItem {
  id: string; // status entry id
  text: string;
  createdAt: string;
  user: {
    uid: string;
    fullName: string;
    role: string;
    major?: string;
  };
}

const StatusesPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Status editing states
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    // Subscribe to all users to aggregate their status postings
    const unsub = firestoreService.subscribeToDocuments<UserProfile>('users', [], setUsers);
    return () => unsub();
  }, []);

  // Aggregate and sort statuses chronologically
  const allStatuses: StatusItem[] = React.useMemo(() => {
    const list: StatusItem[] = [];
    users.forEach(u => {
      if (u.statuses && Array.isArray(u.statuses)) {
        u.statuses.forEach(status => {
          list.push({
            id: status.id,
            text: status.text,
            createdAt: status.createdAt || new Date().toISOString(),
            user: {
              uid: u.uid,
              fullName: u.fullName,
              role: u.role,
              major: u.major
            }
          });
        });
      }
    });
    // Newest first
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [users]);

  // Handle publishing a new status entry from this page
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newStatus.trim() || isPublishing) return;
    setIsPublishing(true);
    try {
      const entry = {
        id: Math.random().toString(36).substring(2, 9),
        text: newStatus.trim(),
        createdAt: new Date().toISOString()
      };
      const updatedStatuses = [entry, ...(profile.statuses || [])];
      await firestoreService.updateDocument('users', profile.uid, {
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString()
      });
      setNewStatus('');
    } catch (err) {
      console.error("Status publish error:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle deleting a status (directors can delete anyone's, users can delete their own)
  const handleDeleteStatus = async (authorUid: string, statusId: string) => {
    const targetUser = users.find(u => u.uid === authorUid);
    if (!targetUser) return;

    const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';
    const isOwner = profile?.uid === authorUid;

    if (!isDirector && !isOwner) {
      alert("Sizda faqat o'z statuslaringizni o'chirish huquqi bor!");
      return;
    }

    if (window.confirm("Haqiqatan ham ushbu statusni o'chirib tashlamoqchimisiz?")) {
      try {
        const updatedStatuses = (targetUser.statuses || []).filter(s => s.id !== statusId);
        await firestoreService.updateDocument('users', authorUid, {
          statuses: updatedStatuses,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Status deletion error:", err);
        alert("Xatolik yuz berdi.");
      }
    }
  };

  // Handle saving an edited status entry
  const handleSaveEdit = async (e: React.FormEvent, authorUid: string, statusId: string) => {
    e.preventDefault();
    if (!profile || !editingText.trim()) return;
    try {
      const targetUser = users.find(u => u.uid === authorUid);
      if (!targetUser) return;
      
      const updatedStatuses = (targetUser.statuses || []).map(s => {
        if (s.id === statusId) {
          return {
            ...s,
            text: editingText.trim(),
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });

      await firestoreService.updateDocument('users', authorUid, {
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString()
      });
      setEditingStatusId(null);
      setEditingText('');
      alert("Status muvaffaqiyatli tahrirlandi!");
    } catch (err) {
      console.error("Status edit saving error:", err);
      alert("Tahrirlashda xatolik yuz berdi.");
    }
  };

  // Filter statuses based on search input & role tab selection
  const filteredStatuses = allStatuses.filter(item => {
    const matchesSearch = 
      item.text.toLowerCase().includes(search.toLowerCase()) ||
      item.user.fullName.toLowerCase().includes(search.toLowerCase());
    
    if (selectedRole === 'all') return matchesSearch;
    if (selectedRole === 'staff') {
      return matchesSearch && ['ustoz', 'director', 'direktor o\'rin bosari', 'staff'].includes(item.user.role || '');
    }
    if (selectedRole === 'students') {
      return matchesSearch && ['o\'quvchi', 'student', 'shogirt'].includes(item.user.role || '');
    }
    return matchesSearch;
  });

  const getRoleTagColor = (role: string) => {
    if (role === 'director' || role === 'direktor o\'rin bosari') return 'bg-[#141414] text-white';
    if (['ustoz', 'staff'].includes(role)) return 'bg-blue-50 text-blue-700 border border-blue-100';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#141414] tracking-tight">Statuslar & Fikrlar</h1>
          <p className="text-[#8E9299] text-sm mt-1">
            Xodimlar va talabalarning kunlik fikrlari va jadvallari real-vaqt rejimida barchaga ko&#39;rinadigan ochiq muloqot sahifasi
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 text-xs font-bold w-fit">
          <Sparkles size={14} className="animate-pulse" />
          <span>Real-vaqt faoliyati</span>
        </div>
      </div>

      {/* Post Status widget */}
      {profile && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-[#E4E3E0] shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#8E9299] font-mono">Bugungi statusni e&#39;lon qiling</h3>
          </div>
          <form onSubmit={handlePublish} className="flex gap-3">
            <input 
              type="text"
              required
              placeholder="Hozirgi mashg'ulotlaringiz, darslar haqida yozing (masalan, 'Vazifalarni tugatib, mobil guruhga tayyorgarlik bormoqda')..."
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="flex-1 px-5 py-4 bg-[#F5F5F7] border border-transparent rounded-2xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414] font-medium"
            />
            <button
              type="submit"
              disabled={isPublishing || !newStatus.trim()}
              className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={14} />
              <span>Nashr qilish</span>
            </button>
          </form>
        </motion.div>
      )}

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E3E0] pb-5">
        <div className="flex gap-2 text-xs font-bold font-sans">
          <button
            onClick={() => setSelectedRole('all')}
            className={`px-4 py-2 rounded-xl border transition-all ${
              selectedRole === 'all' 
                ? 'bg-[#141414] text-white border-[#141414]' 
                : 'bg-white text-[#8E9299] border-[#E4E3E0] hover:text-[#141414]'
            }`}
          >
            Barchasi ({allStatuses.length})
          </button>
          <button
            onClick={() => setSelectedRole('staff')}
            className={`px-4 py-2 rounded-xl border transition-all ${
              selectedRole === 'staff' 
                ? 'bg-[#141414] text-white border-[#141414]' 
                : 'bg-white text-[#8E9299] border-[#E4E3E0] hover:text-[#141414]'
            }`}
          >
            Xodimlar & Ustozlar
          </button>
          <button
            onClick={() => setSelectedRole('students')}
            className={`px-4 py-2 rounded-xl border transition-all ${
              selectedRole === 'students' 
                ? 'bg-[#141414] text-white border-[#141414]' 
                : 'bg-white text-[#8E9299] border-[#E4E3E0] hover:text-[#141414]'
            }`}
          >
            Talabalar
          </button>
        </div>

        <div className="relative group max-w-xs w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299] group-focus-within:text-[#141414]" size={15} />
          <input
            type="text"
            placeholder="Status egasi yoki mazmuni..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E3E0] rounded-xl text-xs focus:ring-1 focus:ring-[#141414] focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {/* Message feed stream */}
      <div className="space-y-6">
        <AnimatePresence>
          {filteredStatuses.map((item, index) => {
            const isOwner = profile?.uid === item.user.uid;
            const isDirector = profile?.role === 'director' || profile?.role === 'direktor o\'rin bosari';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.4) }}
                className={`bg-white p-6 rounded-[2rem] border border-[#E4E3E0] shadow-sm relative group hover:border-[#8E9299]/50 transition-all ${
                  isOwner ? 'border-orange-200 bg-orange-50/5' : ''
                }`}
              >
                {/* Header elements */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-sm text-[#141414] border border-[#E4E3E0]/40">
                      {item.user.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#141414] text-sm">{item.user.fullName}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest ${getRoleTagColor(item.user.role)}`}>
                          {item.user.role}
                        </span>
                        {isOwner && (
                          <span className="bg-orange-100 text-orange-800 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Mening statusim</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#8E9299] font-medium font-mono">
                        {item.user.major || 'IT Platform a\'zosi'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#8E9299] flex items-center gap-1.5 font-medium">
                      <Calendar size={12} />
                      {new Date(item.createdAt).toLocaleString('uz-UZ', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {(isOwner || isDirector) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingStatusId(item.id);
                            setEditingText(item.text);
                          }}
                          className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                          title="Tahrirlash"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteStatus(item.user.uid, item.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          title="Ushbu statusni o'chirib tashlash"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Main Body text or edit input field */}
                {editingStatusId === item.id ? (
                  <form onSubmit={(e) => handleSaveEdit(e, item.user.uid, item.id)} className="mt-3 space-y-3 pl-13">
                    <textarea
                      required
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F5F5F7] border border-transparent rounded-xl text-xs focus:bg-white focus:border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414] font-medium"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatusId(null);
                          setEditingText('');
                        }}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-[#8E9299] rounded-xl text-[10px] font-bold transition-all"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-[#141414] hover:bg-neutral-800 text-white rounded-xl text-[10px] font-bold transition-all"
                      >
                        Saqlash
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-sm font-medium text-[#141414] leading-relaxed pl-13">
                    {item.text}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredStatuses.length === 0 && (
          <div className="text-center bg-[#F5F5F7]/40 border border-dashed border-[#E4E3E0] rounded-[2rem] p-16 space-y-3">
            <MessageSquare size={36} className="mx-auto text-[#8E9299]" />
            <h4 className="font-bold text-[#141414] text-sm">Statuslar topilmadi</h4>
            <p className="text-xs text-[#8E9299] max-w-xs mx-auto">Tahrirlab yoki biror so'rov qidirib ko'ring, hali hech qanday statuslar e&#39;lon qilinmagan bo&#39;lishi mumkin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusesPage;
