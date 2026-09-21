import { AlertCircle, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';
import LoadingState from '../ui/LoadingState';

export default function DocumentPreviewModal({ document, onClose }) {
	const [url, setUrl] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		let objectUrl = '';
		let active = true;
		documentService.getPreviewObjectUrl(document.id).then((nextUrl)=>{objectUrl=nextUrl;if(active)setUrl(nextUrl);else URL.revokeObjectURL(nextUrl);}).catch((loadError)=>{if(active)setError(loadError.message);});
		return ()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
	}, [document.id]);

	return <div className="modal document-preview" role="dialog" aria-modal="true" aria-labelledby="document-preview-title"><button className="modal__backdrop" aria-label="Close" onClick={onClose}/><section className="modal__card document-preview__card"><header className="modal__header"><div><span className="modal__icon"><FileText size={19}/></span><div><h2 id="document-preview-title">Document preview</h2><p>{document.originalName}</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header><div className="document-preview__content">{error?<div className="assets-error"><span><AlertCircle size={22}/></span><h2>Preview unavailable</h2><p>{error}</p></div>:!url?<LoadingState label="Loading document"/>:<img src={url} alt={`Preview of ${document.originalName}`}/>}</div></section></div>;
}
