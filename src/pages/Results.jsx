
import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Confetti from 'react-dom-confetti';
import { Check, X, Repeat, Trophy, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!state) {
      navigate('/dashboard');
    } else if(user) {
      const saveTestResults = async () => {
        const newResult = {
          user_id: user.id,
          date: new Date().toISOString(),
          score: state.score,
          correct_answers: state.correct,
          total_questions: state.total,
          total_time: state.totalTime,
          average_time: state.averageTime,
          config: state.config,
        };
        
        try {
          const { error } = await supabase.from('tests').insert(newResult);
          if (error) throw error;
        } catch(error) {
          console.error("Error al guardar los resultados:", error);
        }

        // Fallback local: guardar también en localStorage
        try {
          const key = `userTests:${user.id}`;
          const prev = JSON.parse(localStorage.getItem(key) || '[]');
          const next = [newResult, ...prev].slice(0, 200); // limitar tamaño
          localStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
          console.warn('No se pudo guardar el resultado localmente:', e);
        }
      };

      saveTestResults();
    }
  }, [state, navigate, user]);
  
  const { score, correct, incorrect, total, averageTime, totalTime } = state || {};

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

  if (!state) return null;

  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-full">
      <Helmet>
        <title>Resultados del Test - Tably</title>
        <meta name="description" content="Revisa los resultados de tu último test de tablas de multiplicar en Tably." />
      </Helmet>
      
      <div className="relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Confetti active={isSuccess} config={confettiConfig} />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="w-full max-w-lg text-center shadow-2xl">
            <CardHeader>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                <CardTitle className="text-3xl font-bold">
                  {isSuccess ? '¡Excelente Trabajo!' : '¡Sigue Practicando!'}
                </CardTitle>
              </motion.div>
              <CardDescription>Estos son los resultados de tu test</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div 
                className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-6 ${isSuccess ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
              >
                <p className={`text-5xl font-bold ${isSuccess ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                  {score}%
                </p>
              </motion.div>

              <div className="grid grid-cols-2 gap-4 text-left my-6">
                <div className="flex items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Check className="w-6 h-6 mr-3 text-green-500"/>
                  <div>
                    <p className="font-bold">{correct} Correctas</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">de {total} preguntas</p>
                  </div>
                </div>
                 <div className="flex items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <X className="w-6 h-6 mr-3 text-red-500"/>
                  <div>
                    <p className="font-bold">{incorrect} Incorrectas</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">de {total} preguntas</p>
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tiempo Total</p>
                    <p className="font-bold text-xl">{totalTime.toFixed(1)}s</p>
                </div>
                 <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Promedio/Pregunta</p>
                    <p className="font-bold text-xl">{averageTime.toFixed(1)}s</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <Button onClick={() => navigate('/test-config')}>
                    <Repeat className="w-4 h-4 mr-2"/>
                    Jugar de Nuevo
                </Button>
                <Button variant="outline" onClick={() => navigate('/ranking')}>
                    <Trophy className="w-4 h-4 mr-2"/>
                    Ver Ranking
                </Button>
                 <Button variant="secondary" className="sm:col-span-2" onClick={() => navigate('/dashboard')}>
                    <Home className="w-4 h-4 mr-2"/>
                    Volver al Inicio
                </Button>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default Results;
