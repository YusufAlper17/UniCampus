interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
};

/** Portfolyo marka yazısı — Bricolage Grotesque, Instagram script fontundan uzak. */
export function Wordmark({ size = 'md', className = '' }: WordmarkProps) {
  return (
    <span
      className={`font-display font-extrabold tracking-tight ${sizes[size]} ${className}`}
      aria-label="UniCampus"
    >
      <span className="text-brand">Uni</span>
      <span className="text-ink">Campus</span>
    </span>
  );
}
