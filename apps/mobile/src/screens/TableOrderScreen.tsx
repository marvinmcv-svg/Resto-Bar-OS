import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  seatNumber?: number;
  modifiers: string[];
}

export default function TableOrderScreen({ tableId }: { tableId: string }) {
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');

  const addItem = (item: unknown) => {
    const typedItem = item as { id: string; name: string };
    setOrder((prev) => [
      ...prev,
      { menuItemId: typedItem.id, name: typedItem.name, quantity: 1, modifiers: [] },
    ]);
  };

  const removeItem = (index: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setOrder((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );
  };

  const fireToKitchen = () => {
    if (order.length === 0) return;
    // TODO: integrate with orders API
    console.log('Firing order to kitchen:', { tableId, items: order });
    setOrder([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.tableTitle}>Table {tableId}</Text>

      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search menu..."
        placeholderTextColor="#666666"
        style={styles.searchInput}
      />

      {/* Order Summary */}
      <View style={styles.orderBox}>
        <Text style={styles.orderTitle}>Order ({order.length} items)</Text>
        <ScrollView style={styles.orderList}>
          {order.length === 0 ? (
            <Text style={styles.emptyText}>No items yet</Text>
          ) : (
            order.map((item, i) => (
              <View key={i} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>
                    {item.quantity}x {item.name}
                  </Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(i, -1)}
                    style={styles.qtyButton}
                  >
                    <Text style={styles.qtyButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(i, 1)}
                    style={styles.qtyButton}
                  >
                    <Text style={styles.qtyButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeItem(i)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Send Button */}
      <TouchableOpacity
        onPress={fireToKitchen}
        style={[styles.fireButton, order.length === 0 && styles.fireButtonDisabled]}
        disabled={order.length === 0}
      >
        <Text style={styles.fireButtonText}>FIRE TO KITCHEN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  tableTitle: {
    color: '#D4AF37',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  orderBox: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flex: 1,
  },
  orderTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 16,
  },
  orderList: {
    flex: 1,
  },
  emptyText: {
    color: '#666666',
    fontStyle: 'italic',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 14,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  fireButton: {
    backgroundColor: '#D4AF37',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fireButtonDisabled: {
    backgroundColor: '#4a4a2a',
    opacity: 0.5,
  },
  fireButtonText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 16,
  },
});
