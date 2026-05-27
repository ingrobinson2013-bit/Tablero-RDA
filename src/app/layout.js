import { Geist } from 'next/font/google';
import './globals.css';
import { DataProvider } from '@/context/DataContext';
import Sidebar from '@/components/Sidebar';
import LiveStreamFooter from '@/components/LiveStreamFooter';
import RoleSwitcher from '@/components/RoleSwitcher';
import AuthGuard from '@/components/AuthGuard';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata = {
  title: 'NODIA OPS™ - Operational Control Center',
  description: 'High-density analytical platform designed for fiscal intelligence and margin optimization.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Geist:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body-md text-on-surface overflow-x-hidden bg-background">
        <div className="noise-overlay"></div>
        <DataProvider>
          
          <AuthGuard>
            {/* TopNavBar with Command Palette */}
            <header className="fixed top-0 left-0 w-full h-16 bg-surface/80 backdrop-blur-md z-40 border-b border-outline-variant flex justify-between items-center px-6">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-xl">dataset</span>
                  </div>
                  <h1 className="font-display-lg text-xl font-bold text-on-surface tracking-tighter">NODIA OPS<span className="text-primary">™</span></h1>
                </div>
                {/* Command Palette Bar */}
                <div className="hidden md:flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-full pl-3 pr-10 py-1.5 cursor-pointer hover:border-primary/50 transition-colors group">
                  <span className="material-symbols-outlined text-outline text-sm">search</span>
                  <span className="text-on-surface-variant text-sm">Paleta de Comandos...</span>
                  <span className="ml-auto flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant text-[10px] font-label-mono text-outline">⌘</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant text-[10px] font-label-mono text-outline">K</kbd>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Status Center */}
                <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-outline-variant">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-label-mono uppercase text-outline">Meta API</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      <span className="text-xs font-bold">Estable</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-label-mono uppercase text-outline">Supabase</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      <span className="text-xs font-bold">99.9%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-label-mono uppercase text-outline">Logística</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                      <span className="text-xs font-bold">Retrasado</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button className="p-2 hover:bg-surface-container-high rounded-full relative">
                    <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
                  </button>
                  <RoleSwitcher />
                  <img alt="User Avatar" className="w-8 h-8 rounded-full border border-outline-variant object-cover ring-2 ring-primary/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGql4lmzm_YFK1fqS7qHbzIm67A0mSieOtaz6P1iMB62ZoueKvi_Ks7BukjPqwe-d_dxxynS_ZhB2rJySdZ-Y5eTJggVVtiozeenDIZczskFBi8cMLK3EQtQJhCNX8p2kOubC83wiWZeg94CmNAQdk6CXOaHyCwEatjqUz5Z6xItXnrqaXOab0_z6fL5jobqFy9JAUbzmpPqtlkVyAGS-Sob7RWQQuJ8l_98P0wuTPL-uW0fl8YWbZ_bGZHtHAiQogJrP6xEs0jz-j" />
                </div>
              </div>
            </header>

            <div className="flex pt-16">
              <Sidebar />
              <main className="flex-1 ml-0 md:ml-64 p-6 space-y-8 pb-40 overflow-y-auto h-[calc(100vh-64px)]">
                {children}
              </main>
            </div>

            <LiveStreamFooter />
          </AuthGuard>

        </DataProvider>
      </body>
    </html>
  );
}
