import { ArrowRight, BarChart3, FolderLock, Sparkles, Store, TrendingUp, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from 'framer-motion';
import PageHeader from '../../components/ui/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { organizationPath, organizationService } from '../../services/organizationService';
import { organizationAnalytics } from '../../utils/organizationAnalytics.mjs';
import '../../styles/organization-workspaces.css';
import '../../styles/organization-overview.css';

const palette = ['#8b5cf6', '#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#6366f1'];
const number = (value) => Number(value).toLocaleString();
const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
const tick = { fill: 'var(--text-muted)', fontSize: 11 };
const tooltip = {
	background: 'var(--surface-raised)',
	border: '1px solid var(--border-strong)',
	borderRadius: 12,
	color: 'var(--text)',
	fontSize: 12,
	boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
};

function EmptyChart({ children }) {
	return (
		<div className="org-chart-empty">
			<BarChart3 size={32} color="var(--primary)" />
			<strong>No activity recorded</strong>
			<p>{children}</p>
		</div>
	);
}

function DataTable({ title, columns, rows }) {
	return (
		<details className="org-chart-data">
			<summary>View chart data table</summary>
			<div>
				<table>
					<caption>{title}</caption>
					<thead>
						<tr>
							{columns.map((col) => (
								<th scope="col" key={col}>
									{col}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => (
							<tr key={index}>
								{row.map((value, cell) => (
									<td key={cell}>{value}</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</details>
	);
}

function ChartPanel({ title, description, children, className = '' }) {
	return (
		<section className={`org-chart-panel ${className}`} aria-label={title}>
			<header>
				<h2>{title}</h2>
				<p>{description}</p>
			</header>
			{children}
		</section>
	);
}

export default function OrgHubPage() {
	const [months, setMonths] = useState(6);
	const { motionEnabled } = useTheme();
	const reduced = useReducedMotion();
	const workspace = organizationService.getActiveWorkspace();
	const org = organizationService.getOrganization(workspace.id);
	if (!org) return null;

	const analytics = organizationAnalytics(org, months);
	const animate = motionEnabled && !reduced;

	const cards = [
		{
			label: 'Inventory',
			section: 'inventory',
			icon: Store,
			value: org.listings?.length ?? 0,
			description: `${(org.listings || []).filter((item) => item.status === 'Active').length} active marketplace listings`,
			color: '#0ea5e9',
			badge: 'Catalog',
			bgSoft: 'rgba(14, 165, 233, 0.12)',
			borderSoft: 'rgba(14, 165, 233, 0.28)',
		},
		{
			label: 'Team & splits',
			section: 'contributors',
			icon: Users,
			value: org.members?.length ?? 0,
			description: 'Contributors in this workspace',
			color: '#10b981',
			badge: 'Governance',
			bgSoft: 'rgba(16, 185, 129, 0.12)',
			borderSoft: 'rgba(16, 185, 129, 0.28)',
		},
		{
			label: 'Company vaults',
			section: 'vaults',
			icon: FolderLock,
			value: org.companyVaults?.length ?? 0,
			description: `${(org.companyVaults || []).filter((item) => item.isLocked).length} multi-sig vaults secured`,
			color: '#f59e0b',
			badge: 'Multi-Sig',
			bgSoft: 'rgba(245, 158, 11, 0.12)',
			borderSoft: 'rgba(245, 158, 11, 0.28)',
		},
		{
			label: 'Shared Treasury',
			section: 'treasury',
			icon: Wallet,
			value: `$${number(org.treasuryBalance ?? 0)}`,
			description: 'Consensus liquid reserves',
			color: '#8b5cf6',
			badge: 'Reserves',
			bgSoft: 'rgba(139, 92, 246, 0.12)',
			borderSoft: 'rgba(139, 92, 246, 0.28)',
		},
	];

	const tooltipProps = {
		contentStyle: tooltip,
		itemStyle: { color: 'var(--text)' },
		labelStyle: { color: 'var(--text)', fontWeight: 600 },
	};

	return (
		<div className="organization-overview org-overview-analytics">
			<PageHeader
				eyebrow="Organization overview"
				title={org.name}
				description="Executive performance intelligence, sales reconciliation, and resource distribution."
			/>

			{/* 4 KPI Metric Cards */}
			<div className="organization-overview-grid">
				{cards.map(({ label, section, icon: Icon, value, description, color, badge, bgSoft, borderSoft }) => (
					<Link
						key={section}
						className="organization-overview-card"
						to={organizationPath(org.id, section)}
						style={{ '--card-accent': color, '--card-accent-soft': bgSoft }}
					>
						<div className="org-card-top">
							<span className="organization-mark" style={{ background: bgSoft, color }}>
								<Icon size={20} />
							</span>
							<span
								className="org-card-badge"
								style={{ background: bgSoft, color, border: `1px solid ${borderSoft}` }}
							>
								{badge}
							</span>
						</div>
						<h2>{label}</h2>
						<strong>{value}</strong>
						<p>{description}</p>
						<div className="org-card-link-hint">
							<span>Manage {label.toLowerCase()}</span>
							<ArrowRight size={14} />
						</div>
					</Link>
				))}
			</div>

			{/* Toolbar */}
			<div className="org-chart-toolbar">
				<div>
					<h2>
						<Sparkles size={18} color="var(--primary)" />
						Performance Intelligence & Financial Flows
					</h2>
					<p>
						Enterprise records · {months} months ending {monthLabel(analytics.last)}. Real-time cryptographic ledger consensus.
					</p>
				</div>
				<div role="group" aria-label="Analytics period">
					{[3, 6, 12].map((period) => (
						<button
							type="button"
							key={period}
							aria-pressed={months === period}
							onClick={() => setMonths(period)}
						>
							{period} months
						</button>
					))}
				</div>
			</div>

			{/* Analytics Charts */}
			<div className="org-overview-charts">
				{/* Chart 1: Revenue Over Time */}
				<ChartPanel
					title="Revenue & Disbursal Velocity"
					description="Gross marketplace volume vs contributor payouts and retained treasury reserves."
					className="org-chart-wide"
				>
					<div className="org-chart-headline">
						<strong>
							${number(analytics.gross)} <small style={{ color: '#10b981' }}>USD</small>
						</strong>
						<span>Cumulative volume across selected period</span>
					</div>
					{analytics.hasSales ? (
						<div className="org-chart-canvas">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={analytics.timeline}
									margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
									accessibilityLayer
								>
									<defs>
										<linearGradient id="org-revenue-fill" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
											<stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
										</linearGradient>
										<linearGradient id="org-payout-fill" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
											<stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
										</linearGradient>
									</defs>
									<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="month"
										tickFormatter={monthLabel}
										tick={tick}
										axisLine={false}
										tickLine={false}
										minTickGap={25}
									/>
									<YAxis
										tick={tick}
										axisLine={false}
										tickLine={false}
										width={55}
										tickFormatter={(value) => (value >= 1000 ? `$${value / 1000}k` : `$${value}`)}
									/>
									<Tooltip
										{...tooltipProps}
										labelFormatter={monthLabel}
										formatter={(value, name) => [`$${number(value)}`, name]}
									/>
									<Legend verticalAlign="top" height={36} />
									<Area
										type="monotone"
										dataKey="revenue"
										name="Gross Sales"
										stroke="#8b5cf6"
										strokeWidth={3}
										fill="url(#org-revenue-fill)"
										isAnimationActive={animate}
									/>
									<Area
										type="monotone"
										dataKey="contributors"
										name="Contributor Payouts"
										stroke="#10b981"
										strokeWidth={2}
										strokeDasharray="4 4"
										fill="url(#org-payout-fill)"
										isAnimationActive={animate}
									/>
									<Area
										type="monotone"
										dataKey="retained"
										name="Treasury Share"
										stroke="#f59e0b"
										fill="none"
										strokeWidth={2}
										isAnimationActive={animate}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					) : (
						<EmptyChart>Sales will appear here when the organization records transactions.</EmptyChart>
					)}
					<DataTable
						title="Monthly revenue in credits"
						columns={['Month', 'Sales ($)', 'Contributors ($)', 'Treasury Cut ($)']}
						rows={analytics.timeline.map((row) => [
							monthLabel(row.month),
							`$${number(row.revenue)}`,
							`$${number(row.contributors)}`,
							`$${number(row.retained)}`,
						])}
					/>
				</ChartPanel>

				{/* Chart 2: Inventory Mix */}
				<ChartPanel title="Inventory Distribution" description="Current marketplace assets by status.">
					{analytics.inventory.length ? (
						<>
							<div className="org-chart-donut">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart accessibilityLayer>
										<Pie
											data={analytics.inventory}
											dataKey="value"
											nameKey="name"
											innerRadius="65%"
											outerRadius="88%"
											paddingAngle={4}
											stroke="var(--surface)"
											strokeWidth={3}
											isAnimationActive={animate}
										>
											{analytics.inventory.map((row, index) => {
												const color =
													row.name.toLowerCase() === 'active'
														? '#10b981'
														: row.name.toLowerCase() === 'sold'
														? '#8b5cf6'
														: row.name.toLowerCase() === 'pending'
														? '#f59e0b'
														: palette[index % palette.length];
												return <Cell key={row.name} fill={color} />;
											})}
										</Pie>
										<Tooltip {...tooltipProps} />
									</PieChart>
								</ResponsiveContainer>
								<div className="org-chart-donut-label">
									<strong>{org.listings.length}</strong>
									<span>Listed Assets</span>
								</div>
							</div>
							<ul className="org-chart-legend">
								{analytics.inventory.map((row, index) => {
									const color =
										row.name.toLowerCase() === 'active'
											? '#10b981'
											: row.name.toLowerCase() === 'sold'
											? '#8b5cf6'
											: row.name.toLowerCase() === 'pending'
											? '#f59e0b'
											: palette[index % palette.length];
									return (
										<li key={row.name}>
											<i style={{ background: color, boxShadow: `0 0 8px ${color}88` }} />
											<span>{row.name}</span>
											<strong>{row.value}</strong>
										</li>
									);
								})}
							</ul>
						</>
					) : (
						<EmptyChart>Add a listing to see your inventory breakdown.</EmptyChart>
					)}
				</ChartPanel>

				{/* Chart 3: Treasury Cash Flow */}
				<ChartPanel
					title="Treasury Liquidity Cash Flow"
					description="Recorded capital deposits vs operational expenditures."
					className="org-chart-wide"
				>
					<div className="org-chart-headline">
						<strong style={{ color: analytics.net >= 0 ? '#10b981' : '#f43f5e' }}>
							{analytics.net > 0 ? '+' : ''}${number(analytics.net)}{' '}
							<small style={{ color: 'var(--text-muted)' }}>Net Flow</small>
						</strong>
						<span>Net liquidity balance in selected period</span>
					</div>
					{analytics.hasTransactions ? (
						<div className="org-chart-canvas">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={analytics.timeline} accessibilityLayer margin={{ right: 12 }}>
									<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="month"
										tickFormatter={monthLabel}
										tick={tick}
										axisLine={false}
										tickLine={false}
										minTickGap={25}
									/>
									<YAxis
										tick={tick}
										width={55}
										axisLine={false}
										tickLine={false}
										tickFormatter={(value) => (value >= 1000 ? `$${value / 1000}k` : `$${value}`)}
									/>
									<Tooltip
										{...tooltipProps}
										labelFormatter={monthLabel}
										formatter={(value, name) => [`$${number(value)}`, name]}
									/>
									<Legend verticalAlign="top" height={36} />
									<Bar
										name="Inflows (+)"
										dataKey="inflow"
										fill="#10b981"
										radius={[6, 6, 0, 0]}
										maxBarSize={28}
										isAnimationActive={animate}
									/>
									<Bar
										name="Outflows (-)"
										dataKey="outflow"
										fill="#f43f5e"
										radius={[6, 6, 0, 0]}
										maxBarSize={28}
										isAnimationActive={animate}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<EmptyChart>No treasury transactions recorded in this period.</EmptyChart>
					)}
					<DataTable
						title="Monthly treasury movement in credits"
						columns={['Month', 'Inflow ($)', 'Outflow ($)']}
						rows={analytics.timeline.map((row) => [
							monthLabel(row.month),
							`$${number(row.inflow)}`,
							`$${number(row.outflow)}`,
						])}
					/>
				</ChartPanel>

				{/* Chart 4: Revenue Allocation Split */}
				<ChartPanel title="Royalty Split Architecture" description="Configured smart-contract revenue distribution.">
					<div className="org-allocation-number">
						<strong>{org.splitPercent}%</strong>
						<span>Allocated to Contributors Pool</span>
					</div>
					<div
						className="org-allocation-track"
						role="img"
						aria-label={`${org.splitPercent}% contributors, ${100 - org.splitPercent}% treasury`}
					>
						<span style={{ width: `${Math.min(100, Math.max(0, org.splitPercent))}%` }} />
					</div>
					<ul className="org-chart-legend">
						<li>
							<i style={{ background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf688' }} />
							<span>Contributors Share</span>
							<strong style={{ color: '#8b5cf6' }}>{org.splitPercent}%</strong>
						</li>
						<li>
							<i style={{ background: '#f59e0b', boxShadow: '0 0 8px #f59e0b88' }} />
							<span>Treasury Retention</span>
							<strong style={{ color: '#f59e0b' }}>{100 - org.splitPercent}%</strong>
						</li>
					</ul>
					<p className="org-chart-note">
						Automated on-chain splits disburse instantly upon marketplace escrow finalization.
					</p>
					<Link className="org-chart-link" to={organizationPath(org.id, 'contributors')}>
						Configure Contributor Splits <ArrowRight size={15} />
					</Link>
				</ChartPanel>

				{/* Chart 5: Contributor Shares */}
				<ChartPanel
					title="Contributor Equity Allocations"
					description="Individual percentage breakdown within the contributor pool."
				>
					{analytics.members.length ? (
						<>
							<div
								className="org-chart-canvas"
								style={{ height: Math.max(220, analytics.members.length * 48) }}
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										layout="vertical"
										data={analytics.members}
										accessibilityLayer
										margin={{ right: 24, left: 10 }}
									>
										<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
										<XAxis type="number" tick={tick} unit="%" domain={[0, 100]} />
										<YAxis
											type="category"
											dataKey="name"
											width={110}
											tick={tick}
											tickFormatter={(name) => (name.length > 15 ? `${name.slice(0, 14)}…` : name)}
										/>
										<Tooltip {...tooltipProps} formatter={(value) => [`${value}%`, 'Share']} />
										<Bar
											dataKey="share"
											radius={[0, 6, 6, 0]}
											maxBarSize={22}
											isAnimationActive={animate}
										>
											{analytics.members.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={palette[index % palette.length]}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
							<DataTable
								title="Contributor shares"
								columns={['Contributor', 'Share (%)']}
								rows={analytics.members.map((row) => [row.name, `${row.share}%`])}
							/>
						</>
					) : (
						<EmptyChart>Add contributors to see their allocation.</EmptyChart>
					)}
				</ChartPanel>

				{/* Chart 6: Assets across vaults */}
				<ChartPanel
					title="Secured Assets Across Vaults"
					description="Assets assigned to company multi-sig cold storage and operative vaults."
				>
					{analytics.vaults.length ? (
						<>
							<div
								className="org-chart-canvas"
								style={{ height: Math.max(220, analytics.vaults.length * 52) }}
							>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={analytics.vaults}
										layout="vertical"
										accessibilityLayer
										margin={{ right: 24, left: 10 }}
									>
										<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
										<XAxis type="number" allowDecimals={false} tick={tick} />
										<YAxis
											type="category"
											dataKey="name"
											width={120}
											tick={tick}
											tickFormatter={(name) => (name.length > 16 ? `${name.slice(0, 15)}…` : name)}
										/>
										<Tooltip {...tooltipProps} />
										<Bar
											dataKey="assets"
											name="Secured Assets"
											fill="#0ea5e9"
											radius={[0, 6, 6, 0]}
											maxBarSize={22}
											isAnimationActive={animate}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
							<DataTable
								title="Vault asset memberships"
								columns={['Vault Name', 'Assets Secured', 'Lock Status']}
								rows={analytics.vaults.map((row) => [row.name, row.assets, row.state])}
							/>
						</>
					) : (
						<EmptyChart>Create a company vault to start organizing assets.</EmptyChart>
					)}
				</ChartPanel>
			</div>
		</div>
	);
}
