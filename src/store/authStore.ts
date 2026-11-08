import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  lockUntil: number | null; // timestamp in ms
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLocked: () => boolean;
  getRemainingLockSeconds: () => number;
  resetRateLimit: () => void;
  validateSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      failedAttempts: 0,
      lockUntil: null,

      isLocked: () => {
        const lockUntil = get().lockUntil;
        if (!lockUntil) return false;
        if (Date.now() >= lockUntil) {
          // Lock expired, reset rate limit
          set({ lockUntil: null, failedAttempts: 0 });
          return false;
        }
        return true;
      },

      getRemainingLockSeconds: () => {
        const lockUntil = get().lockUntil;
        if (!lockUntil) return 0;
        const diff = Math.ceil((lockUntil - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      },

      resetRateLimit: () => {
        set({ failedAttempts: 0, lockUntil: null });
      },

      validateSession: async () => {
        const currentUser = get().user;
        if (!currentUser || !currentUser.id) {
          return false;
        }

        const exists = await authService.checkUserExists(currentUser.id);
        if (!exists) {
          console.warn('Persisted session user no longer exists in DB, clearing stale session.');
          set({ user: null, isAuthenticated: false });
          return false;
        }
        return true;
      },

      loginWithPin: async (pin: string) => {
        // Check if currently locked
        if (get().isLocked()) {
          const remaining = get().getRemainingLockSeconds();
          return {
            success: false,
            error: `Security Lockout Active. Please wait ${remaining} seconds.`,
          };
        }

        const result = await authService.verifyPin(pin);

        if (result.success && result.user) {
          set({
            user: result.user,
            isAuthenticated: true,
            failedAttempts: 0,
            lockUntil: null,
          });
          return { success: true };
        } else {
          const newFailedAttempts = get().failedAttempts + 1;
          if (newFailedAttempts >= 3) {
            // Lock out for 30 seconds
            const lockoutTime = Date.now() + 30 * 1000;
            set({
              failedAttempts: newFailedAttempts,
              lockUntil: lockoutTime,
            });
            return {
              success: false,
              error: '3 failed attempts. Terminal locked for 30 seconds.',
            };
          } else {
            set({ failedAttempts: newFailedAttempts });
            const remainingAttempts = 3 - newFailedAttempts;
            return {
              success: false,
              error: `Invalid PIN. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining before lockout.`,
            };
          }
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'pos_auth_session',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        failedAttempts: state.failedAttempts,
        lockUntil: state.lockUntil,
      }),
    }
  )
);
