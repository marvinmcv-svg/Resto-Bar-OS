import { apiClient } from './api';

export interface TimeSlot {
  time: string;
  tablesAvailable: number;
}

export interface AvailabilityResponse {
  date: string;
  partySize: number;
  slots: TimeSlot[];
}

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  occasion: string;
  notes?: string;
}

export interface ReservationRequest {
  date: string;
  time: string;
  partySize: number;
  guest: GuestDetails;
}

export interface ReservationResponse {
  confirmationNumber: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  guest: GuestDetails;
}

export interface TenantInfo {
  name: string;
  logo?: string;
}

export async function getAvailability(
  slug: string,
  date: string,
  partySize: number
): Promise<AvailabilityResponse> {
  const response = await apiClient.get<AvailabilityResponse>(
    `/public/${slug}/availability`,
    { params: { date, partySize } }
  );
  return response.data;
}

export async function createReservation(
  slug: string,
  data: ReservationRequest
): Promise<ReservationResponse> {
  const response = await apiClient.post<ReservationResponse>(
    `/public/${slug}/reservations`,
    data
  );
  return response.data;
}

export async function getTenantInfo(slug: string): Promise<TenantInfo> {
  const response = await apiClient.get<TenantInfo>(`/public/${slug}/info`);
  return response.data;
}
