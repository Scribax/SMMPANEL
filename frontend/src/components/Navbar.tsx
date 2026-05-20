'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X, User, LogOut, LayoutDashboard, ShieldCheck, Wallet } from 'lucide-react';
import { getStoredUser, clearAuth, isAuthenticated } from '@/lib/auth';
import { User as UserType } from '@/types';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/order', label: 'Pedir ahora' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setDropdownOpen(false);
    router.push('/');
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-dark-300/90 backdrop-blur-xl border-b border-white/[0.06] shadow-xl' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">FollowArg</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-200',
                  pathname === link.href ? 'text-primary-400' : 'text-slate-400 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 glass-card px-3 py-1.5 text-xs font-semibold text-green-400 border-green-500/20 hover:border-green-500/40 transition-all"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  ${parseFloat(String(user.balance ?? 0)).toFixed(2)}
                </Link>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 glass-card px-3 py-2 hover:border-primary-500/30 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300">{user.name.split(' ')[0]}</span>
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 glass-card border-white/[0.1] shadow-xl overflow-hidden"
                    >
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" /> Mi Panel
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-primary-400 hover:text-primary-300 hover:bg-white/[0.05] transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" /> Panel Admin
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.05] transition-colors border-t border-white/[0.06]"
                      >
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-2 px-4">
                  Ingresar
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
                  Empezar
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/[0.06] bg-dark-300/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block py-2.5 px-4 rounded-xl text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 py-2.5 px-4 text-sm text-slate-300 hover:text-white"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Mi Panel
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 py-2.5 px-4 text-sm text-red-400 w-full"
                    >
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="block btn-secondary text-sm text-center"
                    >
                      Ingresar
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="block btn-primary text-sm text-center"
                    >
                      Empezar
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
