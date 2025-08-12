import React from 'react';
import { FaTiktok, FaFacebook, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { Globe } from 'lucide-react';

const socialLinks = [
  { href: "https://www.tiktok.com/@ite_educabol", icon: FaTiktok, label: "TikTok" },
  { href: "https://www.facebook.com/ite.educabol", icon: FaFacebook, label: "Facebook" },
  { href: "https://www.youtube.com/@ite_educabol", icon: FaYoutube, label: "YouTube" },
  { href: "https://whatsapp.com/channel/0029VaAu3lwJJhzX5iSJBg44", icon: FaWhatsapp, label: "WhatsApp" },
  { href: "https://ite.com.bo", icon: Globe, label: "Website" },
];

function Footer() {
  return (
    <footer className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center space-x-3 mb-4">
              {/*
                Nota: Coloca el archivo del logo en public/images/tably-logo.png
                En producción, Vite copiará public/ a dist/, por lo que quedará en dist/images/tably-logo.png
              */}
              <img
                src="/images/tably-logo.png"
                alt="Tably Logo"
                className="w-10 h-10"
                loading="lazy"
                onError={({ currentTarget }) => {
                  currentTarget.onerror = null; // evita loop
                  currentTarget.src = "https://horizons-cdn.hostinger.com/0e118160-db80-4e31-90c2-9870798c6368/8445b3502be614bbe6109510774d6806.png";
                }}
              />
              <span className="text-xl font-bold text-slate-800 dark:text-white">Tably</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Practica, compite y conviértete en un maestro de las tablas de multiplicar.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center">
            {/*
              Nota: Coloca la foto del autor en public/images/autor-david-flores.png
              En build quedará disponible como dist/images/autor-david-flores.png
            */}
            <img
              src="/images/david.png"
              alt="Autor David Flores"
              className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-[rgb(38,186,165)]"
              loading="lazy"
              onError={({ currentTarget }) => {
                currentTarget.onerror = null; // evita loop
                currentTarget.src = "https://horizons-cdn.hostinger.com/0e118160-db80-4e31-90c2-9870798c6368/e9d40a1b8d23e5903b12574d66223297.png";
              }}
            />
            <p className="font-bold text-slate-800 dark:text-white">David Flores</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic text-center max-w-xs">
              "Apasionado por la tecnología, la educación y la programación."
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <p className="font-semibold text-slate-800 dark:text-white mb-4">Síguenos</p>
            <div className="flex items-center space-x-4">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-[rgb(38,186,165)] dark:text-slate-400 dark:hover:text-[rgb(38,186,165)] transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>

        </div>
        <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} Tably por ITE Educabol. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;