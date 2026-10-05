import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You are signed out. Please sign in again.");
  return data.user.id;
}

export const authService = {
  signIn: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (name: string, email: string, password: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/dashboard` },
    }),
  google: () => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }),
  forgot: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
  updatePassword: (password: string) => supabase.auth.updateUser({ password }),
  signOut: () => supabase.auth.signOut(),
};
