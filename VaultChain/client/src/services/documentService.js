const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function authHeaders() {
  const token = localStorage.getItem('vaultchain_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function uploadDocument({ file, title, description, category, onProgress }) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/documents/upload`);
    const token = localStorage.getItem('vaultchain_token');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.message || 'Document upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error during document upload'));
    xhr.send(formData);
  });
}

export const listDocuments = () => request('/documents');
export const getDocument = (id) => request(`/documents/${id}`);
export const runOcr = (id) => request(`/documents/${id}/ocr`, { method: 'POST' });
export const getOcr = (id) => request(`/documents/${id}/ocr`);
export const verifyDocument = (id, referenceDocumentId) => request(`/documents/${id}/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ referenceDocumentId: referenceDocumentId || null }),
});
export const getVerificationReport = (id) => request(`/documents/${id}/report`);
export async function downloadExtractedText(text, filename) {
  const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'extracted-text.txt';
  link.click();
  URL.revokeObjectURL(url);
}
