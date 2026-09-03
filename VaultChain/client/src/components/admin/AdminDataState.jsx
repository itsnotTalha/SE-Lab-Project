import { AlertCircle, Database, LoaderCircle, RefreshCw } from 'lucide-react';

export function AdminLoading({ label = 'Loading live platform data' }) { return <div className="admin-data-state"><LoaderCircle className="admin-data-spinner" size={23}/><strong>{label}</strong></div>; }
export function AdminError({ message, onRetry }) { return <div className="admin-data-state is-error"><AlertCircle size={23}/><strong>Couldn’t load this admin view</strong><p>{message}</p><button className="admin-button is-secondary" type="button" onClick={onRetry}><RefreshCw size={14}/> Try again</button></div>; }
export function AdminEmpty({ title = 'No data for this period', description = 'Activity will appear here when VaultChain records it.' }) { return <div className="admin-data-state is-empty"><Database size={23}/><strong>{title}</strong><p>{description}</p></div>; }

