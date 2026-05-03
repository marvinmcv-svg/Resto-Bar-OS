import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

export function useGuests(search?: string, tier?: string) {
  return useQuery({
    queryKey: ['guests', search, tier],
    queryFn: () =>
      apiClient.get('/guests', { params: { q: search, tier } }).then(r => r.data),
    enabled: true,
  });
}

export function useGuest(id: string) {
  return useQuery({
    queryKey: ['guest', id],
    queryFn: () => apiClient.get(`/guests/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useGuestHistory(id: string) {
  return useQuery({
    queryKey: ['guest', id, 'history'],
    queryFn: () => apiClient.get(`/guests/${id}/history`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/guests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  });
}

export function useUpdateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiClient.patch(`/guests/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['guests'] });
      qc.invalidateQueries({ queryKey: ['guest', vars.id] });
    },
  });
}

export function useDeleteGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/guests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  });
}