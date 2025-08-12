
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { resolvePhpImageUrl } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';


function Ranking() {
  const [rankings, setRankings] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const { user } = useAuth();

  const fetchRankings = useCallback(async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, profile_picture');
      if (profilesError) throw profilesError;

      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('user_id, score, total_time');
      if (testsError) throw testsError;

      const usersWithStats = profiles.map(p => {
        const userResults = tests.filter(result => result.user_id === p.id);
        let bestScore = 0;
        let bestTime = null;
        if (userResults.length > 0) {
          bestScore = Math.max(...userResults.map(r => r.score));
          const bestTimeArr = userResults.filter(r => r.score === bestScore).map(r => r.total_time);
          bestTime = bestTimeArr.length > 0 ? Math.min(...bestTimeArr) : null;
        }
        return { ...p, bestScore, bestTime, totalTests: userResults.length };
      });

      // Ordenar por bestScore desc, luego bestTime asc (nulls al final)
      const sortedUsers = usersWithStats
        .sort((a, b) => {
          if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
          // Si ambos tienen bestTime, menor es mejor; si uno no tiene, va después
          if (a.bestTime == null && b.bestTime == null) return 0;
          if (a.bestTime == null) return 1;
          if (b.bestTime == null) return -1;
          return a.bestTime - b.bestTime;
        });

      setRankings(sortedUsers);

      if (user) {
        const position = sortedUsers.findIndex(u => u.id === user.id) + 1;
        setUserPosition(position > 0 ? position : null);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const getRankIcon = (position) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-slate-500">#{position}</span>;
    }
  };
  
  const RankCard = ({ player, position }) => {
    const isCurrentUser = player.id === user?.id;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: position * 0.05 }}
        className={`rounded-lg border transition-all ${
          isCurrentUser
            ? 'bg-[rgb(38,186,165)]/10 border-[rgb(38,186,165)] ring-2 ring-[rgb(38,186,165)]/20'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <div className="p-4 flex items-center space-x-4">
          <div className="flex-shrink-0 w-10 flex items-center justify-center">{getRankIcon(position)}</div>
          <img
            src={resolvePhpImageUrl(player.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}`)}
            alt={player.name}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}`;
            }}
          />
          <div className="flex-grow">
            <h4 className={`font-bold ${isCurrentUser ? 'text-[rgb(38,186,165)]' : 'text-slate-800 dark:text-white'}`}>
              {player.name}
              {isCurrentUser && <span className="ml-2 text-xs font-normal">(Tú)</span>}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">{player.totalTests} tests</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="font-bold text-lg text-slate-800 dark:text-white">{player.bestScore}%</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {typeof player.bestTime === 'number' && isFinite(player.bestTime)
                ? `${player.bestTime.toFixed(1)}s`
                : '—'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Ranking - Tably</title>
        <meta name="description" content="Ranking de los mejores jugadores en Tably." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            🏆 Ranking Global
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Los mejores jugadores de Tably.
          </p>
          
          {userPosition && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-[rgb(38,186,165)]/10 text-[rgb(38,186,165)] rounded-full"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">Estás en el puesto #{userPosition}</span>
            </motion.div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-[rgb(38,186,165)]" />
              <span>Ranking Completo</span>
            </CardTitle>
            <CardDescription>
              Ordenados por mejor puntuación y tiempo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankings.length > 0 ? (
              <>
                <div className="space-y-4">
                  {rankings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((player, idx) => (
                    <RankCard key={player.id} player={player} position={page * PAGE_SIZE + idx + 1} />
                  ))}
                </div>
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >Anterior</button>
                  <span className="mx-2 text-sm">Página {page + 1} de {Math.ceil(rankings.length / PAGE_SIZE)}</span>
                  <button
                    className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                    onClick={() => setPage(p => Math.min(Math.ceil(rankings.length / PAGE_SIZE) - 1, p + 1))}
                    disabled={page >= Math.ceil(rankings.length / PAGE_SIZE) - 1}
                  >Siguiente</button>
                </div>
                {/* Mostrar usuario actual si no está en la página */}
                {user && userPosition && (userPosition <= rankings.length) &&
                  (userPosition <= page * PAGE_SIZE || userPosition > (page + 1) * PAGE_SIZE) && (
                    <div className="mt-8">
                      <div className="text-center text-xs text-slate-500 mb-2">Tu posición actual</div>
                      <RankCard
                        player={rankings[userPosition - 1]}
                        position={userPosition}
                      />
                    </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Aún no hay rankings
                </h3>
                <p className="text-slate-500 dark:text-slate-500">
                  ¡Sé el primero en completar un test para aparecer aquí!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            El ranking se basa en la mejor puntuación. En caso de empate, el mejor tiempo decide.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Ranking;
