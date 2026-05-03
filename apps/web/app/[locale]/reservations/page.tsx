'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReservations } from '@/hooks/useReservations';
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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const LUNCH_SLOTS = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00'];
const DINNER_SLOTS = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

function isLunchSlot(time: string) {
  return LUNCH_SLOTS.includes(time);
}

function isDinnerSlot(time: string) {
  return DINNER_SLOTS.includes(time);
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

type Period = 'ALL' | 'LUNCH' | 'DINNER';

export default function ReservationsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [period, setPeriod] = useState<Period>('ALL');
  const { data: reservations = [], isLoading } = useReservations(selectedDate);

  // Filter by period
  const filtered = reservations.filter(r => {
    if (period === 'ALL') return true;
    if (period === 'LUNCH') return isLunchSlot(r.time);
    if (period === 'DINNER') return isDinnerSlot(r.time);
    return true;
  });

  // Group by time slot
  const grouped: Record<string, typeof filtered> = {};
  for (const r of filtered) {
    if (!grouped[r.time]) grouped[r.time] = [];
    grouped[r.time].push(r);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-accent-gold">Reservations</h1>
            <p className="text-text-secondary mt-1">
              {formatDate(selectedDate)} · {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/en/reservations/new')}
            className="px-4 py-2 bg-accent-gold text-bg-primary font-ui font-medium rounded hover:bg-accent-gold-light transition"
          >
            + New Reservation
          </button>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="date"
            value={selectedDate}
            min={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none"
          />
          <button
            onClick={() => setSelectedDate(today)}
            className="px-3 py-2 text-text-secondary hover:text-accent-gold text-sm border border-bg-elevated rounded"
          >
            Today
          </button>
        </div>

        {/* Period Toggle */}
        <div className="flex items-center gap-2 mb-6">
          {(['ALL', 'LUNCH', 'DINNER'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded text-sm font-ui font-medium transition ${
                period === p
                  ? 'bg-accent-gold text-bg-primary'
                  : 'bg-bg-secondary text-text-secondary border border-bg-elevated hover:text-white'
              }`}
            >
              {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
          <span className="ml-2 text-text-muted text-sm">
            {filtered.length} reservation{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20 text-text-muted">Loading reservations...</div>
        )}

        {/* Empty */}
        {!isLoading && reservations.length === 0 && (
          <div className="text-center py-20 text-text-muted">
            No reservations for {formatDate(selectedDate)}
          </div>
        )}

        {/* Reservation List */}
        {!isLoading && Object.keys(grouped).length > 0 && (
          <div className="space-y-8">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([timeSlot, slotReservations]) => (
                <div key={timeSlot}>
                  <div className="text-accent-gold font-ui font-medium text-sm mb-3 flex items-center gap-2">
                    <span className="w-20">{formatTime(timeSlot)}</span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-secondary">{slotReservations.length} reservation{slotReservations.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {slotReservations.map(res => {
                      const name = [res.guestFirstName, res.guestLastName]
                        .filter(Boolean)
                        .join(' ') || res.guest?.firstName + ' ' + (res.guest?.lastName ?? '') || 'Walk-in';
                      return (
                        <button
                          key={res.id}
                          onClick={() => router.push(`/en/reservations/${res.id}`)}
                          className="w-full text-left bg-bg-secondary border border-bg-elevated rounded-lg p-4 hover:border-accent-gold/50 transition group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Time */}
                              <div className="text-white font-ui font-medium w-20">
                                {formatTime(res.time)}
                              </div>
                              {/* Guest name */}
                              <div>
                                <div className="text-white font-medium">{name.trim()}</div>
                                <div className="text-text-secondary text-sm">
                                  {res.partySize} guest{res.partySize !== 1 ? 's' : ''}
                                  {res.table && (
                                    <> · Table {res.table.number}</>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-ui font-medium ${STATUS_COLORS[res.status]}`}>
                                {STATUS_LABELS[res.status]}
                              </span>
                              <span className="text-text-muted group-hover:text-accent-gold transition">›</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}