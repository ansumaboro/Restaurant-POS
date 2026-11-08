import React, { useState, useEffect, useCallback } from 'react';
import { Delete, RotateCcw, Lock, ShieldAlert, KeyRound } from 'lucide-react';

interface PinPadProps {
  onComplete: (pin: string) => Promise<void> | void;
  isLocked: boolean;
  lockRemainingSeconds: number;
  errorMessage?: string | null;
  isLoading?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({
  onComplete,
  isLocked,
  lockRemainingSeconds,
  errorMessage,
  isLoading = false,
}) => {
  const [pin, setPin] = useState<string>('');

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLocked || isLoading) return;
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          onComplete(nextPin);
        }
      }
    },
    [pin, isLocked, isLoading, onComplete]
  );

  const handleDelete = useCallback(() => {
    if (isLocked || isLoading) return;
    setPin((prev) => prev.slice(0, -1));
  }, [isLocked, isLoading]);

  const handleClear = useCallback(() => {
    if (isLocked || isLoading) return;
    setPin('');
  }, [isLocked, isLoading]);

  // Global physical keyboard listener for desktop 10-key pads, keyboards, barcode scanners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || isLoading) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 4) {
          onComplete(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleClear, isLocked, isLoading, pin, onComplete]);

  // Clear pin on lock
  useEffect(() => {
    if (isLocked) {
      setPin('');
    }
  }, [isLocked]);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center select-none">
      {/* Masked PIN Display */}
      <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-5 mb-5 flex flex-col items-center justify-center shadow-xs">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-3 flex items-center gap-1.5 font-semibold">
          <KeyRound className="w-3.5 h-3.5 text-stone-500" />
          <span>Enter 4-Digit Staff PIN</span>
        </div>

        {/* 4 Masked PIN Indicator Dots */}
        <div className="flex items-center gap-4 my-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-5 h-5 rounded-full transition-all duration-150 flex items-center justify-center ${
                  isFilled
                    ? 'bg-stone-900 border-2 border-stone-900 shadow-xs'
                    : 'bg-white border-2 border-stone-300'
                }`}
              >
                {isFilled && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            );
          })}
        </div>

        {/* Sub-label status or error */}
        <div className="h-6 mt-2 flex items-center justify-center text-center">
          {isLocked ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <Lock className="w-3.5 h-3.5 animate-pulse" />
              <span>TERMINAL LOCKED: {lockRemainingSeconds}s REMAINING</span>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[260px]">{errorMessage}</span>
            </div>
          ) : isLoading ? (
            <span className="text-xs text-amber-700 font-mono font-bold animate-pulse">VERIFYING PIN...</span>
          ) : (
            <span className="text-xs text-stone-400 font-mono">Ready for input (Keypad or Keyboard)</span>
          )}
        </div>
      </div>

      {/* 3x3 Numeric Keypad (1-9, Clear, 0, Del) */}
      <div className="w-full grid grid-cols-3 gap-2.5">
        {[
          '1', '2', '3',
          '4', '5', '6',
          '7', '8', '9',
          'CLEAR', '0', 'DEL'
        ].map((btn) => {
          if (btn === 'CLEAR') {
            return (
              <button
                key="btn-clear"
                type="button"
                onClick={handleClear}
                disabled={isLocked || isLoading || pin.length === 0}
                className="h-16 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 border border-stone-200 font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Clear PIN"
              >
                <RotateCcw className="w-4 h-4 text-stone-500" />
                <span>CLR</span>
              </button>
            );
          }

          if (btn === 'DEL') {
            return (
              <button
                key="btn-del"
                type="button"
                onClick={handleDelete}
                disabled={isLocked || isLoading || pin.length === 0}
                className="h-16 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 border border-stone-200 font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Delete last digit"
              >
                <Delete className="w-4 h-4 text-stone-500" />
                <span>DEL</span>
              </button>
            );
          }

          return (
            <button
              key={`btn-${btn}`}
              type="button"
              onClick={() => handleDigit(btn)}
              disabled={isLocked || isLoading}
              className="h-16 rounded-xl bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 border border-stone-200 font-mono text-2xl font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors"
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
};
