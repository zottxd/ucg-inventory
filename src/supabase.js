import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://stjgdteebhiejcvqckfu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0amdkdGVlYmhpZWpjdnFja2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI4NTcsImV4cCI6MjA5NDk2ODg1N30.mu7AsDhwu46FRnyBl7BV8L7fi5oityMQ7e0WFu8MkQ8';

export const supabase = createClient(supabaseUrl, supabaseKey);

const pagedAssetsCache = new Map();

export async function fetchPagedAssets(table, locationId, page = 0, pageSize = 20) {
  const cacheKey = `${table}-${locationId}-${page}-${pageSize}`;

  if (pagedAssetsCache.has(cacheKey)) {
    return pagedAssetsCache.get(cacheKey);
  }

  const result = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .eq('location_id', locationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (!result.error) {
    pagedAssetsCache.set(cacheKey, result);
  }

  return result;
}
