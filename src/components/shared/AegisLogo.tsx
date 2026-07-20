type AegisLogoProps = {
  variant?: 'horizontal' | 'icon';
  className?: string;
  alt?: string;
};

const LOGO_SRC = {
  horizontal: '/brand/aegis-horizontal.png',
  icon: '/brand/aegis-icon.png',
} as const;

export default function AegisLogo({
  variant = 'horizontal',
  className = '',
  alt = 'Aegis',
}: AegisLogoProps) {
  return (
    <img
      className={['aegis-logo', `aegis-logo--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      src={LOGO_SRC[variant]}
      alt={alt}
      decoding="async"
      draggable={false}
    />
  );
}
