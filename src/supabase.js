import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://stjgdteebhiejcvqckfu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amdkdGVlYmhpZWpjdnFja2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI4NTcsImV4cCI6MjA5NDk2ODg1N30.mu7AsDhwu46FRnyBl7BV8L7fi5oityMQ7e0WFu8MkQ8';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchPagedAssets(table, locationId, page = 0, pageSize = 20) {
  return supabase
    .from(table)
    .select('id, serial, category, model, quantity, note, location_id, created_at', { count: 'exact' })
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
}
