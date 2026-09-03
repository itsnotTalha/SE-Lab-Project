import { CalendarDays, ChevronDown, Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const ranges = [{ label: 'Today', value: 'today' }, { label: 'Last 7 Days', value: '7d' }, { label: 'Last 30 Days', value: '30d' }, { label: 'Last Year', value: '1y' }, { label: 'Custom Range', value: 'custom' }];

export function downloadReport(name, rows = []) {
	const encode = (value) => `"${String(typeof value === 'object' && value !== null ? JSON.stringify(value) : value ?? '').replaceAll('"','""')}"`;
	const lines = rows.length ? [Object.keys(rows[0]).map(encode).join(','), ...rows.map((row) => Object.keys(rows[0]).map((key) => encode(row[key])).join(','))] : [['Metric','Value'],['Generated',new Date().toISOString()],['Platform','VaultChain']].map((row) => row.map(encode).join(','));
	const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; link.click(); URL.revokeObjectURL(url);
}

export default function AdminPageHeader({ eyebrow = 'Admin workspace', title, description, actions, exportName, onExport, range = { range: '30d' }, onRangeChange, updatedAt, showRange = true }) {
	const today = new Date().toISOString().slice(0, 10); const prior = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
	const [custom, setCustom] = useState({ from: range.from || prior, to: range.to || today });
	function selectRange(event) { const value = event.target.value; if (value === 'custom') onRangeChange?.({ range: 'custom', ...custom }); else onRangeChange?.({ range: value }); }
	function updateCustom(field, value) { const next = { ...custom, [field]: value }; setCustom(next); if (next.from && next.to) onRangeChange?.({ range: 'custom', ...next }); }
	return <div className="admin-page-header"><div><span>{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}<small><RefreshCw size={11}/> {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : 'Live database data'}</small></div><div className="admin-page-actions">{showRange ? <><label className="admin-date-filter"><CalendarDays size={15}/><select value={range.range || '30d'} onChange={selectRange}>{ranges.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><ChevronDown size={13}/></label>{range.range === 'custom' ? <div className="admin-custom-range"><input aria-label="Start date" type="date" value={custom.from} max={custom.to} onChange={(event) => updateCustom('from', event.target.value)}/><span>to</span><input aria-label="End date" type="date" value={custom.to} min={custom.from} onChange={(event) => updateCustom('to', event.target.value)}/></div> : null}</> : null}{exportName ? <button type="button" className="admin-button is-secondary" onClick={() => onExport ? onExport() : downloadReport(exportName)}><Download size={15}/> Export report</button> : null}{actions}</div></div>;
}
