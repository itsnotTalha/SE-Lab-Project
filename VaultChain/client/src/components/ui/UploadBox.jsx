import { FileImage, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

export default function UploadBox({ file, onFile, onRemove, accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp' }) {
	const inputRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	function choose(files) { const next = files?.[0]; if (next) onFile?.(next); }
	return <div className={`upload-box ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
		{file ? <><span className="upload-box__file-icon"><FileImage size={26}/></span><div><strong>{file.name}</strong><p>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready for analysis</p></div><button type="button" className="icon-button" onClick={onRemove} aria-label="Remove selected file"><X size={17}/></button></> : <button type="button" className="upload-box__empty" onClick={() => inputRef.current?.click()}><span><UploadCloud size={25}/></span><strong>Drag your image here</strong><p>or <b>browse files</b> from your device</p><small>PNG, JPG or WEBP · Maximum 20 MB</small></button>}
		<input ref={inputRef} className="sr-only" type="file" accept={accept} onChange={(event) => choose(event.target.files)}/>
	</div>;
}
