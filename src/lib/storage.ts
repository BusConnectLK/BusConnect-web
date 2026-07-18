import { createClient } from '@/lib/supabase/client';

/**
 * Uploads go browser -> Supabase Storage directly (not through BusConnect-api)
 * relying on Storage RLS to enforce "you can only write into your own
 * folder" (see BusConnect-api/supabase/migrations/0015_*.sql). The path
 * prefix (`${userId}/...`) is what the RLS policy checks.
 */

export async function uploadOperatorLogo(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${userId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('operator-logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('operator-logos').getPublicUrl(path).data.publicUrl;
}

/** Private bucket — returns a storage PATH (not a public URL); viewed later via a signed URL. */
export async function uploadOperatorIdDocument(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `${userId}/id-document-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('operator-documents')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

/** Public bucket — bus registration photos (front/side/interior/seat-layout). */
export async function uploadBusImage(userId: string, file: File, kind: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await supabase.storage
    .from('bus-images')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('bus-images').getPublicUrl(path).data.publicUrl;
}

/** Private bucket — pilot profile photo; returns a storage PATH, viewed later via a signed URL. */
export async function uploadPilotPhoto(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/photo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('pilot-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}
