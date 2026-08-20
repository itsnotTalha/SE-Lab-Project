import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

export async function getDashboardSummary() {
	const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});
	const data = await response.json();

	if (!response.ok) throw new Error(data.message || 'Unable to load dashboard summary');
	return data.summary;
}
