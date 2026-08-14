import { dataMode, requireSupabase } from '@/lib/supabase';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

async function squareImage(file: File): Promise<Blob> {
  if (!TYPES.has(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('Profile photos must be smaller than 5 MB.');
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image preview is unavailable in this browser.');
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not prepare this image.')), 'image/webp', 0.82));
}

export const customerAvatarService = {
  prepare: squareImage,
  async upload(blob: Blob): Promise<string> {
    if (dataMode === 'mock') return URL.createObjectURL(blob);
    const client = requireSupabase();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw new Error('Authentication required.');
    const path = `user/${userData.user.id}/${crypto.randomUUID()}.webp`;
    const current = await client.from('profiles').select('avatar_url').eq('id', userData.user.id).single();
    if (current.error) throw current.error;
    const upload = await client.storage.from('customer-avatars').upload(path, blob, { contentType: 'image/webp', upsert: false });
    if (upload.error) throw upload.error;
    const update = await client.from('profiles').update({ avatar_url: path }).eq('id', userData.user.id);
    if (update.error) { await client.storage.from('customer-avatars').remove([path]); throw update.error; }
    const oldPath = typeof current.data.avatar_url === 'string' && current.data.avatar_url.startsWith(`user/${userData.user.id}/`) ? current.data.avatar_url : '';
    if (oldPath) await client.storage.from('customer-avatars').remove([oldPath]);
    return client.storage.from('customer-avatars').getPublicUrl(path).data.publicUrl;
  },
  async remove(): Promise<void> {
    if (dataMode === 'mock') return;
    const client = requireSupabase(); const { data: userData } = await client.auth.getUser();
    if (!userData.user) throw new Error('Authentication required.');
    const current = await client.from('profiles').select('avatar_url').eq('id', userData.user.id).single();
    if (current.error) throw current.error;
    const update = await client.from('profiles').update({ avatar_url: null }).eq('id', userData.user.id);
    if (update.error) throw update.error;
    const path = typeof current.data.avatar_url === 'string' && current.data.avatar_url.startsWith(`user/${userData.user.id}/`) ? current.data.avatar_url : '';
    if (path) await client.storage.from('customer-avatars').remove([path]);
  },
};
