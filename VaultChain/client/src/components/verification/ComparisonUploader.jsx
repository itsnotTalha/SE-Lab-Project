import { Eye, ImageUp, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import Button from '../ui/Button';

function formatSize(bytes) {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ComparisonUploader({ file, previewUrl, dimensions, onFile, onRemove, onPreview }) {
	const inputRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const openPicker = () => inputRef.current?.click();

	return <div className="comparison-uploader">{file ? <div className="comparison-uploader__selected"><div className="comparison-uploader__image"><img src={previewUrl} alt={`Preview of ${file.name}`}/></div><div className="comparison-uploader__details"><span className="verification-kicker">Image to verify</span><h3>{file.name}</h3><p>{formatSize(file.size)} · {dimensions?.width && dimensions?.height ? `${dimensions.width} × ${dimensions.height}` : 'Reading dimensions'}</p><div className="verification-inline-actions"><Button type="button" size="sm" variant="secondary" icon={Eye} onClick={onPreview}>Preview</Button><Button type="button" size="sm" variant="ghost" icon={RefreshCw} onClick={openPicker}>Replace</Button><Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={onRemove}>Remove</Button></div></div></div> : <button type="button" className={`ownership-dropzone comparison-dropzone ${dragging ? 'is-dragging' : ''}`} onClick={openPicker} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onFile(event.dataTransfer.files?.[0]); }}><span><ImageUp size={24}/></span><strong>Drag and drop an image</strong><small>or choose a JPG, PNG, or WebP file · maximum 20 MB</small></button>}<input ref={inputRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])}/></div>;
}
