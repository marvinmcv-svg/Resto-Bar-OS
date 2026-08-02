import { apiClient } from './api';
import { TableStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Table {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  minCapacity: number;
  section: string | null;
  positionX: number | null;
  positionY: number | null;
  status: TableStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Coverage {
  total: number;
  seated: number;
  available: number;
  occupancyRate: number;
}

export interface CoverageSlot {
  time: string;
  period: 'LUNCH' | 'DINNER';
  tables: { id: string; number: number; status: TableStatus }[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Fetch all tables for the current tenant */
export async function getTables(): Promise<Table[]> {
  const res = await apiClient.get<Table[]>('/floor/tables');
  return res.data;
}

/** Update a single table's status */
export async function updateTableStatus(
  id: string,
  status: TableStatus,
): Promise<void> {
  await apiClient.patch(`/floor/tables/${id}/status`, { status });
}

/** Fetch live coverage summary */
export async function getCoverage(): Promise<Coverage> {
  const res = await apiClient.get<Coverage>('/floor/coverage');
  return res.data;
}

/** Fetch per-slot coverage for a specific date */
export async function getCoverageByDate(
  date: string,
): Promise<CoverageSlot[]> {
  const res = await apiClient.get<CoverageSlot[]>('/floor/coverage/by-date', {
    params: { date },
  });
  return res.data;
}
