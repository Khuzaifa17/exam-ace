import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: fullName },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    // Even if signOut fails (e.g., user deleted from DB), clear local state
    if (error) {
      console.warn('SignOut API error, clearing local session:', error.message);
    }
    return { error: null };
  } catch (err) {
    console.warn('SignOut exception, clearing local session:', err);
    return { error: null };
  }
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Check if user has a specific role
export const hasRole = async (userId: string, role: 'admin' | 'user') => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();
  
  return { hasRole: !!data, error };
};
