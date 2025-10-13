import type { Metadata } from 'next';
import { Inter, Playfair_Display, Crimson_Text } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import StatusBar from '@/components/StatusBar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
});
const crimson = Crimson_Text({ 
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Slowpost',
  description: 'Connect meaningfully with your close friends and communities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable} ${crimson.variable}`}>
        <AuthProvider>
          <StatusBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
