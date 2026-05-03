import { clsx } from 'clsx';

interface VipBadgeProps {
  tier: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  size?: 'sm' | 'md' | 'lg';
}

const TIER_STYLES = {
  NONE: 'bg-gray-800 text-gray-400 border-gray-700',
  BRONZE: 'bg-amber-900/30 text-amber-600 border-amber-700',
  SILVER: 'bg-gray-700/30 text-gray-300 border-gray-500',
  GOLD: 'bg-accent-gold/10 text-accent-gold border-accent-gold',
  PLATINUM: 'bg-gradient-to-r from-slate-200/10 to-slate-400/10 text-white border-white/50',
};

export function VipBadge({ tier, size = 'md' }: VipBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={clsx(
        'rounded font-ui font-bold border',
        TIER_STYLES[tier],
        sizeClasses[size]
      )}
    >
      {tier === 'NONE' ? 'Standard' : tier}
    </span>
  );
}