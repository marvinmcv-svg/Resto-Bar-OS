import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { tablesApi } from '../api/client';

interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  section?: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22C55E',
  RESERVED: '#F59E0B',
  SEATED: '#3B82F6',
  ORDERED: '#8B5CF6',
  DESSERT: '#EC4899',
  BILL: '#EF4444',
  TURNING: '#6B7280',
};

interface Props {
  onSelectTable: (table: Table) => void;
}

export default function TableListScreen({ onSelectTable }: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await tablesApi.getAll();
      setTables(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load tables');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables(true);
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
      <Text style={styles.header}>Tables</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={tables}
        keyExtractor={(t) => t.id}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status] ?? '#6B7280';
          return (
            <TouchableOpacity
              style={[styles.tableCard, { borderColor: color }]}
              onPress={() => onSelectTable(item)}
            >
              <Text style={styles.tableNumber}>Table {item.number}</Text>
              {item.name && <Text style={styles.tableName}>{item.name}</Text>}
              {item.section && <Text style={styles.tableSection}>{item.section}</Text>}
              <Text style={styles.tableCapacity}>{item.capacity} guests</Text>
              <View style={[styles.statusBadge, { backgroundColor: color }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { color: '#D4AF37', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  error: { color: '#FF4444', marginBottom: 12 },
  list: { paddingBottom: 24 },
  tableCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  tableNumber: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tableName: { color: '#AAA', fontSize: 13, marginBottom: 2 },
  tableSection: { color: '#888', fontSize: 12, marginBottom: 8 },
  tableCapacity: { color: '#888', fontSize: 12, marginBottom: 12 },
  statusBadge: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start' },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
});
