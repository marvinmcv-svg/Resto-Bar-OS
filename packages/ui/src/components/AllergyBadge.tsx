import { clsx } from 'clsx';

interface AllergyBadgeProps {
  allergies: string[];
  size?: 'sm' | 'md' | 'lg';
}

export function AllergyBadge({ allergies, size = 'md' }: AllergyBadgeProps) {
  if (!allergies?.length) return null;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {allergies.map(allergy => (
        <span
          key={allergy}
          className={clsx(
            'bg-red-900/30 text-red-400 rounded font-ui font-bold border border-red-700',
            sizeClasses[size]
          )}
        >
          ⚠ {allergy}
        </span>
      ))}
    </div>
  );
}