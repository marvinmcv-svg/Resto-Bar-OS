import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { kdsApi } from '../api/client';

interface KdsItem {
  id: string;
  name: string;
  quantity: number;
  modifiers: string[];
  allergies: string[];
  station: string;
  status: string;
  courseNumber: number;
}

interface KdsOrder {
  id: string;
  tableNumber: number;
  status: string;
  firedAt: string;
  items: KdsItem[];
}

const STATION_COLORS: Record<string, string> = {
  GRILL: '#EF4444',
  COLD: '#3B82F6',
  PASTRY: '#EC4899',
  BAR: '#8B5CF6',
  EXPO: '#F59E0B',
};

const ELAPSED_WARN_MS = 8 * 60 * 1000;

function elapsed(firedAt: string) {
  const ms = Date.now() - new Date(firedAt).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return { label: `${mins}:${secs.toString().padStart(2, '0')}`, warning: ms > ELAPSED_WARN_MS };
}

export default function KitchenDisplayScreen() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await kdsApi.getActiveOrders();
      setOrders(res.data);
    } catch {
      // silently keep stale data on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const bumpItem = async (itemId: string) => {
    try {
      await kdsApi.bumpItem(itemId);
      await fetchOrders(true);
    } catch {
      // no-op
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Kitchen Display</Text>
      {orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No active orders</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          numColumns={2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(true); }} tintColor="#D4AF37" />
          }
          renderItem={({ item: order }) => {
            const timer = order.firedAt ? elapsed(order.firedAt) : null;
            return (
              <View style={[styles.ticket, timer?.warning && styles.ticketWarning]}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTable}>Table {order.tableNumber}</Text>
                  {timer && (
                    <Text style={[styles.ticketTimer, timer.warning && styles.timerWarning]}>
                      {timer.label}
                    </Text>
                  )}
                </View>
                {order.items.map((item) => {
                  const stationColor = STATION_COLORS[item.station] ?? '#888';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.item, item.status === 'READY' && styles.itemReady]}
                      onPress={() => bumpItem(item.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.stationDot, { backgroundColor: stationColor }]} />
                        <Text style={styles.itemName}>{item.quantity}× {item.name}</Text>
                      </View>
                      {item.modifiers.length > 0 && (
                        <Text style={styles.modifiers}>{item.modifiers.join(', ')}</Text>
                      )}
                      {item.allergies.length > 0 && (
                        <Text style={styles.allergies}>⚠ {item.allergies.join(', ')}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { color: '#D4AF37', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#555', fontSize: 16 },
  list: { paddingBottom: 24 },
  ticket: {
    flex: 1, margin: 6, backgroundColor: '#111', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#222',
  },
  ticketWarning: { borderColor: '#EF4444' },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  ticketTable: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  ticketTimer: { color: '#22C55E', fontSize: 14, fontWeight: '600' },
  timerWarning: { color: '#EF4444' },
  item: {
    backgroundColor: '#1a1a1a', borderRadius: 6, padding: 8, marginBottom: 6,
  },
  itemReady: { backgroundColor: '#052305' },
  stationDot: { width: 8, height: 8, borderRadius: 4 },
  itemName: { color: '#FFF', fontSize: 13, fontWeight: '600', flex: 1 },
  modifiers: { color: '#888', fontSize: 11, marginTop: 2 },
  allergies: { color: '#F59E0B', fontSize: 11, marginTop: 2, fontWeight: '600' },
});
