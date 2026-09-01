import { MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalyticsCard({ title, description, action, className = '', children }) {
	return <motion.section className={`admin-card admin-analytics-card ${className}`.trim()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}><header><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action || <button className="admin-icon-btn" type="button"><MoreHorizontal size={17}/></button>}</header><div className="admin-card__body">{children}</div></motion.section>;
}

