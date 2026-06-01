import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration/ServiceWorkerRegistration';
import { InstallPrompt } from '@/components/InstallPrompt/InstallPrompt';

export const metadata: Metadata = {
  title: 'RestaurantOS',
  description: 'All-in-one restaurant operating system for fine dining',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary text-white font-ui antialiased">
        <Providers>
          {children}
        </Providers>
        <ServiceWorkerRegistration />
        <InstallPrompt />
      </body>
    </html>
  );
}