import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Confetti from 'react-dom-confetti';
import { Check, X, Repeat, Trophy, Home, Clock, XCircle, TimerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function getDetallePorTabla(questions) {
  const detallePorTabla = {};
  questions.forEach(q => {
    const tabla = q.a;
    if (!detallePorTabla[tabla]) {
      detallePorTabla[tabla] = {
        tiempos: [],
        equivocadas: [],
        vencidas: []
      };
    }
    detallePorTabla[tabla].tiempos.push(q.time);
    if (!q.correct) detallePorTabla[tabla].equivocadas.push(`${q.a}×${q.b}`);
    if (q.vencidaPorTiempo) detallePorTabla[tabla].vencidas.push(`${q.a}×${q.b}`);
  });
  Object.keys(detallePorTabla).forEach(tabla => {
    const tiempos = detallePorTabla[tabla].tiempos;
    detallePorTabla[tabla].tiempoPromedio = tiempos.length ? tiempos.reduce((a,b)=>a+b,0)/tiempos.length : 0;
    detallePorTabla[tabla].mejorTiempo = tiempos.length ? Math.min(...tiempos) : 0;
    detallePorTabla[tabla].peorTiempo = tiempos.length ? Math.max(...tiempos) : 0;
  });
  return detallePorTabla;
}

function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Recuperar datos desde localStorage si no hay state
  const [localState, setLocalState] = useState(null);

  useEffect(() => {
    if (!state && user) {
      const localKey = `userTests:${user.id}`;
      const tests = JSON.parse(localStorage.getItem(localKey) || '[]');
      if (tests.length > 0) {
        setLocalState({
          ...tests[0],
          questions: tests[0].questions || [],
          config: typeof tests[0].config === 'string' ? JSON.parse(tests[0].config) : tests[0].config
        });
      }
    }
  }, [state, user]);

  // Usar state si existe, si no usar localState
  const resultData = state || localState;

  const alreadySavedRef = useRef(false);
  useEffect(() => {
    if (resultData && user && !alreadySavedRef.current) {
      alreadySavedRef.current = true;
      const saveTestResults = async () => {
        const saveToDB = resultData?.config?.saveToDB;
        const newResult = {
          user_id: user.id,
          date: new Date().toISOString(),
          score: resultData.score,
          correct_answers: resultData.correct,
          total_questions: resultData.total,
          total_time: resultData.totalTime,
          average_time: resultData.averageTime,
          config: resultData.config,
        };
        if (saveToDB) {
          try {
            const testHash = btoa(
              `${user.id}|${resultData.score}|${resultData.correct}|${resultData.total}|${resultData.totalTime}|${resultData.averageTime}|${JSON.stringify(resultData.config)}`
            );
            const key = `testSaved:${testHash}`;
            if (!sessionStorage.getItem(key)) {
              const { error } = await supabase.from('tests').insert(newResult);
              if (error) throw error;
              sessionStorage.setItem(key, '1');
            }
          } catch(error) {
            console.error("Error al guardar los resultados:", error);
          }
        }
        // Fallback local: guardar también en localStorage
        try {
          const testResult = {
            score,
            correct,
            incorrect,
            total,
            averageTime,
            totalTime,
            questions, // <-- ¡esto es clave!
            config: testConfig,
          };
          const localKey = `userTests:${user.id}`;
          const prev = JSON.parse(localStorage.getItem(localKey) || '[]');
          localStorage.setItem(localKey, JSON.stringify([testResult, ...prev].slice(0, 200)));
        } catch (e) {
          // Silenciar error local
        }
      };
      saveTestResults();
    }
  }, [resultData, navigate, user]);

  // Si no hay datos, mostrar mensaje y botón
  if (!resultData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-center text-red-500">No hay datos para mostrar el resultado.</h2>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>Volver al inicio</Button>
      </div>
    );
  }

  // Usar resultData para todo el render
  const score = resultData.score ?? 0;
  const correct = resultData.correct ?? 0;
  const incorrect = resultData.incorrect ?? (resultData.total ? resultData.total - resultData.correct : 0);
  const total = resultData.total ?? (resultData.questions ? resultData.questions.length : 0);
  const averageTime = resultData.averageTime ?? 0;
  const totalTime = resultData.totalTime ?? 0;
  const detallePorTabla = getDetallePorTabla(resultData.questions || []);

  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 100,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
  };

  const isSuccess = useMemo(() => (score || 0) >= 80, [score]);

  console.log('Preguntas recibidas:', resultData.questions);

  // Referencia al bloque que quieres exportar
  const resultRef = useRef();

  // Función para exportar a PDF
  const handleExportPDF = async () => {
    const input = resultRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2, backgroundColor: "#fff" });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth - 40;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
    pdf.save('resultado-tably.pdf');
  };

  function generateProfessionalPDF(resultData, detallePorTabla, user) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const logoUrl = `${window.location.origin}/logo-ite.png`;
    const iconFacebook = `${window.location.origin}/icons/facebook.png`;
    const iconInstagram = `${window.location.origin}/icons/instagram.png`;
    const iconTikTok = `${window.location.origin}/icons/tiktok.png`;
    const iconYoutube = `${window.location.origin}/icons/youtube.png`;

    // Helper para cargar imágenes
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
    }

    Promise.all([
      loadImage(logoUrl),
      loadImage(iconFacebook),
      loadImage(iconInstagram),
      loadImage(iconTikTok),
      loadImage(iconYoutube)
    ]).then(([logoImg, fbImg, igImg, tkImg, ytImg]) => {
      // Sector 1: fondo blanco para el logo
      pdf.setFillColor(255,255,255);
      pdf.rect(0, 0, 110, 80, 'F');
      // Sector 2: fondo color corporativo para los datos
      pdf.setFillColor(255,255,255);
      pdf.rect(110, 0, pdf.internal.pageSize.getWidth() - 110, 80, 'F');
      // Logo
      pdf.addImage(logoImg, 'PNG', 20, 15, 80, 50);

      // Datos institucionales sobre fondo color
      pdf.setFontSize(22);
      pdf.setTextColor(55,95,122);
      pdf.text('REPORTE DE RESULTADOS - TABLY', 120, 40);

      pdf.setFontSize(12);
      pdf.setTextColor(38,186,165);
      pdf.text('Las tablas son la llave de las matemáticas.', 120, 60);
      
      pdf.text('Las tablas son la llave de las matemáticas.', 120, 60);
      // Línea separadora
      pdf.setDrawColor(55,95,122); // color corporativo
      pdf.setLineWidth(1.8);
      pdf.line(30, 75, pdf.internal.pageSize.getWidth() - 30, 75);
      let y = 118;
      pdf.setLineWidth(0.5);
      pdf.line(30, 77, pdf.internal.pageSize.getWidth() - 30, 77);
      
      y = 120;
      pdf.setFontSize(16);
      pdf.setTextColor(0,0,0);
      pdf.text('RESUMEN GENERAL', 25, y);
      pdf.setFontSize(12);
      pdf.setTextColor(55,95,122);
      y += 20;

      // Resumen general
      pdf.setFont(undefined, 'bold');
      pdf.text('Usuario:', 40, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${user?.email || user?.name || 'Sin nombre'}`, 170, y);

      y += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Puntaje:', 40, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${resultData.score}%`, 170, y);

      y += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Correctas:', 40, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${resultData.correct} de ${resultData.total}`, 170, y);

      y += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Incorrectas:', 40, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${resultData.incorrect} de ${resultData.total}`, 170, y);

      y += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Tiempo total:', 40, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${resultData.totalTime.toFixed(1)} segundos`, 170, y);

      y += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('Promedio x pregunta:', 40, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${resultData.averageTime.toFixed(1)} segundos`, 170, y);

      y += 30;

      pdf.setFontSize(15);
      pdf.setTextColor(0,0,0);
      pdf.text('DETALLE POR TABLA', 25, y);
      y += 20;
      pdf.setFontSize(11);

      Object.entries(detallePorTabla).forEach(([tabla, datos]) => {
        pdf.setTextColor(0,0,0);
        pdf.text(`TABLA DEL ${tabla}`, 40, y);
        y += 16;
        pdf.setTextColor(55,95,122);
      
        pdf.setFont(undefined, 'bold');
        pdf.text('Tiempo promedio:', 60, y);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${datos.tiempoPromedio.toFixed(2)} segundos`, 160, y);
        y += 14;
        // Mejor tiempo
        const mejor = Math.min(...resultData.questions.filter(q => q.a === Number(tabla)).map(q => q.time));
        const preguntaMejor = resultData.questions.find(q => q.a === Number(tabla) && q.time === mejor);
        if (preguntaMejor) {
            pdf.setFont(undefined, 'bold');
            pdf.text('Mejor Tiempo:', 60, y);
            pdf.setFont(undefined, 'normal');
            pdf.text(`${preguntaMejor.a}×${preguntaMejor.b}=${preguntaMejor.answer} (${mejor.toFixed(2)} segundos)`, 160, y);
        }
        y += 14;
        // Peor tiempo
        const peor = Math.max(...resultData.questions.filter(q => q.a === Number(tabla)).map(q => q.time));
        const preguntaPeor = resultData.questions.find(q => q.a === Number(tabla) && q.time === peor);
        if (preguntaPeor) {
              pdf.setFont(undefined, 'bold');
              pdf.text('Peor Tiempo:', 60, y);
              pdf.setFont(undefined, 'normal');
              pdf.text(`${preguntaPeor.a}×${preguntaPeor.b}=${preguntaPeor.answer} (${peor.toFixed(2)} segundo)`, 160, y);
        }
        y += 20;
        // Correctas
        pdf.setTextColor(38,186,165);
        pdf.setFont(undefined, 'bold');
        pdf.text('CORRECTAS:', 60, y);
        y += 14;
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(55,95,122);
        const correctas = resultData.questions.filter(q => q.a === Number(tabla) && q.correct);
        if (correctas.length) {
          correctas.forEach(q => {
            pdf.text(`${q.a}×${q.b} = ${q.userAnswer}`, 80, y);
            y += 12;
          });
        } else {
          pdf.text('Ninguna', 80, y);
          y += 12;
        }
        // Errores
        pdf.setTextColor(255,0,0);
        pdf.text('ERRORES:', 60, y);
        y += 14;
        pdf.setTextColor(55,95,122);
        const equivocadas = resultData.questions.filter(q => q.a === Number(tabla) && !q.correct);
        if (equivocadas.length) {
          equivocadas.forEach(q => {
            if (q.userAnswer==null) {
              pdf.text(`${q.a}×${q.b} =  (sin respuesta) (correcto: ${q.answer})`, 80, y);
            }else{
              pdf.text(`${q.a}×${q.b} = ${q.userAnswer} (correcto: ${q.answer})`, 80, y);
            }
            y += 12;
          });
        } else {
          pdf.text('Ninguna', 80, y);
          y += 12;
        }
        // Vencidas por tiempo
        pdf.setTextColor(255,140,0);
        pdf.text('VENCIDAS POR TIEMPO:', 60, y);
        y += 14;
        pdf.setTextColor(55,95,122);
        const vencidas = resultData.questions.filter(q => q.a === Number(tabla) && q.vencidaPorTiempo);
        if (vencidas.length) {
          vencidas.forEach(q => {
            pdf.text(`${q.a}×${q.b}`, 80, y);
            y += 12;
          });
        } else {
          pdf.text('Ninguna', 80, y);
          y += 12;
        }
        y += 10;
        // Salto de página si se acerca al final
        if (y > pdf.internal.pageSize.getHeight() - 80) {
          pdf.addPage();
          y = 60;
          // Pie de página en cada página nueva
          pdf.setFillColor(55,95,122);
          pdf.rect(0, pdf.internal.pageSize.getHeight() - 60, pdf.internal.pageSize.getWidth(), 60, 'F');
          pdf.setFontSize(10);
          pdf.setTextColor(255,255,255);
          pdf.text('ITE EDUCABOL | info@ite.com.bo | 71039910 / 71324941 | www.ite.com.bo', 40, pdf.internal.pageSize.getHeight() - 35);

          // Iconos de redes sociales
          let x = 40;
          const yFooter = pdf.internal.pageSize.getHeight() - 20;
          pdf.addImage(fbImg, 'PNG', x, yFooter - 10, 12, 12);
          x += 18;
          pdf.text('ite.educabol', x, yFooter);
          x += 60;
          pdf.addImage(igImg, 'PNG', x, yFooter - 10, 12, 12);
          x += 18;
          pdf.text('ite.educabol', x, yFooter);
          x += 60;
          pdf.addImage(tkImg, 'PNG', x, yFooter - 10, 12, 12);
          x += 18;
          pdf.text('ite_educabol', x, yFooter);
          x += 70;
          pdf.addImage(ytImg, 'PNG', x, yFooter - 10, 12, 12);
          x += 18;
          pdf.text('ITE EDUCABOL', x, yFooter);

          pdf.text('Horario: Lun–Sáb: 07:30–18:30 | Servicios: Apoyo escolar, cursos de tecnología, memoria, robótica, etc.', 40, pdf.internal.pageSize.getHeight() - 7);
        }
      });

      // Pie de página en la última página
      pdf.setFillColor(55,95,122);
      pdf.rect(0, pdf.internal.pageSize.getHeight() - 60, pdf.internal.pageSize.getWidth(), 60, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(255,255,255);
      pdf.text('ITE EDUCABOL | info@ite.com.bo | 71039910 / 71324941 | www.ite.com.bo', 40, pdf.internal.pageSize.getHeight() - 35);

      // Iconos de redes sociales
      let x = 40;
      const yFooter = pdf.internal.pageSize.getHeight() - 20;
      pdf.addImage(fbImg, 'PNG', x, yFooter - 10, 12, 12);
      x += 18;
      pdf.text('ite.educabol', x, yFooter);
      x += 60;
      pdf.addImage(igImg, 'PNG', x, yFooter - 10, 12, 12);
      x += 18;
      pdf.text('ite.educabol', x, yFooter);
      x += 60;
      pdf.addImage(tkImg, 'PNG', x, yFooter - 10, 12, 12);
      x += 18;
      pdf.text('ite_educabol', x, yFooter);
      x += 70;
      pdf.addImage(ytImg, 'PNG', x, yFooter - 10, 12, 12);
      x += 18;
      pdf.text('ITE EDUCABOL', x, yFooter);

      pdf.text('Horario: Lun–Sáb: 07:30–18:30 | Servicios: Apoyo escolar, cursos de tecnología, memoria, robótica, etc.', 40, pdf.internal.pageSize.getHeight() - 7);

      pdf.save('resultado-tably.pdf');
    }).catch(() => {
      alert('No se pudo cargar uno de los iconos. Verifica la ruta.');
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      {/* Botón para exportar o imprimir */}
      <div className="flex justify-end mb-4 gap-2">
        <Button style={{backgroundColor: 'rgb(38,186,165)', color: '#fff'}} onClick={() => generateProfessionalPDF(resultData, detallePorTabla, user)}>
          Exportar PDF
        </Button>
        <Button variant="outline" style={{borderColor: 'rgb(55,95,122)', color: 'rgb(55,95,122)'}} onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      {/* Bloque de resultados a exportar */}
      <div ref={resultRef}>
        {/* Bloque 1: Estos son los resultados de tu test */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="w-full max-w-lg mx-auto text-center shadow-2xl mb-8 border-2 border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10">
            <CardHeader>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                <CardTitle className="text-3xl font-bold text-[rgb(38,186,165)]">
                  {isSuccess ? '¡Excelente Trabajo!' : '¡Sigue Practicando!'}
                </CardTitle>
              </motion.div>
              <CardDescription className="text-[rgb(55,95,122)]">Estos son los resultados de tu test</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-6 bg-[rgb(38,186,165)]/20"
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
              >
                <p className="text-5xl font-bold text-[rgb(38,186,165)]">
                  {score}%
                </p>
              </motion.div>

              <div className="grid grid-cols-2 gap-4 text-left my-6">
                <div className="flex items-center p-3 rounded-lg bg-[rgb(38,186,165)]/10">
                  <Check className="w-6 h-6 mr-3 text-[rgb(38,186,165)]"/>
                  <div>
                    <p className="font-bold text-[rgb(55,95,122)]">{correct} Correctas</p>
                    <p className="text-sm text-[rgb(55,95,122)]">de {total} preguntas</p>
                  </div>
                </div>
                <div className="flex items-center p-3 rounded-lg bg-[rgb(55,95,122)]/10">
                  <X className="w-6 h-6 mr-3 text-[rgb(55,95,122)]"/>
                  <div>
                    <p className="font-bold text-[rgb(55,95,122)]">{incorrect} Incorrectas</p>
                    <p className="text-sm text-[rgb(55,95,122)]">de {total} preguntas</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-3 rounded-lg bg-[rgb(38,186,165)]/10">
                  <p className="text-sm text-[rgb(55,95,122)]">Tiempo Total</p>
                  <p className="font-bold text-xl text-[rgb(38,186,165)]">{totalTime.toFixed(1)}s</p>
                </div>
                <div className="p-3 rounded-lg bg-[rgb(55,95,122)]/10">
                  <p className="text-sm text-[rgb(55,95,122)]">Promedio/Pregunta</p>
                  <p className="font-bold text-xl text-[rgb(55,95,122)]">{averageTime.toFixed(1)}s</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button style={{backgroundColor: 'rgb(38,186,165)', color: '#fff'}} onClick={() => navigate('/test-config')}>
                  <Repeat className="w-4 h-4 mr-2"/>
                  Jugar de Nuevo
                </Button>
                <Button variant="outline" style={{borderColor: 'rgb(38,186,165)', color: 'rgb(38,186,165)'}} onClick={() => navigate('/ranking')}>
                  <Trophy className="w-4 h-4 mr-2"/>
                  Ver Ranking
                </Button>
                <Button variant="secondary" className="sm:col-span-2" style={{backgroundColor: 'rgb(55,95,122)', color: '#fff'}} onClick={() => navigate('/dashboard')}>
                  <Home className="w-4 h-4 mr-2"/>
                  Volver al Inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bloque 2: Resultados Generales */}
        <Card className="mb-8 w-full max-w-lg mx-auto border-2 border-[rgb(55,95,122)] bg-[rgb(55,95,122)]/10">
          <CardHeader>
            <CardTitle className="text-[rgb(55,95,122)]">Resultados Generales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-[rgb(38,186,165)]">Puntuación: {score}%</p>
            <p className="text-[rgb(55,95,122)]">Respuestas Correctas: {correct} de {total}</p>
            <p className="text-[rgb(55,95,122)]">Respuestas Incorrectas: {incorrect} de {total}</p>
            <p className="text-[rgb(38,186,165)]">Tiempo Total: {totalTime.toFixed(1)} segundos</p>
            <p className="text-[rgb(55,95,122)]">Tiempo Promedio por Pregunta: {averageTime.toFixed(1)} segundos</p>
          </CardContent>
        </Card>

        {/* Bloque 3: Detalle por tabla */}
        <div className="mt-8 w-full max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-4 text-[rgb(38,186,165)]">Detalle por tabla</h2>
          {Object.entries(detallePorTabla).map(([tabla, datos]) => (
            <Card key={tabla} className="mb-4 border-2 border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10">
              <CardHeader>
                <CardTitle className="text-[rgb(38,186,165)]">Tabla del {tabla}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-2 text-[rgb(55,95,122)]">
                  <Clock className="w-5 h-5 mr-2 text-[rgb(38,186,165)]" />
                  Tiempo promedio: <b className="ml-2 text-[rgb(38,186,165)]">{datos.tiempoPromedio.toFixed(2)} seg</b>
                </div>
                <div className="flex items-center mb-2 text-[rgb(55,95,122)]">
                  <Clock className="w-5 h-5 mr-2 text-[rgb(38,186,165)]" />
                  Mejor tiempo: 
                  {(() => {
                    const mejor = Math.min(...resultData.questions.filter(q => q.a === Number(tabla)).map(q => q.time));
                    const pregunta = resultData.questions.find(q => q.a === Number(tabla) && q.time === mejor);
                    return pregunta
                      ? <b className="ml-2 text-[rgb(38,186,165)]">{pregunta.a}×{pregunta.b}={pregunta.answer} ({mejor.toFixed(2)} seg)</b>
                      : <span className="ml-2 text-slate-400">-</span>;
                  })()}
                </div>
                <div className="flex items-center mb-2 text-[rgb(55,95,122)]">
                  <Clock className="w-5 h-5 mr-2 text-[rgb(38,186,165)]" />
                  Peor tiempo: 
                  {(() => {
                    const peor = Math.max(...resultData.questions.filter(q => q.a === Number(tabla)).map(q => q.time));
                    const pregunta = resultData.questions.find(q => q.a === Number(tabla) && q.time === peor);
                    return pregunta
                      ? <b className="ml-2 text-[rgb(38,186,165)]">{pregunta.a}×{pregunta.b}={pregunta.answer} ({peor.toFixed(2)} seg)</b>
                      : <span className="ml-2 text-slate-400">-</span>;
                  })()}
                </div>
                <div className="flex items-center mb-2 text-[rgb(55,95,122)]">
                  <XCircle className="w-5 h-5 mr-2 text-red-500" />
                  Equivocadas:
                </div>
                {datos.equivocadas.length ? (
                  <ul className="ml-7 mb-2 list-disc">
                    {resultData.questions
                      .filter(q => q.a === Number(tabla) && !q.correct)
                      .map((q, idx) => (
                        <li key={idx} className="text-[rgb(55,95,122)]">
                          {q.a}×{q.b}: <span className="text-red-500">{q.userAnswer}</span> <span className="mx-1">(correcto: <span className="text-green-600">{q.answer}</span>)</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <span className="ml-7 text-slate-400">Ninguna</span>
                )}
                <div className="flex items-center mb-2 text-[rgb(55,95,122)]">
                  <TimerOff className="w-5 h-5 mr-2 text-orange-500" />
                  Vencidas por tiempo:
                </div>
                {datos.vencidas.length ? (
                  <ul className="ml-7 mb-2 list-disc">
                    {resultData.questions
                      .filter(q => q.a === Number(tabla) && q.vencidaPorTiempo)
                      .map((q, idx) => (
                        <li key={idx} className="text-[rgb(55,95,122)]">
                          {q.a}×{q.b}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <span className="ml-7 text-slate-400">Ninguna</span>
                )}
                <div className="flex items-center mb-2 text-[rgb(55,95,122)]">
                  <Check className="w-5 h-5 mr-2 text-[rgb(38,186,165)]" />
                  Correctas:
                </div>
                {resultData.questions.filter(q => q.a === Number(tabla) && q.correct).length ? (
                  <ul className="ml-7 mb-2 list-disc">
                    {resultData.questions
                      .filter(q => q.a === Number(tabla) && q.correct)
                      .map((q, idx) => (
                        <li key={idx} className="text-[rgb(38,186,165)]">
                          {q.a}×{q.b}: <span className="font-bold">{q.userAnswer}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <span className="ml-7 text-slate-400">Ninguna</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Results;
