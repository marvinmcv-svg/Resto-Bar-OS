import { clsx } from 'clsx';
import { AllergyBadge } from './AllergyBadge';
import { VipBadge } from './VipBadge';

interface GuestCardProps {
  guest: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    vipTier: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    tags: string[];
    allergies: string[];
    lifetimeValue: number;
    visitCount: number;
    lastVisit?: string;
  };
  onClick?: () => void;
}

export function GuestCard({ guest, onClick }: GuestCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-bg-secondary border border-bg-elevated rounded-lg p-4',
        'hover:border-accent-gold/50 transition cursor-pointer',
        guest.vipTier !== 'NONE' && 'border-l-4 border-l-accent-gold'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-ui font-medium">
            {guest.firstName} {guest.lastName}
          </div>
          <div className="text-text-muted text-sm">
            {guest.email || guest.phone || 'No contact'}
          </div>
        </div>
        <VipBadge tier={guest.vipTier} size="sm" />
      </div>

      {guest.allergies?.length > 0 && (
        <div className="mb-3">
          <AllergyBadge allergies={guest.allergies} size="sm" />
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-wrap gap-1">
          {(guest.tags || []).slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-bg-elevated text-text-secondary rounded text-xs">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-accent-gold font-ui">
          ${Number(guest.lifetimeValue || 0).toLocaleString()}
        </div>
      </div>
    </div>
  );
}