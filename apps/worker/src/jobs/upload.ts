import { supabase } from '../lib/supabase';
import fs from 'fs';

export async function uploadVideo(mp4Path: string, videoId: string): Promise<string> {
  const buffer = fs.readFileSync(mp4Path);
  const storagePath = `videos/${videoId}/output.mp4`;

  const { error } = await supabase.storage
    .from('videos')
    .upload(storagePath, buffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) throw new Error('Upload failed: ' + error.message);

  const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);
  return publicUrl;
}
