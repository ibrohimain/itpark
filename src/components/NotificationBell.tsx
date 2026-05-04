import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../lib/firestoreService';
import { AppNotification } from '../types';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const unsub = firestoreService.subscribeToDocuments<AppNotification>(
        'notifications',
        [{ field: 'userId', operator: '==', value: user.uid }],
        (data) => {
          setNotifications(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        }
      );
      return () => unsub();
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await firestoreService.updateDocument('notifications', id, { read: true });
  };

  const deleteNotification = async (id: string) => {
    await firestoreService.deleteDocument('notifications', id);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#8E9299] hover:text-[#141414] hover:bg-[#F5F5F7] rounded-xl transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF4444] text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-[#E4E3E0] rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-[#F5F5F7] flex items-center justify-between bg-[#F5F5F7]/50">
                <h3 className="font-bold text-[#141414] text-sm">Bildirishnomalar</h3>
                <button onClick={() => setIsOpen(false)} className="text-[#8E9299] hover:text-[#141414]">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-[#F5F5F7]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#8E9299]">
                    <p className="text-xs">Hozircha xabarlar yoʻq</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 transition-all hover:bg-[#F5F5F7] ${!n.read ? 'bg-[#F5F5F7]/30' : ''}`}
                    >
                      <div className="flex justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          n.type === 'lesson' ? 'text-blue-500' :
                          n.type === 'grade' ? 'text-green-500' :
                          n.type === 'homework' ? 'text-purple-500' :
                          'text-slate-500'
                        }`}>
                          {n.type}
                        </span>
                        <span className="text-[10px] text-[#8E9299]">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className={`text-sm mb-1 ${!n.read ? 'font-bold text-[#141414]' : 'text-[#8E9299]'}`}>
                        {n.title}
                      </h4>
                      <p className="text-xs text-[#8E9299] leading-relaxed mb-3">
                        {n.message}
                      </p>
                      <div className="flex gap-2">
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline underline-offset-2"
                          >
                            <Check size={12} /> Oʻqildi
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="text-[10px] font-bold text-red-600 flex items-center gap-1 hover:underline underline-offset-2"
                        >
                          <Trash2 size={12} /> Oʻchirish
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
