import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import TableListScreen from '../screens/TableListScreen';
import TableOrderScreen from '../screens/TableOrderScreen';
import KitchenDisplayScreen from '../screens/KitchenDisplayScreen';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  TableOrder: { tableId: string; tableNumber: number };
  KDS: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AuthUser {
  id: string;
  firstName: string;
  role: string;
}

function MainScreen({ user, onLogout, onSelectTable }: {
  user: AuthUser;
  onLogout: () => void;
  onSelectTable: (table: any) => void;
}) {
  const isKitchenRole = ['HEAD_CHEF', 'MANAGER', 'OWNER'].includes(user.role);

  return (
    <View style={styles.mainContainer}>
      <View style={styles.mainHeader}>
        <Text style={styles.welcome}>Hi, {user.firstName}</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {isKitchenRole && (
        <TouchableOpacity style={styles.kdsButton} onPress={() => onSelectTable('kds')}>
          <Text style={styles.kdsButtonText}>🍳 Kitchen Display</Text>
        </TouchableOpacity>
      )}

      <TableListScreen onSelectTable={onSelectTable} />
    </View>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [showKds, setShowKds] = useState(false);

  if (!user) {
    return (
      <NavigationContainer>
        <LoginScreen onLogin={(u) => setUser(u)} />
      </NavigationContainer>
    );
  }

  if (showKds) {
    return (
      <NavigationContainer>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.backBar} onPress={() => setShowKds(false)}>
            <Text style={styles.backBarText}>← Back</Text>
          </TouchableOpacity>
          <KitchenDisplayScreen />
        </View>
      </NavigationContainer>
    );
  }

  if (selectedTable) {
    return (
      <NavigationContainer>
        <TableOrderScreen
          tableId={selectedTable.id}
          tableNumber={selectedTable.number}
          onBack={() => setSelectedTable(null)}
        />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainScreen
        user={user}
        onLogout={() => setUser(null)}
        onSelectTable={(table) => {
          if (table === 'kds') setShowKds(true);
          else setSelectedTable(table);
        }}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  mainHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  welcome: { color: '#D4AF37', fontSize: 20, fontWeight: '700' },
  logoutText: { color: '#666', fontSize: 14 },
  kdsButton: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#D4AF37',
  },
  kdsButtonText: { color: '#D4AF37', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  backBar: {
    backgroundColor: '#1a1a1a', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  backBarText: { color: '#D4AF37', fontSize: 16 },
});
