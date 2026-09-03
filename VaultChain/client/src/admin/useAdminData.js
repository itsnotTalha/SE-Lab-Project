import { useCallback, useEffect, useState } from 'react';

import { defaultAdminRange } from './adminUtils';

export default function useAdminData(loader, { ranged = true } = {}) {
	const [range, setRange] = useState(defaultAdminRange);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await loader(ranged ? range : undefined)); } catch (loadError) { setError(loadError.message); } finally { setLoading(false); } }, [loader, range, ranged]);
	useEffect(() => { load(); }, [load]);
	return { range, setRange, data, setData, loading, error, reload: load };
}

