
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Play, Trophy, Target, Clock, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

function Dashboard() {
  const { user } = useAuth();
  const [recentTests, setRecentTests] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [stats, setStats] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('score, correct_answers, total_questions, total_time, average_time, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (testsError) throw testsError;
      
      setRecentTests(tests.slice(0, 3).map(t => ({
        ...t,
        correct: t.correct_answers,
        total: t.total_questions
      })));

      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');
      if (profilesError) throw profilesError;

      const { data: allTests, error: allTestsError } = await supabase
        .from('tests')
        .select('user_id, score, total_time');
      if (allTestsError) throw allTestsError;

      const usersWithStats = allProfiles.map(p => {
        const userResults = allTests.filter(test => test.user_id === p.id);
        if (userResults.length === 0) {
          return { id: p.id, bestScore: 0, bestTime: Infinity, totalTests: 0 };
        }
        const bestScore = Math.max(...userResults.map(test => test.score));
        const bestTime = Math.min(...userResults.filter(t => t.score === bestScore).map(t => t.total_time));
        return { id: p.id, bestScore, bestTime, totalTests: userResults.length };
      })
      .filter(u => u.totalTests > 0)
      .sort((a, b) => {
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return a.bestTime - b.bestTime;
      });

      const rank = usersWithStats.findIndex(u => u.id === user.id) + 1;
      setUserRank(rank > 0 ? rank : null);

      const totalTests = tests.length;
      const bestScore = totalTests > 0 ? Math.max(...tests.map(t => t.score)) : 0;
      const averageTime = totalTests > 0 ? tests.reduce((acc, t) => acc + t.average_time, 0) / totalTests : 0;

      setStats([
        { title: 'Tests Realizados', value: totalTests, icon: Target, color: 'from-blue-500 to-blue-600' },
        { title: 'Mejor Puntuación', value: `${bestScore}%`, icon: Star, color: 'from-yellow-500 to-yellow-600' },
        { title: 'Tiempo Promedio', value: `${averageTime.toFixed(1)}s`, icon: Clock, color: 'from-green-500 to-green-600' },
        { title: 'Posición Ranking', value: rank > 0 ? `#${rank}` : '-', icon: Trophy, color: 'from-purple-500 to-purple-600' }
      ]);

    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos del dashboard.", variant: "destructive" });
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (!user) {
    return null; 
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Dashboard - Tably</title>
        <meta name="description" content="Panel principal de Tably para practicar tablas de multiplicar." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            ¡Hola, {user.name}! 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            ¿Listo para dominar las tablas de multiplicar con Tably?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5`} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full bg-gradient-to-r ${stat.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="w-5 h-5 text-[rgb(38,186,165)]" />
                  <span>Acciones Rápidas</span>
                </CardTitle>
                <CardDescription>
                  Comienza a practicar o revisa tu progreso en Tably
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/test-config">
                  <Button className="w-full primary-gradient hover:opacity-90 transition-opacity text-lg py-6">
                    <Play className="w-5 h-5 mr-2" />
                    Nuevo Test de Práctica
                  </Button>
                </Link>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link to="/ranking">
                    <Button variant="outline" className="w-full">
                      <Trophy className="w-4 h-4 mr-2" />
                      Ver Ranking
                    </Button>
                  </Link>
                  
                  <Link to="/profile">
                     <Button variant="outline" className="w-full">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Mi Progreso
                     </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tests Recientes</CardTitle>
                <CardDescription>
                  Tus últimas 3 participaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTests.length > 0 ? (
                  <div className="space-y-3">
                    {recentTests.map((test, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {test.score}% ({test.correct}/{test.total})
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(test.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {test.total_time.toFixed(1)}s
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {test.average_time.toFixed(1)}s/pregunta
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                      Aún no has realizado ningún test
                    </p>
                    <Link to="/test-config">
                      <Button size="sm" className="primary-gradient">
                        Comenzar Ahora
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Dashboard;
