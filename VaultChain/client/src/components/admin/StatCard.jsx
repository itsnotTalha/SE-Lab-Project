import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, change, detail, icon: Icon, tone = 'purple', inverse = false, delay = 0 }) {
	const positive = !String(change || '').startsWith('-');
	return <motion.article className={`admin-stat admin-stat--${tone} ${inverse ? 'is-featured' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: .35 }}>
		<header><span>{Icon ? <Icon size={18}/> : null}</span>{change ? <b className={positive ? 'is-positive' : 'is-negative'}>{positive ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {change}</b> : null}</header>
		<p>{label}</p><strong>{value}</strong><small>{detail}</small>
	</motion.article>;
}

