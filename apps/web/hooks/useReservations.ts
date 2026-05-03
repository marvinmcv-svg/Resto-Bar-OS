import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import type { ReservationStatus } from '@prisma/client';

export interface ReservationListItem {
  id: string;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  date: string;
  time: string;
  partySize: number;
  status: ReservationStatus;
  occasion: string | null;
  notes: string | null;
  tableId: string | null;
  table: { id: string; number: number; section: string | null } | null;
  guest: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    vipTier: string | null;
    lifetimeValue: number | null;
  } | null;
  bookingType: string;
  depositRequired: boolean;
  depositAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useReservations(date?: string) {
  return useQuery({
    queryKey: ['reservations', date],
    queryFn: () =>
      apiClient
        .get<ReservationListItem[]>('/reservations', { params: { date } })
        .then(r => r.data),
    enabled: true,
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: () => apiClient.get<ReservationListItem>(`/reservations/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      guestFirstName: string;
      guestLastName?: string;
      guestEmail?: string;
      guestPhone?: string;
      date: string;
      time: string;
      partySize: number;
      tableId?: string;
      occasion?: string;
      occasionNote?: string;
      notes?: string;
      bookingType?: string;
      depositRequired?: boolean;
    }) => apiClient.post<ReservationListItem>('/reservations', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export interface ChangeStatusPayload {
  status: ReservationStatus;
  reason?: string;
}

export function useChangeReservationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ChangeStatusPayload & { id: string }) =>
      apiClient.patch<ReservationListItem>(`/reservations/${id}/status`, data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['reservation', vars.id] });
    },
  });
}