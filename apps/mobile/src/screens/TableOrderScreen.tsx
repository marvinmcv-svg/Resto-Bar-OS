import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { menuApi, ordersApi } from '../api/client';
import * as SecureStore from 'expo-secure-store';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  station: string;
  is86: boolean;
}

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  seatNumber?: number;
  modifiers: string[];
}

interface Props {
  tableId: string;
  tableNumber: number;
  onBack: () => void;
}

export default function TableOrderScreen({ tableId, tableNumber, onBack }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    menuApi.getItems()
      .then((res) => setMenuItems(res.data.filter((i: MenuItem) => !i.is86)))
      .catch(() => setError('Failed to load menu'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = menuItems.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase()),
  );

  const addItem = (item: MenuItem) => {
    setOrder((prev) => {
      const existing = prev.findIndex((o) => o.menuItemId === item.id);
      if (existing >= 0) {
        return prev.map((o, i) =>
          i === existing ? { ...o, quantity: o.quantity + 1 } : o,
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, modifiers: [] }];
    });
  };

  const removeItem = (index: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setOrder((prev) =>
      prev
        .map((item, i) => (i === index ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const subtotal = order.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const fireToKitchen = async () => {
    if (order.length === 0) return;
    setFiring(true);
    setError(null);
    try {
      const rawToken = await SecureStore.getItemAsync('accessToken');
      const payload = rawToken ? JSON.parse(atob(rawToken.split('.')[1])) : null;
      const serverId = payload?.sub;

      await ordersApi.create({
        tableId,
        serverId,
        items: order.map((o) => ({
          menuItemId: o.menuItemId,
          quantity: o.quantity,
          modifiers: o.modifiers,
        })),
      });

      setOrder([]);
      Alert.alert('Fired!', `Order for Table ${tableNumber} sent to kitchen.`);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? 'Failed to fire order';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setFiring(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Tables</Text>
        </TouchableOpacity>
        <Text style={styles.tableTitle}>Table {tableNumber}</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search menu..."
        placeholderTextColor="#666"
        style={styles.searchInput}
      />

      {loading ? (
        <ActivityIndicator color="#D4AF37" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>MENU</Text>
          {filtered.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => addItem(item)}>
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemCategory}>{item.category} · {item.station}</Text>
              </View>
              <Text style={styles.menuItemPrice}>${Number(item.price).toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.orderBox}>
        <Text style={styles.orderTitle}>Order ({order.length} items) — ${subtotal.toFixed(2)}</Text>
        <ScrollView style={styles.orderList} nestedScrollEnabled>
          {order.length === 0 ? (
            <Text style={styles.emptyText}>Tap menu items to add</Text>
          ) : (
            order.map((item, i) => (
              <View key={i} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.quantity}× {item.name}</Text>
                  <Text style={styles.orderItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity onPress={() => updateQuantity(i, -1)} style={styles.qtyButton}>
                    <Text style={styles.qtyButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(i, 1)} style={styles.qtyButton}>
                    <Text style={styles.qtyButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(i)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <TouchableOpacity
        onPress={fireToKitchen}
        style={[styles.fireButton, (order.length === 0 || firing) && styles.fireButtonDisabled]}
        disabled={order.length === 0 || firing}
      >
        {firing
          ? <ActivityIndicator color="#0a0a0a" />
          : <Text style={styles.fireButtonText}>FIRE TO KITCHEN</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#D4AF37', fontSize: 16 },
  tableTitle: { color: '#D4AF37', fontSize: 22, fontWeight: '700' },
  error: { color: '#FF4444', marginBottom: 8, fontSize: 13 },
  searchInput: {
    backgroundColor: '#1a1a1a', color: '#FFF', padding: 12,
    borderRadius: 8, marginBottom: 12, fontSize: 15,
  },
  sectionLabel: { color: '#555', fontSize: 11, letterSpacing: 1.5, fontWeight: '600', marginBottom: 8 },
  menuList: { flex: 1, marginBottom: 8 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, marginBottom: 6,
  },
  menuItemInfo: { flex: 1 },
  menuItemName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  menuItemCategory: { color: '#777', fontSize: 12, marginTop: 2 },
  menuItemPrice: { color: '#D4AF37', fontWeight: '700', fontSize: 14 },
  orderBox: {
    backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8,
    marginBottom: 12, maxHeight: 200,
  },
  orderTitle: { color: '#FFF', fontWeight: '700', marginBottom: 8, fontSize: 14 },
  orderList: { flex: 1 },
  emptyText: { color: '#555', fontStyle: 'italic', fontSize: 13 },
  orderItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  orderItemInfo: { flex: 1 },
  orderItemName: { color: '#FFF', fontSize: 13 },
  orderItemPrice: { color: '#D4AF37', fontSize: 12, marginTop: 2 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyButton: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#2a2a2a',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  qtyText: { color: '#FFF', fontSize: 13, minWidth: 20, textAlign: 'center' },
  removeButton: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#8B0000',
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  removeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  fireButton: {
    backgroundColor: '#D4AF37', padding: 16, borderRadius: 8, alignItems: 'center',
  },
  fireButtonDisabled: { backgroundColor: '#4a4a2a', opacity: 0.5 },
  fireButtonText: { color: '#0a0a0a', fontWeight: '700', fontSize: 16, letterSpacing: 1 },
});
