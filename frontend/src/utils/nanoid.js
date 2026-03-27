// Simple client-side nanoid for generating unique IDs
export function nanoid(size = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(size);
  crypto.getRandomValues(arr);
  for (let i = 0; i < size; i++) {
    result += chars[arr[i] % chars.length];
  }
  return result;
}
