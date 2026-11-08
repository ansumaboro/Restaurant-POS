import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Terminal } from 'lucide-react';
import { PinPad } from '../components/PinPad';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithPin, isLocked, getRemainingLockSeconds } = useAuthStore();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lockRemaining, setLockRemaining] = useState<number>(0);

  // If already logged in, redirect directly to billing or prior route
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/billing';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Tick the countdown timer when locked
  useEffect(() => {
    const checkLock = () => {
      if (isLocked()) {
        const remaining = getRemainingLockSeconds();
        setLockRemaining(remaining);
      } else {
        setLockRemaining(0);
      }
    };

    checkLock();
    const timer = setInterval(checkLock, 1000);
    return () => clearInterval(timer);
  }, [isLocked, getRemainingLockSeconds]);

  const handlePinComplete = async (pin: string) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginWithPin(pin);
      if (res.success) {
        const from = (location.state as any)?.from?.pathname || '/billing';
        navigate(from, { replace: true });
      } else {
        setErrorMessage(res.error || 'Authentication failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'System error. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (testPin: string) => {
    if (!isLocked()) {
      handlePinComplete(testPin);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Top Terminal Branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 shadow-xs">
            <Terminal className="w-6 h-6 text-amber-200/90" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 uppercase font-mono">
            Restaurant &amp; Bar POS
          </h1>
          <p className="text-xs text-stone-500 font-mono mt-1 font-medium">
            Commercial Terminal Authentication
          </p>
        </div>

        {/* PIN Pad Container */}
        <div className="w-full bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
          <PinPad
            onComplete={handlePinComplete}
            isLocked={lockRemaining > 0}
            lockRemainingSeconds={lockRemaining}
            errorMessage={errorMessage}
            isLoading={isLoading}
          />

          {/* Quick Staff Credentials for fast evaluation */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-2.5 flex items-center justify-between font-semibold">
              <span>Quick Staff Access (Click to test):</span>
              <span className="text-[10px] text-stone-400 font-normal">PIN</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleQuickFill('1234')}
                disabled={lockRemaining > 0}
                className="p-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-left border border-stone-200 text-stone-800 flex items-center justify-between group disabled:opacity-40 transition-colors"
              >
                <span className="truncate pr-1 text-stone-700 font-semibold group-hover:text-stone-900">Alexander (Mgr)</span>
                <span className="text-stone-900 font-bold shrink-0">1234</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('5678')}
                disabled={lockRemaining > 0}
                className="p-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-left border border-stone-200 text-stone-800 flex items-center justify-between group disabled:opacity-40 transition-colors"
              >
                <span className="truncate pr-1 text-stone-700 font-semibold group-hover:text-stone-900">Sarah (Cashier)</span>
                <span className="text-stone-900 font-bold shrink-0">5678</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('9999')}
                disabled={lockRemaining > 0}
                className="p-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-left border border-stone-200 text-stone-800 flex items-center justify-between group disabled:opacity-40 transition-colors"
              >
                <span className="truncate pr-1 text-stone-700 font-semibold group-hover:text-stone-900">Marcus (Bar)</span>
                <span className="text-stone-900 font-bold shrink-0">9999</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('0000')}
                disabled={lockRemaining > 0}
                className="p-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-slate-200 text-left border border-stone-200 text-stone-800 flex items-center justify-between group disabled:opacity-40 transition-colors"
              >
                <span className="truncate pr-1 text-stone-700 font-semibold group-hover:text-stone-900">Elena (Store)</span>
                <span className="text-stone-900 font-bold shrink-0">0000</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="mt-6 text-center text-[11px] text-stone-500 font-mono flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
          <span>Security Notice: 3 consecutive invalid PINs trigger a 30s hardware lockout.</span>
        </div>
      </div>
    </div>
  );
};
