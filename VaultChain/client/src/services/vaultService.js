const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function token() { return localStorage.getItem('vaultchain_token'); }
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${token()}`, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Vault request failed');
  return data;
}
export function uploadVaultFile({ file, title, description, onProgress }) {
  return new Promise((resolve, reject) => {
    const formData = new FormData(); formData.append('file', file); formData.append('title', title); formData.append('description', description);
    const xhr = new XMLHttpRequest(); xhr.open('POST', `${API_BASE_URL}/vault/upload`); xhr.setRequestHeader('Authorization', `Bearer ${token()}`);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100)); };
    xhr.onload = () => { const data = JSON.parse(xhr.responseText || '{}'); if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.message || 'Vault upload failed')); };
    xhr.onerror = () => reject(new Error('Network error during vault upload')); xhr.send(formData);
  });
}
export const listVault = () => request('/vault');
export const getVaultItem = (id) => request(`/vault/${id}`);
export async function downloadVaultItem(id, filename) {
  const response = await fetch(`${API_BASE_URL}/vault/${id}/download`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'Vault download failed'); }
  const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename || `vault-item-${id}.pdf`; link.click(); URL.revokeObjectURL(url);
}
export const deleteVaultItem = (id) => request(`/vault/${id}`, { method: 'DELETE' });
