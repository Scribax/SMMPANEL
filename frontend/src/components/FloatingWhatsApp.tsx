"use client";

import { usePathname } from "next/navigation";

export default function FloatingWhatsApp() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex items-end group">
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% - 12px)",
          right: "-4px",
          width: "120px",
          height: "120px",
          pointerEvents: "none",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: "drop-shadow(0 -4px 12px rgba(99,102,241,0.5))",
          zIndex: 41,
        }}
        className="group-hover:[transform:translateY(-8px)_scale(1.08)]"
      >
        <img
          src="/mascot.png"
          alt="Mascota de FollowArg"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      <a
        href="https://wa.me/5492604221790?text=Hola%20FollowArg!%20Necesito%20ayuda%20con..."
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 sm:gap-3 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-400 to-lime-400 pl-4 pr-4 py-2 sm:py-2.5 shadow-lg shadow-emerald-500/40 text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
      >
        <span className="sr-only">Escribinos por WhatsApp</span>
        <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className="w-4 h-4 sm:w-4.5 sm:h-4.5"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M128 24a104 104 0 0 0-89.6 155.26L24.25 224a8 8 0 0 0 9.79 11l46.29-13.2A104 104 0 1 0 128 24Zm0 192a88 88 0 0 1-44.38-11.82a8 8 0 0 0-3.87-1L45 217.28l11.14-31.42a8 8 0 0 0-.86-7.38A88 88 0 1 1 128 216Zm45.86-62.37c-6.15-3.46-14.54-7.59-22.54-4.69c-5.88 2.15-9.61 10.48-13.44 15c-1.99 2.37-4.8 2.66-7.62 1.51c-22.95-7.88-40.61-26.53-48.5-49.38c-1.12-3.03.06-5.3 2.06-6.94c3.7-3 8.21-8.21 9.24-13.34c1-5-1.47-10.81-3.49-15.31c-2.57-5.81-5.43-14.09-11.51-17.22c-5.35-2.74-12.37-.12-17.2 3.46c-11.79 8.43-13.86 24.31-8.66 37c13.34 32.44 37.12 56.41 67.87 69.66c8.29 3.58 16.59 6.8 25.76 7.17c10.19.41 20.93-3.33 28.07-10.66c4.43-4.49 10.49-11.2 9.63-17.97c-.83-6.54-7.61-9.63-12.57-12.09Z"
            />
          </svg>
        </span>
        <span className="hidden md:block pr-1">WhatsApp soporte</span>
      </a>
    </div>
  );
}
