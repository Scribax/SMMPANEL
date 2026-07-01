"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { getStoredUser, clearAuth, isAuthenticated } from "@/lib/auth";
import { User as UserType } from "@/types";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/promociones", label: "PROMOCIONES" },
  { href: "/precios", label: "Precios" },
  { href: "/revendedores", label: "Revendedores" },
  { href: "/order", label: "Pedir ahora" },
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
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
  };

  const closeMobileMenu = () => setIsOpen(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-dark-300/90 backdrop-blur-xl border-b border-white/[0.06] shadow-xl"
          : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group min-w-0">
            <Image
              src="/logo.jpeg"
              alt="FollowArg"
              width={32}
              height={32}
              className="rounded-lg shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow shrink-0 sm:w-9 sm:h-9"
            />
            <span className="text-lg sm:text-xl font-bold gradient-text truncate">
              FollowArg
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  pathname === link.href
                    ? "text-primary-400"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative flex items-center gap-2">
                {/* Balance Badge - Más grande y visible */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 glass-card px-4 py-2.5 text-sm font-bold text-green-400 border-green-500/30 hover:border-green-500/60 hover:bg-green-500/10 transition-all shadow-lg shadow-green-500/10"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    ${parseFloat(String(user.balance ?? 0)).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </Link>

                {/* Profile Button - Más grande */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 glass-card px-4 py-2.5 hover:border-primary-500/40 hover:bg-primary-500/10 transition-all shadow-lg shadow-primary-500/10"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary-500/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white block">
                      {user.name.split(" ")[0]}
                    </span>
                    {user.role === "admin" && (
                      <span className="text-[10px] text-primary-400 font-semibold uppercase tracking-wide">Admin</span>
                    )}
                  </div>
                  <svg 
                    className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 glass-card border-white/[0.1] shadow-xl overflow-hidden z-50"
                    >
                      {/* Header del menú con info del usuario */}
                      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-primary-400" />
                          </div>
                          Mi Panel
                        </Link>
                        <Link
                          href="/order"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-green-400" />
                          </div>
                          Nuevo Pedido
                        </Link>
                        {user.role === "admin" && (
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-400 hover:text-primary-300 hover:bg-white/[0.05] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4 text-primary-400" />
                            </div>
                            Panel Admin
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-white/[0.06] py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                          Cerrar sesión
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-2 px-4">
                  Ingresar
                </Link>
                <Link
                  href="/register"
                  className="btn-primary text-sm py-2 px-4"
                >
                  Empezar
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors p-2 -mr-2"
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
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/[0.06] bg-dark-300/95 backdrop-blur-xl max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="px-4 py-4 space-y-2 pb-[env(safe-area-inset-bottom)]">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "block py-2.5 px-4 rounded-xl text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary-500/10 text-primary-400"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                {user ? (
                  <>
                    <div className="glass-card p-3 border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 py-3 px-4 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-white/[0.04]"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Mi Panel
                    </Link>
                    <Link
                      href="/order"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 py-3 px-4 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-white/[0.04]"
                    >
                      <Wallet className="w-4 h-4" /> Nuevo Pedido
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 py-3 px-4 text-sm text-primary-400 hover:text-primary-300 rounded-xl hover:bg-white/[0.04]"
                      >
                        <ShieldCheck className="w-4 h-4" /> Panel Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 py-3 px-4 text-sm text-red-400 w-full rounded-xl hover:bg-red-500/10"
                    >
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      className="block btn-secondary text-sm text-center"
                    >
                      Ingresar
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeMobileMenu}
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
