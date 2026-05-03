'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Users, Clock, ChevronRight } from 'lucide-react';
import {
  getTables,
  updateTableStatus,
  getCoverage,
  getCoverageByDate,
  type Table,
  type Coverage,
  type CoverageSlot,
} from '@/lib/api-floor';
import { TableStatus } from '@prisma/client';
import styles from './floor.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TableStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED:  'Reserved',
  SEATED:    'Seated',
  ORDERED:   'Ordered',
  DESSERT:   'Dessert',
  BILL:      'Bill',
  TURNING:   'Turning',
};

const STATUS_COLORS: Record<TableStatus, string> = {
  AVAILABLE: '#22c55e',
  RESERVED:  '#c9a962',
  SEATED:    '#3b82f6',
  ORDERED:   '#a855f7',
  DESSERT:   '#f59e0b',
  BILL:      '#06b6d4',
  TURNING:   '#6b7280',
};

const LUNCH_SLOTS = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00'];
const DINNER_SLOTS = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

// Actions available per status
const ACTIONS_BY_STATUS: Record<TableStatus, { label: string; next: TableStatus }[]> = {
  AVAILABLE: [{ label: 'Seat Party', next: TableStatus.SEATED }],
  RESERVED: [
    { label: 'Seat', next: TableStatus.SEATED },
    { label: 'No-Show', next: TableStatus.AVAILABLE },
    { label: 'Cancel', next: TableStatus.AVAILABLE },
  ],
  SEATED:   [{ label: 'Update → Ordered', next: TableStatus.ORDERED }],
  ORDERED:  [{ label: 'Update → Dessert', next: TableStatus.DESSERT }],
  DESSERT:  [{ label: 'Update → Bill', next: TableStatus.BILL }],
  BILL:     [{ label: 'Close Bill', next: TableStatus.TURNING }],
  TURNING:  [{ label: 'Clear Table', next: TableStatus.AVAILABLE }],
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryBar({ coverage }: { coverage: Coverage | undefined }) {
  return (
    <div className={styles.summaryBar}>
      {coverage ? (
        <>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue} style={{ color: '#22c55e' }}>
              {coverage.available}
            </span>
            <span className={styles.summaryLabel}>Available</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue} style={{ color: '#3b82f6' }}>
              {coverage.seated}
            </span>
            <span className={styles.summaryLabel}>Occupied</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{coverage.total}</span>
            <span className={styles.summaryLabel}>Total</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{coverage.occupancyRate}%</span>
            <span className={styles.summaryLabel}>Occupied</span>
          </div>
        </>
      ) : (
        <span className={styles.summaryLoading}>Loading...</span>
      )}
    </div>
  );
}

function TableCard({
  table,
  onClick,
}: {
  table: Table;
  onClick: () => void;
}) {
  const color = STATUS_COLORS[table.status];

  return (
    <button
      className={styles.tableCard}
      style={{ '--table-color': color } as React.CSSProperties}
      onClick={onClick}
    >
      <div className={styles.tableNumber}>#{table.number}</div>
      <div className={styles.tableMeta}>
        <Users size={12} />
        <span>{table.capacity}</span>
      </div>
      <div
        className={styles.tableStatus}
        style={{ color, borderColor: color }}
      >
        {STATUS_LABELS[table.status]}
      </div>
      {table.section && (
        <div className={styles.tableSection}>{table.section}</div>
      )}
    </button>
  );
}

function TimeSlotRow({
  period,
  slots,
  tablesBySlot,
}: {
  period: 'LUNCH' | 'DINNER';
  slots: string[];
  tablesBySlot: Record<string, Table[]>;
}) {
  return (
    <div className={styles.timeSlotRow}>
      <div className={styles.periodLabel}>{period}</div>
      <div className={styles.slotTrack}>
        {slots.map((slot) => {
          const tables = tablesBySlot[slot] ?? [];
          return (
            <div key={slot} className={styles.slotCell}>
              <div className={styles.slotTime}>{slot}</div>
              <div className={styles.slotTables}>
                {tables.length === 0 ? (
                  <span className={styles.slotEmpty}>—</span>
                ) : (
                  tables.map((t) => (
                    <div
                      key={t.id}
                      className={styles.slotPip}
                      style={{ background: STATUS_COLORS[t.status] }}
                      title={`Table ${t.number}: ${STATUS_LABELS[t.status]}`}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SidePanel({
  table,
  onClose,
  onAction,
  actionLoading,
}: {
  table: Table;
  onClose: () => void;
  onAction: (status: TableStatus) => void;
  actionLoading: boolean;
}) {
  const actions = ACTIONS_BY_STATUS[table.status] ?? [];

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sidePanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Table {table.number}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.panelBody}>
          {/* Status badge */}
          <div
            className={styles.statusBadge}
            style={{
              color: STATUS_COLORS[table.status],
              borderColor: STATUS_COLORS[table.status],
            }}
          >
            {STATUS_LABELS[table.status]}
          </div>

          {/* Meta */}
          <div className={styles.panelMeta}>
            <div className={styles.metaRow}>
              <Users size={14} />
              <span>Capacity: {table.capacity} seats</span>
            </div>
            {table.section && (
              <div className={styles.metaRow}>
                <Clock size={14} />
                <span>Section: {table.section}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className={styles.panelActions}>
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={styles.actionBtn}
                  onClick={() => onAction(action.next)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Updating...' : action.label}
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          )}

          {actions.length === 0 && (
            <p className={styles.noActions}>No actions available.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FloorPage() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const queryClient = useQueryClient();

  // Today's date string for coverage query
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['floor-tables'],
    queryFn: getTables,
  });

  const { data: coverage } = useQuery({
    queryKey: ['floor-coverage'],
    queryFn: getCoverage,
    refetchInterval: 30_000,
  });

  // Real per-slot coverage — refreshes every 30 s
  const { data: coverageSlots = [] } = useQuery({
    queryKey: ['floor-coverage-by-date', todayStr],
    queryFn: () => getCoverageByDate(todayStr),
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      updateTableStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-tables'] });
      queryClient.invalidateQueries({ queryKey: ['floor-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['floor-coverage-by-date'] });
      setSelectedTable(null);
    },
  });

  const handleAction = (status: TableStatus) => {
    if (!selectedTable) return;
    statusMutation.mutate({ id: selectedTable.id, status });
  };

  // Group tables by section for the floor grid
  const sections = [...new Set(tables.map((t) => t.section ?? 'Main'))];
  const tablesBySection = sections.reduce<Record<string, Table[]>>((acc, sec) => {
    acc[sec] = tables.filter((t) => (t.section ?? 'Main') === sec);
    return acc;
  }, {});

  // Build tables-by-slot map from real coverage data
  const tablesBySlot = coverageSlots.reduce<Record<string, Table[]>>((acc, slot) => {
    const tableObjs = slot.tables.map((st) => ({
      id: st.id,
      number: st.number,
      status: st.status,
    })) as unknown as Table[];
    acc[slot.time] = tableObjs;
    return acc;
  }, {});

  const now = new Date();
  const hour = now.getHours();
  const isLunch = hour < 15;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Floor Plan</h1>
      </div>

      <SummaryBar coverage={coverage} />

      {tablesLoading ? (
        <div className={styles.loading}>Loading floor plan...</div>
      ) : (
        <>
          {/* Time slot timeline */}
          <div className={styles.coverageSection}>
            <h2 className={styles.sectionTitle}>Coverage — {isLunch ? 'Lunch' : 'Dinner'}</h2>
            <TimeSlotRow period="LUNCH" slots={LUNCH_SLOTS} tablesBySlot={tablesBySlot} />
            <TimeSlotRow period="DINNER" slots={DINNER_SLOTS} tablesBySlot={tablesBySlot} />
          </div>

          {/* Floor grid by section */}
          <div className={styles.floorGrid}>
            {sections.map((section) => (
              <div key={section} className={styles.sectionBlock}>
                <h3 className={styles.sectionLabel}>{section}</h3>
                <div className={styles.tableGrid}>
                  {tablesBySection[section].map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onClick={() => setSelectedTable(table)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {tables.length === 0 && (
              <p className={styles.emptyFloor}>No tables found. Add tables to get started.</p>
            )}
          </div>
        </>
      )}

      {/* Side panel */}
      {selectedTable && (
        <SidePanel
          table={
            tables.find((t) => t.id === selectedTable.id) ?? selectedTable
          }
          onClose={() => setSelectedTable(null)}
          onAction={handleAction}
          actionLoading={statusMutation.isPending}
        />
      )}

      {/* Error toast */}
      {statusMutation.isError && (
        <div className={styles.errorToast}>
          Failed to update table status. Please try again.
        </div>
      )}
    </div>
  );
}