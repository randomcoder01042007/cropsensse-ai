import { supabase } from "@/integrations/supabase/client";
import type { Field } from "@/types";

export type FieldInput = Pick<Field, "name" | "location" | "primary_crop" | "area_hectares">;

export const fieldService = {
  async list() {
    const { data, error } = await supabase.from("fields").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async get(id: string) {
    const { data, error } = await supabase.from("fields").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(input: FieldInput) {
    const { data, error } = await supabase.from("fields").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, input: Partial<FieldInput>) {
    const { error } = await supabase.from("fields").update(input).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("fields").delete().eq("id", id);
    if (error) throw error;
  },
  async analyses(fieldId: string) {
    const { data, error } = await supabase.from("analyses").select("*").eq("field_id", fieldId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

/** Creates a small demo workspace (fields only). Rows are marked source=demo. */
export async function createDemoFields() {
  const { error } = await supabase.from("fields").insert([
    { name: "North Plot A", location: "Nashik, MH", primary_crop: "Maize", area_hectares: 4.2, source: "demo" },
    { name: "River Field", location: "Nashik, MH", primary_crop: "Soybean", area_hectares: 6.8, source: "demo" },
    { name: "East Terrace", location: "Pune, MH", primary_crop: "Wheat", area_hectares: 3.1, source: "demo" },
  ]);
  if (error) throw error;
}
