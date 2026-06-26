'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/auth';

function safeRedirect(value: string | null, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirect(params.get('redirect'));
  const registerHref = `/register?redirect=${encodeURIComponent(redirectTo)}`;
  const isContinuingOrder = redirectTo.startsWith('/order');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Completá todos los campos'); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setAuth(res.data.token, res.data.user);
      toast.success('¡Bienvenido de vuelta!');
      router.push(res.data.user.role === 'admin' ? '/admin' : redirectTo);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-300 flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="hidden sm:block absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-500/8 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-5 sm:mb-6">
            <Image src="/logo.jpeg" alt="FollowArg" width={40} height={40} className="rounded-xl shadow-lg shadow-primary-500/30" />
            <span className="text-xl sm:text-2xl font-bold gradient-text">FollowArg</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {isContinuingOrder ? 'Ingresá para continuar' : 'Bienvenido de vuelta'}
          </h1>
          <p className="text-slate-400 mt-2">
            {isContinuingOrder
              ? 'Después volvés directo al pedido que estabas armando.'
              : 'Iniciá sesión en tu cuenta'}
          </p>
        </div>

        <div className="glass-card p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="input-field pl-10" autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading
                ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Iniciando...</span>
                : <><span>Iniciar sesión</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            ¿No tenés cuenta?{' '}
            <Link href={registerHref} className="text-primary-400 hover:text-primary-300 font-medium">Creá una gratis</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
