import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  FileText, 
  GraduationCap, 
  LogOut, 
  LayoutDashboard,
  Menu,
  X,
  Trophy,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import NotificationBell from './NotificationBell';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['*'] },
    { name: 'Courses', path: '/courses', icon: BookOpen, roles: ['*'] },
    { name: 'Statuses', path: '/statuses', icon: MessageSquare, roles: ['*'] },
    { name: 'Lessons', path: '/lessons', icon: FileText, roles: ['staff', 'director', 'o\'quvchi', 'student', 'shogirt'] },
    { name: 'Schedule', path: '/schedule', icon: Calendar, roles: ['*'] },
    { name: 'Homework', path: '/homework', icon: FileText, roles: ['staff', 'director', 'o\'quvchi', 'student', 'shogirt'] },
    { name: 'Attendance', path: '/attendance', icon: CheckSquare, roles: ['staff', 'director'] },
    { name: 'Grades', path: '/grades', icon: GraduationCap, roles: ['staff', 'director', 'o\'quvchi', 'student', 'shogirt'] },
    { name: 'Users', path: '/users', icon: Users, roles: ['staff', 'director'] },
    { name: 'Groups', path: '/groups', icon: Users, roles: ['staff', 'director'] },
    { name: 'Ranking', path: '/ranking', icon: Trophy, roles: ['*'] },
    { name: 'Finance', path: '/finance', icon: CreditCard, roles: ['*'] },
  ];

  const checkRole = (itemRoles: string[]) => {
    if (!profile) return false;
    if (itemRoles.includes('*')) return true;
    
    const directors = ['director', 'direktor o\'rin bosari'];
    const staff = ['ustoz', 'yoramchi ustoz', 'dasturchi', 'mobilograf', 'backent', 'frontend', 'dizayner', 'xodim III darajali', 'xodim II darajali', 'xodim I darajali', 'staff'];
    const students = ['student', 'o\'quvchi', 'shogirt'];

    if (itemRoles.includes('director') && directors.includes(profile.role)) return true;
    if (itemRoles.includes('staff') && (directors.includes(profile.role) || staff.includes(profile.role))) return true;
    if (itemRoles.includes('student') && (directors.includes(profile.role) || staff.includes(profile.role) || students.includes(profile.role))) return true;

    return itemRoles.includes(profile.role);
  };

  const filteredNavItems = navItems.filter(item => checkRole(item.roles));

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E4E3E0] flex-col p-6 sticky top-0 h-screen">
        <div className="mb-10 px-2">
          <h1 className="text-xl font-bold text-[#141414] tracking-tight">IT Park JizPI</h1>
          <p className="text-xs text-[#8E9299] font-mono mt-1 uppercase tracking-widest">Platform v1.0</p>
        </div>

        <nav className="flex-1 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#141414] text-white shadow-lg' 
                    : 'text-[#8E9299] hover:bg-[#F5F5F7] hover:text-[#141414]'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-[#8E9299] group-hover:text-[#141414]'} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#E4E3E0]">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#141414] flex items-center justify-center text-white font-bold text-sm">
              {profile?.fullName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-[#141414] truncate">{profile?.fullName}</p>
              <p className="text-xs text-[#8E9299] capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[#FF4444] hover:bg-[#FFF5F5] transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-[#E4E3E0] p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-lg font-bold text-[#141414]">IT Park JizPI</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[#141414]"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-16 bg-white border-b border-[#E4E3E0] z-40 p-4 shadow-xl"
          >
            <nav className="space-y-1">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#8E9299]"
                >
                  <item.icon size={20} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[#FF4444]"
              >
                <LogOut size={20} />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-h-screen flex flex-col">
        <header className="h-20 bg-white border-b border-[#E4E3E0] hidden md:flex items-center justify-end px-10 gap-4">
          <NotificationBell />
          <div className="h-8 w-px bg-[#E4E3E0]"></div>
          <p className="text-sm font-semibold text-[#141414]">{profile?.fullName}</p>
        </header>
        <div className="flex-1 p-6 md:p-10 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
