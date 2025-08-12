import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Candidatos de imagen (local primero, luego CDN) para mayor robustez
const tablyLogoCandidates = [
    '/images/tably-logo.png',
    'https://horizons-cdn.hostinger.com/0e118160-db80-4e31-90c2-9870798c6368/8445b3502be614bbe6109510774d6806.png',
    'https://horizons-cdn.hostinger.com/0e118160-db80-4e31-90c2-9870798c6368/99b21421cb1651557b9a723632e1935c.png'
];
const authorImgCandidates = [
    '/images/david.png',
    'https://horizons-cdn.hostinger.com/0e118160-db80-4e31-90c2-9870798c6368/ff0af9dfc084c6c16eab860a4b57f0e3.png'
];

const socialLinks = [
  { href: "https://www.tiktok.com/@ite_educabol", label: "TikTok" },
  { href: "https://www.facebook.com/ite.educabol", label: "Facebook" },
  { href: "https://www.youtube.com/@ite_educabol", label: "YouTube" },
  { href: "https://whatsapp.com/channel/0029VaAu3lwJJhzX5iSJBg44", label: "WhatsApp" },
  { href: "https://ite.com.bo", label: "Website" },
];

const toBase64 = async (url) => {
    const fallbackImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    if (!url || typeof url !== 'string') {
       return fallbackImage;
    }
    if (url.startsWith('data:image')) {
        return url;
    }
    try {
        // Asegurar mismo origen cuando es ruta relativa y respetar BASE_URL en subcarpetas
        let absoluteUrl;
        if (/^https?:/i.test(url)) {
            absoluteUrl = url;
        } else if (url.startsWith('/')) {
            const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
            const baseClean = base.endsWith('/') ? base : `${base}/`;
            absoluteUrl = `${window.location.origin}${baseClean}${url.slice(1)}`;
        } else {
            absoluteUrl = `${window.location.origin}/${url}`;
        }
        const response = await fetch(absoluteUrl, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Fetch failed for ${absoluteUrl} with status ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(error);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Error converting URL to base64: ${url}`, error);
        return fallbackImage;
    }
};

const toBase64Any = async (urls) => {
    if (!Array.isArray(urls)) return toBase64(urls);
    for (const u of urls) {
        const b64 = await toBase64(u);
        if (b64 && !b64.endsWith('CII=')) { // no usar el fallback 1x1 si ya logramos una imagen válida
            return b64;
        }
    }
    return toBase64(urls[0]);
};

// Detección de formato desde data URL para jsPDF
const imageFormatFromDataUrl = (dataUrl) => {
    try {
        const m = /^data:image\/(png|jpeg|jpg|webp)/i.exec(dataUrl || '');
        const ext = (m && m[1] || '').toLowerCase();
        if (ext === 'png') return 'PNG';
        if (ext === 'jpeg' || ext === 'jpg') return 'JPEG';
        return 'JPEG';
    } catch { return 'JPEG'; }
};

// Agregar imagen de forma segura sin romper el render si falla
const safeAddImage = (doc, dataUrl, x, y, w, h) => {
    try {
        const fmt = imageFormatFromDataUrl(dataUrl);
        doc.addImage(dataUrl, fmt, x, y, w, h);
    } catch (e) {
        console.warn('No se pudo agregar imagen al PDF:', e);
    }
};

export const generateProfilePdf = async (user, userTests, rankings) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    const primary = [38, 186, 165];
    const secondary = [55, 95, 122];
    const text = [51, 65, 85];
    const muted = [100, 116, 139];

    // Resolver avatar con proxy en dev si viene de XAMPP
    const isDev = Boolean(window?.location?.port);
    let avatarUrl = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`;
    if (isDev && avatarUrl.includes('/tably4.0/public/images/')) {
        avatarUrl = avatarUrl.replace('/tably4.0/public/images', '/php-images');
    }

    const [logoB64, authorB64, avatarB64] = await Promise.all([
        toBase64Any(tablyLogoCandidates),
        toBase64Any(authorImgCandidates),
        toBase64(avatarUrl),
    ]);

    // Utilidades de datos
    const norm = (t) => {
        const date = t.date || t.created_at || t.createdAt || t.timestamp || null;
        const correct = t.correct ?? t.correct_answers ?? t.right ?? null;
        const total = t.total ?? t.total_questions ?? t.questions ?? null;
        const score = typeof t.score === 'number' ? t.score : (typeof correct === 'number' && typeof total === 'number' && total > 0 ? Math.round((correct / total) * 100) : null);
        const time = t.total_time ?? t.totalTime ?? t.total_time_seconds ?? t.time ?? null;
        const mode = t.config?.mode || t.mode || null;
        const tables = t.config?.tables || t.tables || [];
        return { date, correct, total, score, time, mode, tables };
    };

    const normalized = Array.isArray(userTests) ? userTests.map(norm).filter(Boolean) : [];
    const testsSorted = normalized
        .map(r => ({
            ...r,
            _dateObj: r.date ? new Date(r.date) : null,
        }))
        .sort((a, b) => (b._dateObj?.getTime?.() || 0) - (a._dateObj?.getTime?.() || 0));

    const stats = (() => {
        const totalTests = testsSorted.length;
        const scores = testsSorted.map(t => (typeof t.score === 'number' ? t.score : null)).filter(v => v !== null);
        const times = testsSorted.map(t => (typeof t.time === 'number' ? t.time : null)).filter(v => v !== null);
        const bestScore = scores.length ? Math.max(...scores) : null;
        const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const bestTime = times.length ? Math.min(...times) : null;
        const avgTime = times.length ? (times.reduce((a, b) => a + b, 0) / times.length) : null;
        const tableFreq = new Map();
        testsSorted.forEach(t => (t.tables || []).forEach(x => tableFreq.set(x, (tableFreq.get(x) || 0) + 1)));
        const topTables = [...tableFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`);
        return { totalTests, bestScore, avgScore, bestTime, avgTime, topTables };
    })();

    const addFooter = () => {
        const count = doc.internal.getNumberOfPages();
        for (let i = 1; i <= count; i++) {
            doc.setPage(i);
            doc.setDrawColor(primary[0], primary[1], primary[2]);
            doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30);

            doc.saveGraphicsState();
            doc.circle(20, pageHeight - 20, 5);
            doc.clip();
            safeAddImage(doc, authorB64, 15, pageHeight - 25, 10, 10);
            doc.restoreGraphicsState();

            doc.setFontSize(9);
            doc.setTextColor(text[0], text[1], text[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('David Flores', 28, pageHeight - 22);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(muted[0], muted[1], muted[2]);
            doc.text('Creador de Tably', 28, pageHeight - 17);

            doc.setFontSize(8);
            doc.setTextColor(secondary[0], secondary[1], secondary[2]);
            doc.text('Síguenos en:', pageWidth - 15, pageHeight - 22, { align: 'right' });
            doc.text(socialLinks.map(s => s.label).join(' • '), pageWidth - 15, pageHeight - 15, { align: 'right' });

            doc.setFontSize(8);
            doc.text(`Página ${i} de ${count}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
    };

    // Portada
    const cover = () => {
        // Marca
        safeAddImage(doc, logoB64, 18, 18, 18, 18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(secondary[0], secondary[1], secondary[2]);
        doc.text('Reporte de Perfil', 45, 30);

        // Avatar circular
        doc.saveGraphicsState();
        doc.circle(pageWidth / 2, 70, 22);
        doc.clip();
        safeAddImage(doc, avatarB64, pageWidth / 2 - 25, 45, 50, 50);
        doc.restoreGraphicsState();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(text[0], text[1], text[2]);
        doc.text(user.name, pageWidth / 2, 98, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        if (user.phone) doc.text(String(user.phone), pageWidth / 2, 105, { align: 'center' });

        // Banda inferior con ranking
        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(25, 120, pageWidth - 50, 20, 3, 3, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(secondary[0], secondary[1], secondary[2]);
        doc.text('Ranking Global', 30, 133);
        doc.setFontSize(16);
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(rankings?.position ? `#${rankings.position}` : 'N/A', 90, 133);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(`de ${rankings?.total || 0} participantes`, 110, 133);

        // Frase
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text('“Practica, compite y mejora cada día en Tably.”', pageWidth / 2, 160, { align: 'center' });
    };

    // Página de resumen
    const summary = () => {
        doc.addPage();
        // Encabezado
        safeAddImage(doc, logoB64, 15, 10, 12, 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(secondary[0], secondary[1], secondary[2]);
        doc.text('Resumen', pageWidth - 15, 16, { align: 'right' });
        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.line(15, 22, pageWidth - 15, 22);

        // KPI cards
        const kpiY = 32;
        const cardW = (pageWidth - 15 - 15 - 12) / 2; // 2 por fila, gap 12
        const cards = [
            { title: 'Participaciones', value: String(stats.totalTests || 0) },
            { title: 'Mejor Puntaje', value: stats.bestScore != null ? `${stats.bestScore}%` : '—' },
            { title: 'Puntaje Promedio', value: stats.avgScore != null ? `${stats.avgScore}%` : '—' },
            { title: 'Mejor Tiempo', value: stats.bestTime != null ? `${stats.bestTime.toFixed(1)}s` : '—' },
            { title: 'Tiempo Promedio', value: stats.avgTime != null ? `${stats.avgTime.toFixed(1)}s` : '—' },
            { title: 'Top Tablas', value: stats.topTables.length ? stats.topTables.join(', ') : '—', small: true },
        ];

        let cx = 15, cy = kpiY;
        cards.forEach((c, i) => {
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(229, 231, 235);
            doc.roundedRect(cx, cy, cardW, 22, 2, 2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(secondary[0], secondary[1], secondary[2]);
            doc.setFontSize(10);
            doc.text(c.title, cx + 4, cy + 8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(text[0], text[1], text[2]);
            doc.setFontSize(c.small ? 9 : 14);
            const v = c.value.length > 48 ? c.value.slice(0, 45) + '…' : c.value;
            doc.text(v, cx + 4, cy + (c.small ? 17 : 17));

            // layout 2 columnas
            if (i % 2 === 1) {
                cx = 15; cy += 26;
            } else {
                cx = 15 + cardW + 12;
            }
        });

        // Pequeña gráfica de tendencia (últimos 12 puntajes)
        const last = testsSorted.slice(0, 12).reverse();
        const chartX = 15, chartY = cy + 12, chartW = pageWidth - 30, chartH = 36;
        doc.setDrawColor(229, 231, 235);
        doc.rect(chartX, chartY, chartW, chartH);
        const vals = last.map(t => (typeof t.score === 'number' ? t.score : null)).filter(v => v !== null);
        if (vals.length) {
            const minV = Math.min(...vals, 0); // 0..100
            const maxV = Math.max(...vals, 100);
            const stepX = chartW / Math.max(last.length - 1, 1);
            doc.setDrawColor(primary[0], primary[1], primary[2]);
            last.forEach((t, idx) => {
                if (typeof t.score !== 'number') return;
                const x = chartX + idx * stepX;
                const y = chartY + chartH - ((t.score - minV) / Math.max(maxV - minV, 1)) * chartH;
                if (idx === 0) doc.line(x, y, x, y);
                else {
                    const prevIdx = idx - 1;
                    const prev = last[prevIdx];
                    if (typeof prev.score === 'number') {
                        const px = chartX + prevIdx * stepX;
                        const py = chartY + chartH - ((prev.score - minV) / Math.max(maxV - minV, 1)) * chartH;
                        doc.line(px, py, x, y);
                    }
                }
                // puntos
                doc.circle(x, y, 0.8, 'F');
            });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(muted[0], muted[1], muted[2]);
            doc.text('Evolución de puntajes (últimos 12)', chartX, chartY - 2);
        }
    };

    // Tabla completa de participaciones
    const table = () => {
        doc.addPage();
        // Encabezado
        safeAddImage(doc, logoB64, 15, 10, 12, 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(secondary[0], secondary[1], secondary[2]);
        doc.text('Participaciones', pageWidth - 15, 16, { align: 'right' });
        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.line(15, 22, pageWidth - 15, 22);

        const rows = testsSorted.map(t => {
            const dateStr = t._dateObj ? t._dateObj.toLocaleDateString() : '—';
            const mode = t.mode ? `${String(t.mode).charAt(0).toUpperCase() + String(t.mode).slice(1)}` : '—';
            const tables = t.tables?.length ? t.tables.join(', ') : '—';
            const correctTxt = (typeof t.correct === 'number' && typeof t.total === 'number') ? `${t.correct}/${t.total}` : '—';
            const scoreTxt = typeof t.score === 'number' ? `${t.score}%` : '—';
            const timeTxt = typeof t.time === 'number' ? t.time.toFixed(1) : '—';
            return [dateStr, mode, tables, scoreTxt, correctTxt, timeTxt];
        });

        doc.autoTable({
            startY: 28,
            head: [['Fecha', 'Modo', 'Tablas', 'Puntaje', 'Correctas', 'Tiempo (s)']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { cellPadding: 3, fontSize: 10, textColor: text },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            didDrawPage: (data) => {
                if (data.pageNumber === 1) return; // esta es la página de tabla, pero podrían existir más
                // encabezado para páginas adicionales ya dibujado al entrar
            },
        });
    };

    // Construcción del documento
    cover();
    summary();
    if (testsSorted.length) table();
    addFooter();

    const today = new Date().toISOString().slice(0, 10);
    doc.save(`Tably-Perfil-${user.name}-${today}.pdf`);
};
