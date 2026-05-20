import Link from 'next/link';
import { Zap, Instagram, Twitter, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-dark-300/50 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">FollowArg</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              La plataforma más rápida y confiable para crecer en redes sociales. Resultados reales, entrega garantizada.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Servicios</h4>
            <ul className="space-y-2.5">
              {['Seguidores Instagram', 'Likes Instagram', 'Vistas Instagram', 'Seguidores TikTok', 'Vistas TikTok', 'Vistas YouTube'].map((s) => (
                <li key={s}>
                  <Link href="/order" className="text-slate-400 hover:text-white text-sm transition-colors">
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Empresa</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Nosotros', href: '#' },
                { label: 'Hacer pedido', href: '/order' },
                { label: 'Iniciar sesión', href: '/login' },
                { label: 'Registrarse', href: '/register' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-400 hover:text-white text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} FollowArg. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">Política de privacidad</Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">Términos de uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
