import { getTenantInfo } from '@/lib/api-public';
import { BookingForm } from '@/components/BookingForm/BookingForm';

interface ReservePageProps {
  params: { slug: string };
}

export default async function ReservePage({ params }: ReservePageProps) {
  let tenantName = 'Restaurant';

  try {
    const tenant = await getTenantInfo(params.slug);
    tenantName = tenant.name;
  } catch {
    // Fallback to slug-based name
    tenantName = params.slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return (
    <main className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <BookingForm slug={params.slug} tenantName={tenantName} />
      </div>
    </main>
  );
}
