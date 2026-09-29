import { ArrowUpRight, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CommandMenu({ navigation, onClose }) {
	const dialog = useRef(null);
	const input = useRef(null);
	const [query, setQuery] = useState('');
	const [selected, setSelected] = useState(0);
	const navigate = useNavigate();
	const results = navigation.filter((item) => `${item.label} ${item.section}`.toLowerCase().includes(query.toLowerCase().trim()));
	useEffect(() => {
		const element = dialog.current;
		element.showModal();
		input.current?.focus();
		return () => element.close();
	}, []);
	useEffect(() => { dialog.current?.querySelector(`[data-result="${selected}"]`)?.scrollIntoView({ block: 'nearest' }); }, [selected]);
	function go(item) { if (item) { navigate(item.to); onClose(); } }
	function onKeyDown(event) {
		if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
			event.preventDefault();
			setSelected((current) => results.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0);
			input.current?.focus();
		}
		if (event.key === 'Enter' && event.target === input.current) { event.preventDefault(); go(results[selected]); }
	}
	return <dialog ref={dialog} className="workspace-command" aria-label="Go to a page" onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) onClose(); }} onKeyDown={onKeyDown}>
		<div className="workspace-command__inner">
			<div className="workspace-command__search"><Search size={22}/><input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} placeholder="Where shall we go?" aria-label="Search pages" role="combobox" aria-expanded="true" aria-controls="workspace-results" aria-autocomplete="list" aria-activedescendant={results[selected] ? `workspace-result-${selected}` : undefined}/><button className="icon-button" onClick={onClose} aria-label="Close navigation search"><X size={18}/></button></div>
			<p className="workspace-command__label">YOUR WORKSPACE, ONE SHORTCUT AWAY</p>
			<div id="workspace-results" role="listbox" aria-label="Pages" className="workspace-command__results">{results.map((item, index) => { const Icon = item.icon; return <button type="button" id={`workspace-result-${index}`} role="option" aria-selected={index === selected} data-result={index} key={item.to} onClick={() => go(item)} onFocus={() => setSelected(index)}><span><Icon size={19}/></span><div><strong>{item.label}</strong><small>{item.section}</small></div><ArrowUpRight size={17}/></button>; })}{!results.length ? <p className="workspace-command__empty">No pages found. Try “assets”, “vault”, or “documents”.</p> : null}</div>
			<footer><span>↑ ↓ to explore · Enter to open</span><span>Esc to close</span></footer>
		</div>
	</dialog>;
}
