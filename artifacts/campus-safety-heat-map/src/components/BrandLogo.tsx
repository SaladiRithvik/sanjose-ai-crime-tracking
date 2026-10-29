import logoSrc from '../assets/safemap-logo.png';
import onNavyLogoSrc from '../assets/safemap-logo-on-navy.png';

export function BrandLogo({ size = 36, decorative = false, className = '', variant = 'default' }: { size?: number; decorative?: boolean; className?: string; variant?: 'default' | 'on-navy' }) {
  return (
    <img
      src={variant === 'on-navy' ? onNavyLogoSrc : logoSrc}
      width={Math.round(size * 416 / 502)}
      height={size}
      alt={decorative ? '' : 'SJSU SafeMap logo: map pin with shield'}
      aria-hidden={decorative ? true : undefined}
      className={`brand-logo ${className}`}
      draggable={false}
    />
  );
}
