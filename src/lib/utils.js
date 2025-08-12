import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

// Devuelve la URL con el BASE_URL de Vite si la app corre en subcarpeta.
export function withBase(path) {
	if (!path) return path;
	const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
	// Asegurar que base termine con '/'
	const baseClean = base.endsWith('/') ? base : `${base}/`;
	// Si path ya es absoluta http(s) o data:
	if (/^(data:|https?:)/i.test(path)) return path;
	// Normalizar path sin slash inicial
	const p = path.startsWith('/') ? path.slice(1) : path;
	return `${baseClean}${p}`.replace(/\/+/, '/');
}

// Resuelve URLs de imágenes locales servidas por Apache/PHP cuando se corre con Vite dev server.
// En dev, reescribe "/images/..." a "/php-images/..." para que pase por el proxy configurado en vite.config.js
// En prod, si la app está en subcarpeta, antepone BASE_URL a "/images/...".
// Mantiene intactas las data URLs y las http(s).
export function resolvePhpImageUrl(url) {
	if (!url || typeof url !== 'string') return url;
	if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;

	const normalized = url.startsWith('/') ? url : `/${url}`;
	// Solo reescribimos en modo desarrollo
	if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
		if (normalized.startsWith('/images/')) {
			return normalized.replace(/^\/images\//, '/php-images/');
		}
		return normalized;
	}
	// Producción: prefijar BASE_URL si la app está en subcarpeta
	if (normalized.startsWith('/images/')) {
		return withBase(normalized);
	}
	return normalized;
}
