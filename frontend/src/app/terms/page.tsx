import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = { title: 'Términos de Uso — BoostIns' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black text-white mb-2">Términos de <span className="gradient-text">Uso</span></h1>
        <p className="text-slate-500 text-sm mb-12">Última actualización: mayo 2026</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-xl mb-3">1. Aceptación de los términos</h2>
            <p>Al registrarte y usar BoostIns (followarg.com), aceptás estos Términos de Uso en su totalidad. Si no estás de acuerdo, no podés utilizar el servicio.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">2. Descripción del servicio</h2>
            <p>BoostIns es una plataforma de marketing en redes sociales (SMM Panel) que permite a usuarios comprar seguidores, likes, vistas y otros servicios de crecimiento para redes sociales como Instagram, TikTok y YouTube.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">3. Elegibilidad</h2>
            <p>Para usar BoostIns debés:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Tener al menos 18 años de edad.</li>
              <li>Proporcionar información verídica al registrarte.</li>
              <li>No usar el servicio para actividades ilegales o fraudulentas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">4. Pagos y saldo</h2>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Los pagos se procesan en pesos argentinos (ARS) a través de MercadoPago.</li>
              <li>El saldo acreditado en tu cuenta no es reembolsable salvo casos excepcionales evaluados por el equipo de soporte.</li>
              <li>Los precios pueden cambiar sin previo aviso. Los pedidos ya realizados no se ven afectados.</li>
              <li>No emitimos factura electrónica. Las recargas son crédito interno de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">5. Entrega de servicios</h2>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Los tiempos de entrega son estimativos. No garantizamos tiempos exactos.</li>
              <li>Para recibir seguidores, tu cuenta debe estar en <strong className="text-slate-300">modo público</strong> durante la entrega.</li>
              <li>No nos hacemos responsables si la cuenta es privada, eliminada o bloqueada durante el proceso.</li>
              <li>Algunos servicios pueden experimentar caída natural de seguidores/likes con el tiempo, lo cual está fuera de nuestro control.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">6. Política de reembolsos</h2>
            <p>No ofrecemos reembolsos una vez iniciado el pedido. En los siguientes casos podemos acreditar saldo:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>El pedido nunca comenzó tras 48 horas de espera.</li>
              <li>El pedido quedó marcado como fallido por error del proveedor.</li>
            </ul>
            <p className="mt-3">Para solicitar soporte enviá un correo a <span className="text-primary-400">soporte@followarg.com</span> con el número de pedido.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">7. Uso prohibido</h2>
            <p>Queda prohibido:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Usar el servicio para actividades que violen los términos de uso de Instagram, TikTok, YouTube u otras plataformas.</li>
              <li>Intentar manipular, hackear o acceder sin autorización a nuestra plataforma.</li>
              <li>Revender nuestros servicios sin autorización previa por escrito.</li>
              <li>Realizar pagos fraudulentos o contracargos injustificados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">8. Limitación de responsabilidad</h2>
            <p>BoostIns no se responsabiliza por:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Cambios en los algoritmos de redes sociales que afecten los resultados.</li>
              <li>Suspensión o penalización de cuentas por parte de las plataformas.</li>
              <li>Daños indirectos, incidentales o pérdida de ingresos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">9. Modificaciones</h2>
            <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios se publicarán en esta página con nueva fecha. El uso continuado del servicio implica la aceptación de los nuevos términos.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">10. Legislación aplicable</h2>
            <p>Estos términos se rigen por las leyes de la República Argentina. Ante cualquier disputa, las partes se someten a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">11. Contacto</h2>
            <p>Consultas: <span className="text-primary-400">soporte@followarg.com</span></p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <Link href="/privacy" className="text-primary-400 hover:text-primary-300 text-sm transition-colors">
            → Ver Política de Privacidad
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
