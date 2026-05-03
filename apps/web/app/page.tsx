export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="font-display text-6xl text-accent-gold mb-4">RestaurantOS</h1>
      <p className="text-text-secondary text-xl mb-8">Fine Dining Operating System</p>
      <div className="text-text-muted">
        <p>API: <span className="text-accent-gold">http://localhost:3001/api/docs</span></p>
        <p>Status: <span className="text-green-500">Ready</span></p>
      </div>
    </main>
  );
}