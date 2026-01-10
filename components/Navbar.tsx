
import React from 'react';
import { User, UserRole } from '../types';
import { Home, LogOut, Settings, Award, Users, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: User;
  viewMode?: 'student' | 'parent' | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, viewMode, onLogout }) => {
  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-blue-50 sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
      <Link to="/" className="flex items-center gap-3">
        <div className={`w-12 h-12 bg-gradient-to-br ${viewMode === 'parent' ? 'from-pink-400 to-rose-400' : 'from-blue-400 to-cyan-300'} rounded-2xl flex items-center justify-center text-2xl shadow-lg transform hover:rotate-3 transition-transform`}>
          {viewMode === 'parent' ? '💖' : '🍎'}
        </div>
        <div>
          <span className="font-black text-slate-800 text-lg leading-none block">KidsHealthyMe</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewMode === 'parent' ? 'Parent Insight' : 'Hero Journey'}</span>
        </div>
      </Link>
      
      <div className="flex items-center gap-4">
        {user.role === UserRole.STUDENT && (
          <div className={`flex items-center gap-2 ${viewMode === 'parent' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'} px-4 py-2 rounded-2xl text-xs font-black`}>
            {viewMode === 'parent' ? <Heart size={14} /> : <Award size={14} />}
            <span>{viewMode === 'parent' ? 'โหมดผู้ปกครอง' : 'โหมดนักเรียน'}</span>
          </div>
        )}
        
        {user.role === UserRole.ADMIN && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-xs font-black">
            <Users size={14} />
            <span>ครูผู้ดูแล</span>
          </div>
        )}

        <button 
          onClick={onLogout}
          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
          title="ออกจากระบบ"
        >
          <LogOut size={22} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
