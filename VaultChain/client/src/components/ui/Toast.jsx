import { CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Toast({ message, onClose }) {
	return <AnimatePresence>{message ? (
		<motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .22, ease: 'easeOut' }} role="status"><CheckCircle2 size={18}/><span>{message}</span><button type="button" onClick={onClose} aria-label="Dismiss"><X size={15}/></button></motion.div>
	) : null}</AnimatePresence>;
}
