import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Clock, CheckCircle, XCircle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

function TestGame() {
  const [testConfig, setTestConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(5);
  const [answers, setAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [testStartTime, setTestStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const inputRef = useRef(null);

  const navigate = useNavigate();

  const generateQuestions = useCallback((config) => {
    if (!config) return [];
    if (config.mode === 'participar') {
      // Genera los 36 ejercicios fijos y los mezcla aleatoriamente
      const ejercicios = [
        {a:2,b:2},{a:2,b:3},{a:2,b:4},{a:2,b:5},{a:2,b:6},{a:2,b:7},{a:2,b:8},{a:2,b:9},
        {a:3,b:3},{a:3,b:4},{a:3,b:5},{a:3,b:6},{a:3,b:7},{a:3,b:8},{a:3,b:9},
        {a:4,b:4},{a:4,b:5},{a:4,b:6},{a:4,b:7},{a:4,b:8},{a:4,b:9},
        {a:5,b:5},{a:5,b:6},{a:5,b:7},{a:5,b:8},{a:5,b:9},
        {a:6,b:6},{a:6,b:7},{a:6,b:8},{a:6,b:9},
        {a:7,b:7},{a:7,b:8},{a:7,b:9},
        {a:8,b:8},{a:8,b:9},
        {a:9,b:9}
      ];
      for (let i = ejercicios.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ejercicios[i], ejercicios[j]] = [ejercicios[j], ejercicios[i]];
      }
      return ejercicios.map(e => ({...e, answer: e.a * e.b}));
    }
    if (!config.tables || config.tables.length === 0) return [];
    const questions = [];
    const addedQuestions = new Set();
    const sortedTables = [...config.tables].sort((a,b) => a - b);
    sortedTables.forEach(table => {
      let limit = 10;
      if (config.mode === 'resumida') limit = 9;
      for (let i = (config.mode === 'resumida' ? 2 : 0); i <= limit; i++) {
        const key1 = `${Math.min(table, i)}x${Math.max(table, i)}`;
        if (config.mode === 'resumida') {
          if (!addedQuestions.has(key1)) {
            questions.push({ a: table, b: i, answer: table * i });
            addedQuestions.add(key1);
          }
        } else {
          const keyForward = `${table}x${i}`;
          if (!addedQuestions.has(keyForward)) {
             questions.push({ a: table, b: i, answer: table * i });
             addedQuestions.add(keyForward);
          }
          if (table !== i) {
             const keyReverse = `${i}x${table}`;
             if(!addedQuestions.has(keyReverse)) {
                questions.push({ a: i, b: table, answer: i * table });
                addedQuestions.add(keyReverse);
             }
          }
        }
      }
    });
    return questions.sort(() => Math.random() - 0.5);
  }, []);

  useEffect(() => {
    const config = JSON.parse(localStorage.getItem('currentTestConfig') || 'null');
    if (!config) {
      navigate('/test-config');
      return;
    }

    setTestConfig(config);
    const generatedQuestions = generateQuestions(config);
    setQuestions(generatedQuestions);
    setTestStartTime(Date.now());
    setQuestionStartTime(Date.now());
  }, [navigate, generateQuestions]);

  const handleAnswer = useCallback((timeOut = false) => {
    if (showFeedback) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const questionTime = (Date.now() - questionStartTime) / 1000;
    
    let correct = false;
    if (!timeOut) {
      correct = parseInt(userAnswer, 10) === currentQuestion.answer;
    }

    const answerData = {
      question: currentQuestion,
      userAnswer: timeOut ? null : parseInt(userAnswer, 10),
      correct,
      timeSpent: questionTime,
      timeOut
    };
    
    setAnswers(prev => [...prev, answerData]);
    setIsCorrect(correct);
    setShowFeedback(true);
  
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer('');
        setTimeLeft(testConfig?.timePerQuestion || 5);
        setShowFeedback(false);
        setQuestionStartTime(Date.now());
        inputRef.current?.focus();
      } else {
        // Calcular resultados
        const finalAnswers = [...answers, answerData];
        const totalTime = (Date.now() - testStartTime) / 1000;
        const correctAnswersCount = finalAnswers.filter(a => a.correct).length;
        const totalQuestions = questions.length;
        const score = Math.round((correctAnswersCount / totalQuestions) * 100);
        const averageTime = totalTime / totalQuestions;

        // Navegar a resultados inmediatamente
        navigate('/results', {
          state: {
            score,
            correct: correctAnswersCount,
            incorrect: totalQuestions - correctAnswersCount,
            total: totalQuestions,
            averageTime,
            totalTime,
            questions: finalAnswers.map(a => ({
              a: a.question.a,
              b: a.question.b,
              answer: a.question.answer,
              userAnswer: a.userAnswer,
              correct: a.correct,
              time: a.timeSpent,
              vencidaPorTiempo: a.timeOut
            })),
            config: testConfig
          }
        });
      }
    }, 1200);
  }, [showFeedback, questions, currentQuestionIndex, userAnswer, questionStartTime, answers, testConfig, navigate, testStartTime]);

  useEffect(() => {
    if (timeLeft > 0 && !showFeedback) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showFeedback) {
      handleAnswer(true);
    }
  }, [timeLeft, showFeedback, handleAnswer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userAnswer.trim() && !showFeedback) {
      handleAnswer(false);
    }
  };

  if (!testConfig || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(38,186,165)] mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando test...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const correctCount = answers.filter(a => a.correct).length;
  const incorrectCount = answers.length - correctCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center p-4">
      <Helmet>
        <title>Test en Progreso - Tably</title>
        <meta name="description" content="Resolviendo test de tablas de multiplicar en Tably." />
      </Helmet>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"><motion.div className="bg-gradient-to-r from-[rgb(38,186,165)] to-[rgb(55,95,122)] h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}/></div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4 text-center"><CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" /><p className="text-2xl font-bold text-green-600">{correctCount}</p><p className="text-xs text-slate-500">Correctas</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" /><p className="text-2xl font-bold text-red-600">{incorrectCount}</p><p className="text-xs text-slate-500">Incorrectas</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><Target className="w-6 h-6 text-blue-500 mx-auto mb-2" /><p className="text-2xl font-bold text-blue-600">{questions.length - currentQuestionIndex}</p><p className="text-xs text-slate-500">Restantes</p></CardContent></Card>
        </div>

        <Card className={`glassmorphism border-white/20 transition-all duration-300 ${showFeedback ? (isCorrect ? 'correct-answer' : 'incorrect-answer') : ''}`}>
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2"><Clock className="w-5 h-5 text-slate-500" /><span className="text-lg font-medium text-slate-600 dark:text-slate-400">{timeLeft}s</span></div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className={`timer-progress h-2 rounded-full ${timeLeft <= 2 ? 'bg-red-500' : timeLeft <= 3 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${(timeLeft / (testConfig.timePerQuestion || 5)) * 100}%` }}/>
              </div>
            </div>

            <div className="text-center mb-8 h-24 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestionIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-6xl font-bold text-slate-800 dark:text-white">
                  {currentQuestion.a} × {currentQuestion.b} = ?
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="h-28">
              <AnimatePresence>
                {!showFeedback && (
                  <motion.form initial={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-4">
                    <Input ref={inputRef} type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Tu respuesta" className="text-center text-2xl font-bold h-16" autoFocus/>
                    <Button type="submit" className="w-full primary-gradient hover:opacity-90 transition-opacity h-12 text-lg" disabled={!userAnswer.trim()}>Confirmar Respuesta</Button>
                  </motion.form>
                )}
                {showFeedback && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <div className={`text-4xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? '¡Correcto!' : 'Incorrecto'}</div>
                    <div className="text-2xl text-slate-600 dark:text-slate-400">{currentQuestion.a} × {currentQuestion.b} = {currentQuestion.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default TestGame;
