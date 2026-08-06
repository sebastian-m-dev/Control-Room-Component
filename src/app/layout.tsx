import '@/styles/globals.scss';
import { Geist } from 'next/font/google';
import type { Metadata } from 'next';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Control Room · Monitor de Flota',
  description:
    'Monitor de vehículos en tiempo real conectado a la API pública de Traccar, con soporte de modo claro/oscuro y accesibilidad WCAG 2.1 AA.',
};

// Aplica el tema guardado antes del primer paint para evitar un flash incorrecto
const themeScript = `(function(){try{var raw=localStorage.getItem('control-room-theme');var theme=raw?JSON.parse(raw).state.theme:'dark';var el=document.documentElement;el.classList.toggle('dark',theme!=='light');el.style.colorScheme=theme==='light'?'light':'dark'}catch(e){document.documentElement.classList.add('dark')}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ReactQueryProvider>
          <ThemeProvider>
            <div className="app-shell">
              <main className="app-main">{children}</main>
            </div>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
