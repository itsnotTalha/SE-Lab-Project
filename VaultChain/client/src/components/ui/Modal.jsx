import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ open, title, description, onClose, children }) {
	return <AnimatePresence>{open ? <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true"><button className="modal__backdrop" onClick={onClose} aria-label="Close dialog"/><motion.section className="modal__card" initial={{ scale: .97, y: 10 }} animate={{ scale: 1, y: 0 }}><header className="modal__header"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div><button className="icon-button" type="button" onClick={onClose}><X size={18}/></button></header>{children}</motion.section></motion.div> : null}</AnimatePresence>;
}
