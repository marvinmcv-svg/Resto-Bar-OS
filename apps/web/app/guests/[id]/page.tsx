'use client';

import { useGuest, useGuestHistory, useUpdateGuest } from '@/hooks/useGuests';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function GuestDetailPage({ params }: { params: { id: string } }) {
  const { data: guest, isLoading } = useGuest(params.id);
  const { data: history } = useGuestHistory(params.id);
  const updateGuest = useUpdateGuest();

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (!guest) return <div className="p-8 text-red-400">Guest not found</div>;

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/guests" className="text-accent-gold hover:underline text-sm mb-4 inline-block">← Back to guests</a>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-5xl text-white">
                {guest.firstName} {guest.lastName}
              </h1>
              <p className="text-text-secondary mt-1">{guest.email || guest.phone || 'No contact'}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display text-accent-gold">
                {formatCurrency(Number(guest.lifetimeValue || 0))}
              </div>
              <div className="text-text-muted text-sm">Lifetime Value</div>
            </div>
          </div>
        </div>

        {/* Allergy Alert Banner */}
        {(guest.allergies?.length > 0) && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 font-ui font-bold mb-1">
              ⚠ ALLERGY ALERT
            </div>
            <div className="flex flex-wrap gap-2">
              {guest.allergies.map((a: string) => (
                <span key={a} className="px-3 py-1 bg-red-900/30 text-red-300 rounded text-sm border border-red-700">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Visit Count', value: guest.visitCount || 0 },
            { label: 'Average Spend', value: formatCurrency(Number(guest.averageSpend || 0)) },
            { label: 'VIP Tier', value: guest.vipTier || 'NONE' },
            { label: 'Last Visit', value: guest.lastVisit ? formatDate(guest.lastVisit) : 'Never' },
          ].map(stat => (
            <div key={stat.label} className="bg-bg-secondary border border-bg-elevated rounded-lg p-4">
              <div className="text-text-secondary text-sm">{stat.label}</div>
              <div className="text-2xl font-display text-white mt-1">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="mb-8">
          <h2 className="font-display text-2xl text-accent-gold mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {(guest.tags || []).map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-bg-secondary border border-accent-gold/30 text-accent-gold rounded text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Staff Notes */}
        {guest.staffNotes && (
          <div className="mb-8">
            <h2 className="font-display text-2xl text-accent-gold mb-3">Staff Notes</h2>
            <p className="text-text-secondary bg-bg-secondary p-4 rounded border border-bg-elevated">{guest.staffNotes}</p>
          </div>
        )}

        {/* Visit History */}
        <div>
          <h2 className="font-display text-2xl text-accent-gold mb-3">Visit History</h2>
          {history?.visits?.length > 0 ? (
            <div className="space-y-3">
              {history.visits.map((visit: any, i: number) => (
                <div key={i} className="bg-bg-secondary border border-bg-elevated rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="text-white font-ui font-medium">{formatDate(visit.date)}</div>
                    <div className="text-text-secondary text-sm">
                      Table {visit.table} · Server: {visit.server}
                    </div>
                  </div>
                  <div className="text-accent-gold font-display text-xl">
                    {formatCurrency(visit.totalSpend)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-text-muted">No visits recorded</div>
          )}
        </div>
      </div>
    </div>
  );
}