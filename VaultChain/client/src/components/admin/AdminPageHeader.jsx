import { CalendarDays, ChevronDown, Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const ranges = ['Today', 'Last 7 Days', 'Last Month', 'Last Year', 'Custom Range'];

export function downloadReport(name, rows = []) {
	const lines = rows.length ? rows.map((row) => Object.values(row).join(',')) : [['Metric', 'Value'], ['Generated', new Date().toISOString()], ['Platform', 'VaultChain']].map((row) => row.join(','));
	const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; link.click(); URL.revokeObjectURL(url);
}

export default function AdminPageHeader({ eyebrow = 'Admin workspace', title, description, actions, exportName, onExport }) {
	const [range, setRange] = useState('Last 30 Days');
	return <div className="admin-page-header"><div><span>{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}<small><RefreshCw size={11}/> Last updated 2 minutes ago</small></div><div className="admin-page-actions"><label className="admin-date-filter"><CalendarDays size={15}/><select value={range} onChange={(event) => setRange(event.target.value)}><option>Last 30 Days</option>{ranges.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13}/></label>{exportName ? <button type="button" className="admin-button is-secondary" onClick={() => onExport ? onExport() : downloadReport(exportName)}><Download size={15}/> Export report</button> : null}{actions}</div></div>;
}

