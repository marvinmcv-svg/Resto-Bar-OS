'use client';

import { useState } from 'react';
import { useGuests, useCreateGuest, useDeleteGuest } from '@/hooks/useGuests';
import { formatDate, formatCurrency } from '@/lib/utils';
import { clsx } from 'clsx';

const TIER_COLORS: Record<string, string> = {
  NONE: 'text-gray-400',
  BRONZE: 'text-amber-600',
  SILVER: 'text-gray-300',
  GOLD: 'text-accent-gold',
  PLATINUM: 'text-platinum bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text',
};

const TIER_BADGE: Record<string, string> = {
  NONE: 'bg-gray-800 text-gray-400',
  BRONZE: 'bg-amber-900/30 text-amber-600 border border-amber-700',
  SILVER: 'bg-gray-700/30 text-gray-300 border border-gray-500',
  GOLD: 'bg-accent-gold/10 text-accent-gold border border-accent-gold',
  PLATINUM: 'bg-gradient-to-r from-slate-200/10 to-slate-400/10 text-white border border-white/50',
};

export default function GuestsPage() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<string>('');
  const { data: guests = [], isLoading } = useGuests(search, tier || undefined);
  const createGuest = useCreateGuest();
  const deleteGuest = useDeleteGuest();

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-accent-gold">Guest Intelligence</h1>
            <p className="text-text-secondary mt-1">
              {guests.length} guests in database
            </p>
          </div>
          <button
            onClick={() => createGuest.mutate({ firstName: 'New', email: 'new@guest.com' })}
            className="px-4 py-2 bg-accent-gold text-bg-primary font-ui font-medium rounded hover:bg-accent-gold-light transition"
          >
            + Add Guest
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
          />
          <select
            value={tier}
            onChange={e => setTier(e.target.value)}
            className="px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white"
          >
            <option value="">All Tiers</option>
            <option value="NONE">Standard</option>
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
            <option value="PLATINUM">Platinum</option>
          </select>
        </div>

        {/* Guest Table */}
        {isLoading ? (
          <div className="text-center py-20 text-text-muted">Loading guests...</div>
        ) : guests.length === 0 ? (
          <div className="text-center py-20 text-text-muted">No guests found</div>
        ) : (
          <div className="bg-bg-secondary rounded-lg border border-bg-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-elevated text-left text-text-secondary text-sm font-ui">
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3">Lifetime Value</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">Last Visit</th>
                  <th className="px-4 py-3">Allergies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-elevated">
                {guests.map((guest: any) => (
                  <tr key={guest.id} className="hover:bg-bg-elevated transition">
                    <td className="px-4 py-3">
                      <a href={`/guests/${guest.id}`} className="text-white hover:text-accent-gold font-medium">
                        {guest.firstName} {guest.lastName || ''}
                      </a>
                      {guest.preferredName && (
                        <span className="text-text-muted text-sm ml-1">"{guest.preferredName}"</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {guest.email && <div>{guest.email}</div>}
                      {guest.phone && <div>{guest.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-ui font-medium', TIER_BADGE[guest.vipTier])}>
                        {guest.vipTier || 'NONE'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(guest.tags || []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-bg-elevated text-text-secondary text-xs rounded font-ui">
                            {tag}
                          </span>
                        ))}
                        {(guest.tags || []).length > 3 && (
                          <span className="px-2 py-0.5 text-text-muted text-xs">+{guest.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-accent-gold font-ui font-medium">
                      ${Number(guest.lifetimeValue || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white">{guest.visitCount || 0}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {guest.lastVisit ? formatDate(guest.lastVisit) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      {(guest.allergies || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {guest.allergies.map((a: string) => (
                            <span key={a} className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded border border-red-800">
                              ⚠ {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}