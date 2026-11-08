import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  PackagePlus, 
  ClipboardCheck, 
  Lock, 
  Clock,
  Radio
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBillingCartStore } from '../store/billingCartStore';

export const NavigationHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const itemCount = useBillingCartStore((state) => state.getItemCount());

  // Real-time digital clock for commercial shift tracking
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLock = () => {
    logout();
    navigate('/login');
  };

  const roleName = user?.role?.name || 'Staff';

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4 sm:px-6 select-none shadow-sm">
      {/* Brand & Terminal Identifier */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-amber-200/90 text-sm shadow-xs">
            POS
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold tracking-wider uppercase text-stone-200">Terminal 01</span>
            <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1 font-medium">
              <Radio className="w-2.5 h-2.5 text-emerald-400" />
              ONLINE &bull; SUPABASE
            </span>
          </div>
        </div>

        {/* Primary Screen Navigation */}
        <nav className="flex items-center gap-1.5">
          <NavLink
            to="/billing"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs transition-colors ${
                isActive
                  ? 'bg-stone-800 text-stone-100 border border-stone-700 shadow-xs font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-slate-800 font-medium'
              }`
            }
          >
            <Receipt className="w-3.5 h-3.5 text-amber-200/70" />
            <span>Counter Billing</span>
            {itemCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded border border-amber-500/30 font-bold">
                {itemCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/stock-in"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs transition-colors ${
                isActive
                  ? 'bg-stone-800 text-stone-100 border border-stone-700 shadow-xs font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-slate-800 font-medium'
              }`
            }
          >
            <PackagePlus className="w-3.5 h-3.5 text-amber-200/70" />
            <span>Stock-In</span>
          </NavLink>

          <NavLink
            to="/audit"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs transition-colors ${
                isActive
                  ? 'bg-stone-800 text-stone-100 border border-stone-700 shadow-xs font-semibold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-slate-800 font-medium'
              }`
            }
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-amber-200/70" />
            <span>Stock Audit</span>
          </NavLink>
        </nav>
      </div>

      {/* Right Utility: Time, User Badge & Lock Button */}
      <div className="flex items-center gap-4">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-stone-300 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>{timeStr || '--:--:--'}</span>
        </div>

        {/* User & Role Badge */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-stone-200 truncate max-w-[150px]">
                {user.name}
              </div>
              <div className="text-[10px] font-mono text-stone-400 font-medium">
                {roleName}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 border border-slate-700/80 text-stone-300">
              {roleName}
            </span>
          </div>
        )}

        {/* Lock / Sign Out Button */}
        <button
          type="button"
          onClick={handleLock}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-900/60 text-stone-300 border border-slate-700 text-xs font-semibold tracking-wide transition-colors"
          title="Lock terminal and sign out"
        >
          <Lock className="w-3.5 h-3.5 text-stone-400" />
          <span className="font-mono font-bold">LOCK</span>
        </button>
      </div>
    </header>
  );
};
