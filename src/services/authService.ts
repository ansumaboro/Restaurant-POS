import { supabase } from './supabaseClient';
import type { User } from '../types';

export const authService = {
  /**
   * Validates a 4-digit PIN against the database joined with roles
   */
  async verifyPin(pin: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!pin || pin.trim().length !== 4) {
        return { success: false, error: 'A 4-digit numeric PIN is required.' };
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          pin_code,
          role_id,
          is_active,
          created_at,
          role:roles (
            id,
            name
          )
        `)
        .eq('pin_code', pin.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error during PIN verification:', error);
        return { success: false, error: 'Network error verifying credentials.' };
      }

      if (!data) {
        return { success: false, error: 'Invalid PIN. Access denied.' };
      }

      // Handle role shape whether single object or array
      const rawRole = Array.isArray(data.role) ? data.role[0] : data.role;
      const user: User = {
        id: data.id,
        name: data.name,
        pin_code: data.pin_code,
        role_id: data.role_id,
        is_active: data.is_active,
        created_at: data.created_at,
        role: rawRole || null,
      };

      return { success: true, user };
    } catch (err: any) {
      console.error('Unexpected auth exception:', err);
      return { success: false, error: err.message || 'Authentication service unavailable.' };
    }
  },

  /**
   * Verifies if a user ID currently exists and is active in the database
   */
  async checkUserExists(userId: string): Promise<boolean> {
    try {
      if (!userId) return false;
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Retrieves list of active users with roles for quick reference
   */
  async getActiveUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          pin_code,
          role_id,
          is_active,
          created_at,
          role:roles (
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Failed to fetch active users:', error);
        return [];
      }

      return (data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        pin_code: u.pin_code,
        role_id: u.role_id,
        is_active: u.is_active,
        created_at: u.created_at,
        role: Array.isArray(u.role) ? u.role[0] : u.role,
      }));
    } catch {
      return [];
    }
  },
};
