'use client';

import { useState, useCallback } from 'react';
import styles from './BookingForm.css';
import {
  getAvailability,
  createReservation,
  type AvailabilityResponse,
  type ReservationRequest,
  type ReservationResponse,
  type TimeSlot,
} from '@/lib/api-public';

interface BookingFormProps {
  slug: string;
  tenantName: string;
}

type Step = 1 | 2 | 3 | 4;

interface FormData {
  date: string;
  partySize: number;
  time: string;
  name: string;
  email: string;
  phone: string;
  occasion: string;
  notes: string;
}

const OCCASIONS = ['None', 'Birthday', 'Anniversary', 'Business', 'Date Night', 'Other'];

const INITIAL_FORM: FormData = {
  date: '',
  partySize: 2,
  time: '',
  name: '',
  email: '',
  phone: '',
  occasion: 'None',
  notes: '',
};

function generateICSFile(reservation: ReservationResponse): void {
  const startDate = new Date(`${reservation.date}T${reservation.time}`);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatICSDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RestaurantOS//Reservation//EN',
    'BEGIN:VEVENT',
    `UID:${reservation.confirmationNumber}@restaurantos.com`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:Dinner Reservation at ${reservation.restaurantName}`,
    `DESCRIPTION:Confirmation: ${reservation.confirmationNumber}\\nParty Size: ${reservation.partySize}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservation-${reservation.confirmationNumber}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingForm({ slug, tenantName }: BookingFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [confirmation, setConfirmation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const handleFieldChange = useCallback((field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleStep1Continue = async () => {
    if (!formData.date || !formData.partySize) {
      setError('Please select a date and party size.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAvailability(slug, formData.date, formData.partySize);
      setAvailability(data);
      setStep(2);
    } catch {
      setError('Unable to load availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Continue = async () => {
    if (!formData.time) {
      setError('Please select a time slot.');
      return;
    }
    setStep(3);
  };

  const handleStep3Submit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: ReservationRequest = {
        date: formData.date,
        time: formData.time,
        partySize: formData.partySize,
        guest: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          occasion: formData.occasion,
          notes: formData.notes,
        },
      };
      const result = await createReservation(slug, payload);
      setConfirmation(result);
      setStep(4);
    } catch {
      setError('Unable to create reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAnother = () => {
    setFormData(INITIAL_FORM);
    setAvailability(null);
    setConfirmation(null);
    setStep(1);
    setError(null);
  };

  return (
    <div className={styles.bookingForm}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.restaurantName}>{tenantName}</div>
        <div className={styles.progress}>
          Step {step} of 4
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`${styles.progressStep} ${s <= step ? styles.active : ''} ${s < step ? styles.completed : ''}`}
          />
        ))}
      </div>

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Step 1: Date & Party Size */}
      {step === 1 && (
        <div className={styles.step}>
          <h2 className={styles.stepTitle}>Select Date & Party Size</h2>
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <input
              type="date"
              className={styles.input}
              min={formatDate(today)}
              max={formatDate(maxDate)}
              value={formData.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Party Size</label>
            <select
              className={styles.select}
              value={formData.partySize}
              onChange={(e) => handleFieldChange('partySize', parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
              ))}
            </select>
          </div>
          <button className={styles.primaryBtn} onClick={handleStep1Continue} disabled={loading}>
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </div>
      )}

      {/* Step 2: Time Slot Selection */}
      {step === 2 && availability && (
        <div className={styles.step}>
          <h2 className={styles.stepTitle}>Select a Time</h2>
          <div className={styles.slotsGrid}>
            {availability.slots.map((slot) => (
              <button
                key={slot.time}
                className={`${styles.slotBtn} ${formData.time === slot.time ? styles.selected : ''} ${slot.tablesAvailable === 0 ? styles.disabled : ''}`}
                onClick={() => slot.tablesAvailable > 0 && handleFieldChange('time', slot.time)}
                disabled={slot.tablesAvailable === 0}
              >
                <span className={styles.slotTime}>{slot.time}</span>
                <span className={styles.slotTables}>
                  {slot.tablesAvailable > 0 ? `${slot.tablesAvailable} tables` : 'Unavailable'}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.stepActions}>
            <button className={styles.secondaryBtn} onClick={() => setStep(1)}>Back</button>
            <button className={styles.primaryBtn} onClick={handleStep2Continue} disabled={!formData.time}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Guest Details */}
      {step === 3 && (
        <div className={styles.step}>
          <h2 className={styles.stepTitle}>Guest Details</h2>
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input
              type="text"
              className={styles.input}
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email *</label>
            <input
              type="email"
              className={styles.input}
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone *</label>
            <input
              type="tel"
              className={styles.input}
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Occasion</label>
            <select
              className={styles.select}
              value={formData.occasion}
              onChange={(e) => handleFieldChange('occasion', e.target.value)}
            >
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Special Requests</label>
            <textarea
              className={styles.textarea}
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Allergies, dietary restrictions, special requests..."
              rows={3}
            />
          </div>
          <div className={styles.stepActions}>
            <button className={styles.secondaryBtn} onClick={() => setStep(2)}>Back</button>
            <button className={styles.primaryBtn} onClick={handleStep3Submit} disabled={loading}>
              {loading ? 'Booking...' : 'Book Reservation'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && confirmation && (
        <div className={styles.step}>
          <div className={styles.confirmation}>
            <div className={styles.confirmIcon}>✓</div>
            <h2 className={styles.confirmTitle}>Reservation Confirmed!</h2>
            <div className={styles.confirmNumber}>
              #{confirmation.confirmationNumber}
            </div>
            <div className={styles.confirmDetails}>
              <p><strong>{confirmation.restaurantName}</strong></p>
              <p>{confirmation.date} at {confirmation.time}</p>
              <p>{confirmation.partySize} {confirmation.partySize === 1 ? 'Guest' : 'Guests'}</p>
            </div>
          </div>
          <div className={styles.confirmActions}>
            <button className={styles.primaryBtn} onClick={() => generateICSFile(confirmation)}>
              Add to Calendar
            </button>
            <button className={styles.secondaryBtn} onClick={handleBookAnother}>
              Book Another
            </button>
          </div>
        </div>
      )}

      {loading && step < 4 && <div className={styles.loader}>Loading...</div>}
    </div>
  );
}
