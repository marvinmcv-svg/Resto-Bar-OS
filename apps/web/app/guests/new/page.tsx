'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateGuest } from '@/hooks/useGuests';

type VipTierOverride = 'KEEP_EXISTING' | 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vipTierOverride: VipTierOverride;
  birthday: string;
  allergies: string;
  notes: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
}

interface FormErrors {
  firstName?: string;
  email?: string;
}

export default function NewGuestPage() {
  const router = useRouter();
  const createGuest = useCreateGuest();

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    vipTierOverride: 'KEEP_EXISTING',
    birthday: '',
    allergies: '',
    notes: '',
    emailOptIn: false,
    smsOptIn: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [showApiError, setShowApiError] = useState(false);

  // Check user role from JWT for VIP tier override visibility
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload?.role || null);
      } catch {
        setUserRole(null);
      }
    }
  }, []);

  const isManagerOrOwner = userRole === 'OWNER' || userRole === 'MANAGER';

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
    };

    if (form.lastName.trim()) payload.lastName = form.lastName.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.vipTierOverride !== 'KEEP_EXISTING') payload.vipTierOverride = form.vipTierOverride;
    if (form.birthday) payload.birthday = form.birthday;
    if (form.allergies.trim()) {
      payload.allergies = form.allergies.split(',').map(a => a.trim()).filter(Boolean);
    }
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (form.emailOptIn) payload.emailOptIn = true;
    if (form.smsOptIn) payload.smsOptIn = true;

    try {
      const result = await createGuest.mutateAsync(payload as Record<string, unknown>);
      const newId = result?.id || result?.data?.id;
      if (newId) {
        router.push(`/guests/${newId}`);
      } else {
        router.push('/guests');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create guest. Please try again.';
      setApiError(message);
      setShowApiError(true);
      setTimeout(() => setShowApiError(false), 4000);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (name === 'firstName' && errors.firstName) {
      setErrors(prev => ({ ...prev, firstName: undefined }));
    }
    if (name === 'email' && errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <a
          href="/guests"
          className="text-accent-gold hover:underline text-sm mb-6 inline-block"
        >
          ← Back to Guests
        </a>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl text-accent-gold">New Guest</h1>
          <p className="text-text-secondary mt-1">Create a guest profile</p>
        </div>

        {/* API Error toast */}
        {showApiError && apiError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-ui text-text-secondary mb-2">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Enter first name"
              className={`w-full px-4 py-2 bg-bg-secondary border rounded text-white placeholder:text-text-muted focus:outline-none focus:border-accent-gold transition ${
                errors.firstName ? 'border-red-500' : 'border-bg-elevated'
              }`}
            />
            {errors.firstName && (
              <p className="mt-1 text-red-400 text-xs">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-ui text-text-secondary mb-2">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Enter last name"
              className="w-full px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none transition"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-ui text-text-secondary mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="guest@example.com"
              className={`w-full px-4 py-2 bg-bg-secondary border rounded text-white placeholder:text-text-muted focus:outline-none focus:border-accent-gold transition ${
                errors.email ? 'border-red-500' : 'border-bg-elevated'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-red-400 text-xs">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-ui text-text-secondary mb-2">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 555-1234"
              className="w-full px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none transition"
            />
          </div>

          {/* VIP Tier Override — only for OWNER/MANAGER */}
          {isManagerOrOwner && (
            <div>
              <label htmlFor="vipTierOverride" className="block text-sm font-ui text-text-secondary mb-2">
                VIP Tier Override
              </label>
              <select
                id="vipTierOverride"
                name="vipTierOverride"
                value={form.vipTierOverride}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none transition"
              >
                <option value="KEEP_EXISTING">Keep Existing</option>
                <option value="NONE">None (Standard)</option>
                <option value="BRONZE">Bronze</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>
          )}

          {/* Birthday */}
          <div>
            <label htmlFor="birthday" className="block text-sm font-ui text-text-secondary mb-2">
              Birthday
            </label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              value={form.birthday}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white focus:border-accent-gold focus:outline-none transition"
            />
          </div>

          {/* Allergies */}
          <div>
            <label htmlFor="allergies" className="block text-sm font-ui text-text-secondary mb-2">
              Allergies
            </label>
            <input
              id="allergies"
              name="allergies"
              type="text"
              value={form.allergies}
              onChange={handleChange}
              placeholder="gluten, nuts, shellfish (comma-separated)"
              className="w-full px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none transition"
            />
            <p className="mt-1 text-text-muted text-xs">Separate multiple allergies with commas</p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-ui text-text-secondary mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Staff notes, preferences, special occasions..."
              className="w-full px-4 py-2 bg-bg-secondary border border-bg-elevated rounded text-white placeholder:text-text-muted focus:border-accent-gold focus:outline-none transition resize-none"
            />
          </div>

          {/* Opt-ins */}
          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="emailOptIn"
                checked={form.emailOptIn}
                onChange={handleChange}
                className="w-4 h-4 rounded border-bg-elevated bg-bg-secondary accent-accent-gold"
              />
              <span className="text-sm font-ui text-text-secondary">Email opt-in</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="smsOptIn"
                checked={form.smsOptIn}
                onChange={handleChange}
                className="w-4 h-4 rounded border-bg-elevated bg-bg-secondary accent-accent-gold"
              />
              <span className="text-sm font-ui text-text-secondary">SMS opt-in</span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createGuest.isPending}
              className="px-6 py-2.5 bg-accent-gold text-bg-primary font-ui font-medium rounded hover:bg-accent-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createGuest.isPending ? 'Creating...' : 'Create Guest'}
            </button>
            <a
              href="/guests"
              className="px-6 py-2.5 border border-bg-elevated text-text-secondary font-ui font-medium rounded hover:border-accent-gold hover:text-accent-gold transition"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}