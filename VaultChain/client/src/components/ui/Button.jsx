export default function Button({ variant = 'primary', size = 'md', className = '', icon: Icon, children, ...props }) {
	return (
		<button className={`button button--${variant} button--${size} ${className}`.trim()} {...props}>
			{Icon ? <Icon size={17} aria-hidden="true" /> : null}
			<span>{children}</span>
		</button>
	);
}
