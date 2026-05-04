import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { UserProfile, UserRole } from '../types';
import { User, Shield, UserCircle, Search, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

const UsersPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (profile?.role === 'director') {
      const unsub = firestoreService.subscribeToDocuments<UserProfile>('users', [], (data) => {
        setUsers(data);
      });
      return () => unsub();
    }
  }, [profile]);

  const updateRole = async (userId: string, newRole: UserRole) => {
    if (window.confirm(`Foydalanuvchi mavqeyini ${newRole} ga oʻzgartirmoqchimisiz?`)) {
      await firestoreService.updateDocument('users', userId, { role: newRole, updatedAt: new Date().toISOString() });
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (profile?.role !== 'director') {
    return <div className="text-center p-20 font-bold text-[#8E9299]">Ruxsat etilmagan</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#141414] tracking-tight">Foydalanuvchilar</h1>
          <p className="text-[#8E9299] text-sm mt-1">Platformadagi barcha foydalanuvchilar va ularning rollari</p>
        </div>

        <div className="relative group max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299] group-focus-within:text-[#141414]" size={18} />
          <input
            type="text"
            placeholder="Qidiruv (ism, email)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-[#E4E3E0] rounded-2xl text-sm focus:ring-2 focus:ring-[#141414] transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E4E3E0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F5F5F7] border-bottom border-[#E4E3E0]">
              <tr>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Foydalanuvchi</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Email</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Rol</th>
                <th className="px-8 py-5 text-xs font-mono uppercase tracking-widest text-[#8E9299]">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E3E0]">
              {filteredUsers.map((u, i) => (
                <motion.tr 
                  key={u.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#141414]">
                        <UserCircle size={20} />
                      </div>
                      <span className="font-bold text-[#141414] text-sm">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-[#8E9299]">{u.email}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      u.role === 'director' ? 'bg-[#141414] text-white' : 
                      u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <select 
                      value={u.role}
                      onChange={(e) => updateRole(u.uid, e.target.value as UserRole)}
                      disabled={u.email === 'direktor@gmail.com'}
                      className="bg-[#F5F5F7] text-xs font-bold border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#141414] disabled:opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="shogirt">Shogirt</option>
                      <option value="yoramchi ustoz">Yordamchi Ustoz</option>
                      <option value="o'quvchi">O'quvchi</option>
                      <option value="ustoz">Ustoz</option>
                      <option value="direktor o'rin bosari">Direktor o'rin bosari</option>
                      <option value="dasturchi">Dasturchi</option>
                      <option value="mobilograf">Mobilograf</option>
                      <option value="backent">Backend</option>
                      <option value="frontend">Frontend</option>
                      <option value="dizayner">Dizayner</option>
                      <option value="xodim III darajali">Xodim III darajali</option>
                      <option value="xodim II darajali">Xodim II darajali</option>
                      <option value="xodim I darajali">Xodim I darajali</option>
                      <option value="director">Director</option>
                      <option value="staff">Staff</option>
                      <option value="student">Student</option>
                    </select>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
