'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReservation, useChangeReservationStatus } from '@/hooks/useReservations';
import type { ReservationStatus } from '@prisma/client';

const STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700',
  CONFIRMED: 'bg-green-900/30 text-green-400 border border-green-700',
  SEATED: 'bg-blue-900/30 text-blue-400 border border-blue-700',
  COMPLETED: 'bg-gray-800/30 text-gray-400 border border-gray-600',
  NO_SHOW: 'bg-red-900/30 text-red-400 border border-red-700',
  CANCELLED: 'bg-orange-900/30 text-orange-400 border border-orange-700',
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SEATED: 'Seated',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  CANCELLED: 'Cancelled',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const TIER_COLORS: Record<string, string> = {
  NONE: 'bg-gray-800/30 text-gray-400 border border-gray-600',
  BRONZE: 'bg-amber-900/30 text-amber-600 border border-amber-700',
  SILVER: 'bg-gray-700/30 text-gray-300 border border-gray-500',
  GOLD: 'bg-accent-gold/10 text-accent-gold border border-accent-gold',
  PLATINUM: 'bg-gradient-to-r from-slate-200/10 to-slate-400/10 text-white border border-white/50',
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

function ActionButton({ label, onClick, variant, disabled }: ActionButtonProps) {
  const base = 'px-4 py-2 rounded font-ui font-medium transition text-sm';
  const variants = {
    primary: 'bg-accent-gold text-bg-primary hover:bg-accent-gold-light',
    secondary: 'bg-bg-elevated text-text-secondary hover:text-white hover:border-white/20 border border-bg-elevated',
    danger: 'bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {label}
    </button>
  );
}

export default function ReservationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: reservation, isLoading } = useReservation(params.id);
  const changeStatus = useChangeReservationStatus();
  const [notes, setNotes] = useState(reservation?.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (!reservation) return <div className="p-8 text-red-400">Reservation not found</div>;

  const name = [reservation.guestFirstName, reservation.guestLastName]
    .filter(Boolean)
    .join(' ') || reservation.guest?.firstName + ' ' + (reservation.guest?.lastName ?? '') || 'Walk-in';

  const canSeat = reservation.status === 'PENDING' || reservation.status === 'CONFIRMED';
  const canComplete = reservation.status === 'SEATED';
  const canNoShow = reservation.status === 'PENDING' || reservation.status === 'CONFIRMED';
  const canCancel = !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservation.status);

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/en/reservations')} className="text-accent-gold hover:underline text-sm mb-4 inline-block">
            ← Back to reservations
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-5xl text-white">{name.trim()}</h1>
              <p className="text-text-secondary mt-1">{formatDate(reservation.date)} at {formatTime(reservation.time)}</p>
            </div>
            <span className={`px-3 py-1 rounded text-sm font-ui font-medium ${STATUS_COLORS[reservation.status]}`}>
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>
        </div>

        {/* Actions */}
        {(canSeat || canComplete || canNoShow || canCancel) && (
          <div className="flex flex-wrap gap-3 mb-8">
            {canSeat && (
              <ActionButton
                label="Seat Guest"
                variant="primary"
                onClick={() => changeStatus.mutate({ id: params.id, status: 'SEATED' })}
                disabled={changeStatus.isPending}
              />
            )}
            {canComplete && (
              <ActionButton
                label="Complete"
                variant="primary"
                onClick={() => changeStatus.mutate({ id: params.id, status: 'COMPLETED' })}
                disabled={changeStatus.isPending}
              />
            )}
            {canNoShow && (
              <ActionButton
                label="No Show"
                variant="danger"
                onClick={() => changeStatus.mutate({ id: params.id, status: 'NO_SHOW' })}
                disabled={changeStatus.isPending}
              />
            )}
            {canCancel && (
              <ActionButton
                label="Cancel"
                variant="secondary"
                onClick={() => changeStatus.mutate({ id: params.id, status: 'CANCELLED' })}
                disabled={changeStatus.isPending}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Guest Info */}
          <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-6">
            <h2 className="font-display text-xl text-accent-gold mb-4">Guest Details</h2>
            <div className="space-y-3">
              {reservation.guest?.firstName && (
                <div>
                  <div className="text-text-secondary text-sm">Name</div>
                  <div className="text-white">{name.trim()}</div>
                </div>
              )}
              {reservation.guestEmail && (
                <div>
                  <div className="text-text-secondary text-sm">Email</div>
                  <div className="text-white">{reservation.guestEmail}</div>
                </div>
              )}
              {reservation.guestPhone && (
                <div>
                  <div className="text-text-secondary text-sm">Phone</div>
                  <div className="text-white">{reservation.guestPhone}</div>
                </div>
              )}
              {reservation.guest?.vipTier && reservation.guest.vipTier !== 'NONE' && (
                <div>
                  <div className="text-text-secondary text-sm">VIP Tier</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-ui font-medium mt-1 ${TIER_COLORS[reservation.guest.vipTier]}`}>
                    {reservation.guest.vipTier}
                  </span>
                </div>
              )}
              {reservation.guest?.lifetimeValue != null && (
                <div>
                  <div className="text-text-secondary text-sm">Lifetime Value</div>
                  <div className="text-accent-gold">${Number(reservation.guest.lifetimeValue).toLocaleString()}</div>
                </div>
              )}
              {reservation.occasion && (
                <div>
                  <div className="text-text-secondary text-sm">Occasion</div>
                  <div className="text-white">{reservation.occasion}</div>
                </div>
              )}
            </div>
          </div>

          {/* Reservation Info */}
          <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-6">
            <h2 className="font-display text-xl text-accent-gold mb-4">Reservation Info</h2>
            <div className="space-y-3">
              <div>
                <div className="text-text-secondary text-sm">Date & Time</div>
                <div className="text-white">{formatDate(reservation.date)} · {formatTime(reservation.time)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-sm">Party Size</div>
                <div className="text-white">{reservation.partySize} guest{reservation.partySize !== 1 ? 's' : ''}</div>
              </div>
              {reservation.table && (
                <div>
                  <div className="text-text-secondary text-sm">Table</div>
                  <div className="text-white">Table {reservation.table.number}{reservation.table.section ? ` (${reservation.table.section})` : ''}</div>
                </div>
              )}
              <div>
                <div className="text-text-secondary text-sm">Booking Type</div>
                <div className="text-white">{reservation.bookingType}</div>
              </div>
              {reservation.depositRequired && (
                <div>
                  <div className="text-text-secondary text-sm">Deposit</div>
                  <div className="text-white">${reservation.depositAmount}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 bg-bg-secondary border border-bg-elevated rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-accent-gold">Notes</h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-accent-gold text-sm hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes..."
                className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingNotes(false)}
                  className="px-4 py-2 bg-transparent text-text-secondary border border-bg-elevated rounded hover:text-white transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setEditingNotes(false)}
                  className="px-4 py-2 bg-accent-gold text-bg-primary rounded font-medium text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-text-secondary">
              {notes || 'No notes yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}