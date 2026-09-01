import { CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Toast({ message, onClose }) {
	if (!message) return null;
	return <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} role="status"><CheckCircle2 size={18}/><span>{message}</span><button type="button" onClick={onClose} aria-label="Dismiss"><X size={15}/></button></motion.div>;
}
