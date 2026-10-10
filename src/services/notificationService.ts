import { supabase } from "@/integrations/supabase/client";

export const notificationService = {
  async list() {
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return data;
  },
  async markAllRead() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  },
};
