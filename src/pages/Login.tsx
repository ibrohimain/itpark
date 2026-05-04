import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { firestoreService } from '../lib/firestoreService';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { LogIn, UserPlus, GraduationCap } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email!,
          fullName: fullName,
          role: 'user', // Default new signups are users
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await firestoreService.setDocument('users', cred.user.uid, newProfile);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      
      // Check if profile exists, if not create as student
      const existingProfile = await firestoreService.getDocument<UserProfile>('users', user.uid);
      if (!existingProfile) {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          fullName: user.displayName || 'Unnamed User',
          role: user.email === 'direktor@gmail.com' ? 'director' : 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await firestoreService.setDocument('users', user.uid, newProfile);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6 bg-[grid-line] bg-[size:40px_40px]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E4E3E0]"
      >
        <div className="p-8 md:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center text-white">
              <GraduationCap size={32} />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-[#141414] text-center mb-2 tracking-tight">
            {isLogin ? 'Xush kelibsiz' : 'Roʻyxatdan oʻtish'}
          </h2>
          <p className="text-[#8E9299] text-center mb-10 text-sm">
            IT Park JizPI talabalar platformasiga kirish
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Ism Familiya</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414] transition-all"
                  placeholder="Ali Valiyev"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414] transition-all"
                placeholder="talaba@jizpi.uz"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-[#8E9299] mb-2 px-1">Parol</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-[#F5F5F7] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414] transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-[#FF4444] px-1 font-medium">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg mt-4"
            >
              {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
              {isLogin ? 'Kirish' : 'Roʻyxatdan oʻtish'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E3E0]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#8E9299] font-mono tracking-widest">Yoki</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white border border-[#E4E3E0] text-[#141414] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#F5F5F7] transition-all"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Google orqali kirish
          </button>

          <p className="mt-8 text-center text-sm text-[#8E9299]">
            {isLogin ? 'Hisobingiz yoʻqmi?' : 'Hisobingiz bormi?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-[#141414] font-bold hover:underline"
            >
              {isLogin ? 'Roʻyxatdan oʻting' : 'Kirish'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
