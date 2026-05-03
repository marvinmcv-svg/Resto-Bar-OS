'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateReservation } from '@/hooks/useReservations';

const OCCASIONS = ['None', 'Birthday', 'Anniversary', 'Business', 'Date Night', 'Other'];

interface FormData {
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  date: string;
  time: string;
  partySize: number;
  tableId: string;
  occasion: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  guestFirstName: '',
  guestLastName: '',
  guestEmail: '',
  guestPhone: '',
  date: new Date().toISOString().split('T')[0],
  time: '',
  partySize: 2,
  tableId: '',
  occasion: 'None',
  notes: '',
};

// Time slots from 11:00 to 21:30 in 30-min increments
function generateTimeSlots() {
  const slots = [];
  for (let h = 11; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 21 && m > 30) break;
      const hour = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      slots.push(`${hour}:${min}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function NewReservationPage() {
  const router = useRouter();
  const createReservation = useCreateReservation();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().split('T')[0]; })();

  const handleChange = useCallback((field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestFirstName || !formData.date || !formData.time) {
      setError('Please fill in required fields.');
      return;
    }
    if (formData.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      const result = await createReservation.mutateAsync({
        guestFirstName: formData.guestFirstName,
        guestLastName: formData.guestLastName || undefined,
        guestEmail: formData.guestEmail || undefined,
        guestPhone: formData.guestPhone || undefined,
        date: formData.date,
        time: formData.time,
        partySize: formData.partySize,
        tableId: formData.tableId || undefined,
        occasion: formData.occasion !== 'None' ? formData.occasion : undefined,
        notes: formData.notes || undefined,
      });
      router.push(`/en/reservations/${result.id}`);
    } catch {
      setError('Unable to create reservation. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-accent-gold hover:underline text-sm mb-4 inline-block"
          >
            ← Back
          </button>
          <h1 className="font-display text-4xl text-accent-gold">New Reservation</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Info Section */}
          <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-6">
            <h2 className="font-display text-xl text-accent-gold mb-4">Guest Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Name *</label>
                <input
                  type="text"
                  value={formData.guestFirstName}
                  onChange={e => handleChange('guestFirstName', e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Last name</label>
                <input
                  type="text"
                  value={formData.guestLastName}
                  onChange={e => handleChange('guestLastName', e.target.value)}
                  placeholder="Last name"
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={formData.guestEmail}
                  onChange={e => handleChange('guestEmail', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  value={formData.guestPhone}
                  onChange={e => handleChange('guestPhone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Reservation Details Section */}
          <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-6">
            <h2 className="font-display text-xl text-accent-gold mb-4">Reservation Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  min={today}
                  max={maxDate}
                  onChange={e => handleChange('date', e.target.value)}
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Time *</label>
                <select
                  value={formData.time}
                  onChange={e => handleChange('time', e.target.value)}
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none"
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map(slot => {
                    const [h, m] = slot.split(':').map(Number);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const hour = h % 12 || 12;
                    const label = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
                    return <option key={slot} value={slot}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Party size</label>
                <select
                  value={formData.partySize}
                  onChange={e => handleChange('partySize', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Table</label>
                <select
                  value={formData.tableId}
                  onChange={e => handleChange('tableId', e.target.value)}
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none"
                >
                  <option value="">Auto-assign</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Occasion</label>
                <select
                  value={formData.occasion}
                  onChange={e => handleChange('occasion', e.target.value)}
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none"
                >
                  {OCCASIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-text-secondary text-sm mb-1 uppercase tracking-wide">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Special requests, allergies, preferences..."
                  rows={3}
                  className="w-full px-4 py-2 bg-bg-elevated border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 bg-transparent text-text-secondary border border-bg-elevated rounded-lg hover:border-white/20 hover:text-white transition font-ui"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReservation.isPending}
              className="flex-1 px-4 py-3 bg-accent-gold text-bg-primary font-ui font-medium rounded-lg hover:bg-accent-gold-light transition disabled:opacity-50"
            >
              {createReservation.isPending ? 'Creating...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}