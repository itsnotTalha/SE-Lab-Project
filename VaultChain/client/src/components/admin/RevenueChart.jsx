import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = (value) => `$${Math.round(value / 1000)}K`;

export default function RevenueChart({ data, height = 300, area = true }) {
	return <ResponsiveContainer width="100%" height={height}><AreaChart data={data} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}><defs><linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--admin-accent)" stopOpacity={.25}/><stop offset="1" stopColor="var(--admin-accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--chart-grid)" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={8}/><YAxis tickFormatter={money} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', fontSize: 12 }}/><Area type="monotone" dataKey="revenue" stroke="var(--admin-accent)" strokeWidth={2.5} fill={area ? 'url(#adminRevenueGradient)' : 'transparent'} activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--surface)' }}/></AreaChart></ResponsiveContainer>;
}

