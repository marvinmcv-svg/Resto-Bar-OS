'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '../../../lib/api';

interface Stats {
  todayReservations: number;
  activeOrders: number;
  availableTables: number;
  occupiedTables: number;
  lowStockAlerts: number;
  unreadNotifications: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`bg-gray-900 rounded-xl p-6 border ${color}`}>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ firstName: string; role: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ firstName: payload.firstName ?? 'User', role: payload.role });
    } catch {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [tablesRes, ordersRes, reservationsRes, notifRes] = await Promise.allSettled([
          apiClient.get('/floor/tables'),
          apiClient.get('/orders?status=FIRED,IN_PROGRESS,PENDING'),
          apiClient.get('/reservations?date=today'),
          apiClient.get('/notifications?read=false&limit=10'),
        ]);

        const tables = tablesRes.status === 'fulfilled' ? tablesRes.value.data : [];
        const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data : [];
        const reservations = reservationsRes.status === 'fulfilled' ? reservationsRes.value.data : [];
        const notifs = notifRes.status === 'fulfilled' ? notifRes.value.data : [];

        setNotifications(Array.isArray(notifs) ? notifs : []);
        setStats({
          todayReservations: Array.isArray(reservations) ? reservations.length : 0,
          activeOrders: Array.isArray(orders) ? orders.length : 0,
          availableTables: Array.isArray(tables) ? tables.filter((t: any) => t.status === 'AVAILABLE').length : 0,
          occupiedTables: Array.isArray(tables) ? tables.filter((t: any) => t.status !== 'AVAILABLE').length : 0,
          lowStockAlerts: Array.isArray(notifs) ? notifs.filter((n: any) => n.type === 'LOW_STOCK').length : 0,
          unreadNotifications: Array.isArray(notifs) ? notifs.length : 0,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-amber-400">RestaurantOS</h1>
          <nav className="hidden md:flex gap-6 text-sm text-gray-400">
            <a href="./floor" className="hover:text-white">Floor</a>
            <a href="./reservations" className="hover:text-white">Reservations</a>
            <a href="../guests" className="hover:text-white">Guests</a>
          </nav>
        </div>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Logout</button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">
          Good {getGreeting()}{user ? ` — today's overview` : ''}
        </h2>

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <StatCard label="Today's Reservations" value={stats?.todayReservations ?? 0} color="border-amber-400/30" />
              <StatCard label="Active Orders" value={stats?.activeOrders ?? 0} color="border-blue-400/30" />
              <StatCard label="Available Tables" value={stats?.availableTables ?? 0} color="border-green-400/30" />
              <StatCard label="Occupied Tables" value={stats?.occupiedTables ?? 0} color="border-purple-400/30" />
              <StatCard label="Low Stock Alerts" value={stats?.lowStockAlerts ?? 0} color={stats?.lowStockAlerts ? 'border-red-400' : 'border-gray-700'} />
              <StatCard label="Unread Notifications" value={stats?.unreadNotifications ?? 0} color="border-gray-700" />
            </div>

            {notifications.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 text-gray-300">Recent Alerts</h3>
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="bg-gray-900 rounded-lg px-4 py-3 border border-gray-800 flex items-start gap-3">
                      <span className="text-lg">{getIcon(n.type)}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{n.title}</p>
                        <p className="text-xs text-gray-400">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getIcon(type: string) {
  const map: Record<string, string> = {
    LOW_STOCK: '⚠️',
    RESERVATION_NEW: '📅',
    RESERVATION_REMINDER: '🔔',
    NO_SHOW: '❌',
    CAMPAIGN_SENT: '📧',
    GUEST_BIRTHDAY: '🎂',
  };
  return map[type] ?? '📣';
}
