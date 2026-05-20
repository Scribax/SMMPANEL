import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = { title: 'Política de Privacidad — FollowArg' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-black text-white mb-2">Política de <span className="gradient-text">Privacidad</span></h1>
        <p className="text-slate-500 text-sm mb-12">Última actualización: mayo 2026</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-xl mb-3">1. Información que recopilamos</h2>
            <p>Al usar FollowArg recopilamos la siguiente información:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li><strong className="text-slate-300">Datos de registro:</strong> nombre, dirección de correo electrónico y contraseña cifrada.</li>
              <li><strong className="text-slate-300">Datos de pedidos:</strong> usuario o enlace de red social, cantidad solicitada y correo de seguimiento.</li>
              <li><strong className="text-slate-300">Datos de pago:</strong> los pagos son procesados por MercadoPago. No almacenamos datos de tarjetas de crédito/débito.</li>
              <li><strong className="text-slate-300">Datos de uso:</strong> dirección IP, tipo de navegador y páginas visitadas, únicamente con fines de seguridad y mejora del servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">2. Cómo usamos tu información</h2>
            <p>Usamos tus datos para:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Procesar y entregar los pedidos que realizás.</li>
              <li>Gestionar tu cuenta y saldo de crédito.</li>
              <li>Enviarte confirmaciones de pedidos y actualizaciones por email.</li>
              <li>Prevenir fraudes y garantizar la seguridad de la plataforma.</li>
              <li>Mejorar nuestros servicios en base al comportamiento de uso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">3. Compartir información con terceros</h2>
            <p>No vendemos ni alquilamos tus datos personales. Compartimos información solo en los siguientes casos:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li><strong className="text-slate-300">Proveedores de servicio:</strong> el enlace/usuario de tu pedido se envía al proveedor SMM para ejecutar el servicio.</li>
              <li><strong className="text-slate-300">Procesador de pagos:</strong> MercadoPago recibe los datos necesarios para procesar el cobro.</li>
              <li><strong className="text-slate-300">Obligaciones legales:</strong> cuando la ley argentina lo requiera.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">4. Seguridad de tus datos</h2>
            <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información: contraseñas cifradas con bcrypt, comunicaciones cifradas con SSL/TLS, y claves de API almacenadas de forma cifrada. Sin embargo, ningún sistema es 100% seguro.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">5. Retención de datos</h2>
            <p>Conservamos tus datos mientras tu cuenta esté activa. Podés solicitar la eliminación de tu cuenta enviando un correo a <span className="text-primary-400">soporte@followarg.com</span>. Los registros de transacciones pueden conservarse por requerimientos fiscales/legales hasta 5 años.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">6. Tus derechos</h2>
            <p>Tenés derecho a:</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-slate-400">
              <li>Acceder a los datos personales que tenemos sobre vos.</li>
              <li>Solicitar la corrección de datos incorrectos.</li>
              <li>Solicitar la eliminación de tu cuenta y datos.</li>
              <li>Oponerte al tratamiento de tus datos con fines comerciales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">7. Cookies</h2>
            <p>Usamos cookies técnicas esenciales para mantener tu sesión iniciada. No usamos cookies de seguimiento de terceros ni publicidad.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-xl mb-3">8. Contacto</h2>
            <p>Para consultas sobre privacidad contactanos en <span className="text-primary-400">soporte@followarg.com</span>.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <Link href="/terms" className="text-primary-400 hover:text-primary-300 text-sm transition-colors">
            → Ver Términos de Uso
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
