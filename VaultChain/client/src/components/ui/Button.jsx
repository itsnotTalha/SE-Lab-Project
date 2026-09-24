import { LoaderCircle } from 'lucide-react';

export default function Button({ variant = 'primary', size = 'md', className = '', icon: Icon, loading = false, children, ...props }) {
	const LeadingIcon = loading ? LoaderCircle : Icon;
	return (
		<button className={`button button--${variant} button--${size} ${className}`.trim()} {...props}>
			{LeadingIcon ? <LeadingIcon size={17} aria-hidden="true" className={loading ? 'button-spinner' : undefined} /> : null}
			<span>{children}</span>
		</button>
	);
}
