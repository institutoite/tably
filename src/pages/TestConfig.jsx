import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Play, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

function TestConfig() {
  const [selectedTables, setSelectedTables] = useState([]);
  const [testMode, setTestMode] = useState('resumida');
  const [mainMode, setMainMode] = useState('practicar'); // 'practicar' o 'participar'
  const navigate = useNavigate();

  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const participarTables = [2,3,4,5,6,7,8,9];

  const handleTableToggle = (table) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(tables);
  };

  const clearAllTables = () => {
    setSelectedTables([]);
  };

  const startTest = () => {
    let testConfig;
    if (mainMode === 'participar') {
      testConfig = {
        tables: participarTables,
        mode: 'participar',
        timePerQuestion: 5,
        saveToDB: true
      };
    } else {
      if (selectedTables.length === 0) {
        return;
      }
      testConfig = {
        tables: selectedTables.sort((a,b) => a - b),
        mode: testMode,
        timePerQuestion: 5,
        saveToDB: false
      };
    }
    localStorage.setItem('currentTestConfig', JSON.stringify(testConfig));
    navigate('/test');
  };
  // Genera los 36 ejercicios fijos y los mezcla aleatoriamente
  const generateParticiparQuestions = () => {
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
  };

  const generateQuestions = () => {
    if (mainMode === 'participar') {
      return generateParticiparQuestions();
    }
    if (selectedTables.length === 0) return [];
    const questions = [];
    const addedQuestions = new Set();
    const sortedTables = [...selectedTables].sort((a,b) => a - b);
    sortedTables.forEach(table => {
      let limit = 10;
      if (testMode === 'resumida') limit = 9;
      for (let i = (testMode === 'resumida' ? 2 : 0); i <= limit; i++) {
        const key1 = `${Math.min(table, i)}x${Math.max(table, i)}`;
        if (testMode === 'resumida') {
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
    return questions;
  };

  const previewQuestions = generateQuestions();
  const questionCount = previewQuestions.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Configurar Test - Tably</title>
        <meta name="description" content="Configura tu test de práctica de tablas de multiplicar en Tably." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Configurar Test
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Personaliza tu práctica de tablas de multiplicar.
          </p>
          <div className="mt-4 flex gap-4">
            <Label htmlFor="modo-practicar" className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${mainMode === 'practicar' ? 'border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10' : 'border-slate-200 dark:border-slate-700 hover:border-[rgb(38,186,165)]/50'}`}>
              <input type="radio" id="modo-practicar" name="mainMode" value="practicar" checked={mainMode === 'practicar'} onChange={() => setMainMode('practicar')} />
              <span className="font-medium">Modo Practicar</span>
            </Label>
            <Label htmlFor="modo-participar" className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${mainMode === 'participar' ? 'border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10' : 'border-slate-200 dark:border-slate-700 hover:border-[rgb(38,186,165)]/50'}`}>
              <input type="radio" id="modo-participar" name="mainMode" value="participar" checked={mainMode === 'participar'} onChange={() => setMainMode('participar')} />
              <span className="font-medium">Modo Participar</span>
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {mainMode === 'practicar' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-[rgb(38,186,165)]" />
                    <span>Seleccionar Tablas</span>
                  </CardTitle>
                  <CardDescription>
                    Elige las tablas que quieres practicar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button variant="outline" size="sm" onClick={selectAllTables}>Seleccionar Todas</Button>
                    <Button variant="outline" size="sm" onClick={clearAllTables}>Limpiar</Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {tables.map(table => (
                      <motion.div key={table} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Label htmlFor={`table-${table}`} className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTables.includes(table) ? 'border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10' : 'border-slate-200 dark:border-slate-700 hover:border-[rgb(38,186,165)]/50'}`}>
                          <Checkbox id={`table-${table}`} checked={selectedTables.includes(table)} onCheckedChange={() => handleTableToggle(table)} className="mr-2"/>
                          <span className="font-medium">Tabla del {table}</span>
                        </Label>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Modo de Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label htmlFor="resumida" className={`flex items-start space-x-3 p-4 rounded-lg border-2 ${testMode === 'resumida' ? 'border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10' : 'border-slate-200 dark:border-slate-700'}`}
                    style={{ opacity: mainMode === 'participar' ? 0.7 : 1 }}>
                    <input
                      type="radio"
                      id="resumida"
                      name="testMode"
                      value="resumida"
                      checked={testMode === 'resumida'}
                      disabled={mainMode === 'participar'}
                      onChange={() => mainMode === 'practicar' && setTestMode('resumida')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white">Modo Resumido</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Excluye multiplicaciones por 0, 1 y 10. No incluye repetidos (ej: 2×3 pero no 3×2).</div>
                    </div>
                  </Label>
                  <Label htmlFor="completa" className={`flex items-start space-x-3 p-4 rounded-lg border-2 ${testMode === 'completa' ? 'border-[rgb(38,186,165)] bg-[rgb(38,186,165)]/10' : 'border-slate-200 dark:border-slate-700'}`}
                    style={{ opacity: mainMode === 'participar' ? 0.5 : 1 }}>
                    <input
                      type="radio"
                      id="completa"
                      name="testMode"
                      value="completa"
                      checked={testMode === 'completa'}
                      disabled={mainMode === 'participar'}
                      onChange={() => mainMode === 'practicar' && setTestMode('completa')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-white">Modo Completo</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Incluye todas las multiplicaciones (0-10) y ambos órdenes (ej: 2×3 y 3×2).</div>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5 text-[rgb(38,186,165)]" />
                  <span>Resumen del Test</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tablas:</p>
                  <div className="flex flex-wrap gap-1">
                    {mainMode === 'participar'
                      ? [2,3,4,5,6,7,8,9].map(table => (
                          <span key={table} className="px-2 py-1 bg-[rgb(38,186,165)]/10 text-[rgb(38,186,165)] rounded text-xs font-medium">{table}</span>
                        ))
                      : selectedTables.length > 0
                        ? selectedTables.sort((a,b) => a-b).map(table => (<span key={table} className="px-2 py-1 bg-[rgb(38,186,165)]/10 text-[rgb(38,186,165)] rounded text-xs font-medium">{table}</span>))
                        : ( <span className="text-slate-400 text-sm">Ninguna</span> )
                    }
                  </div>
                </div>
                <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Modo:</p><p className="font-medium text-slate-800 dark:text-white capitalize">{testMode}</p></div>
                <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de preguntas:</p><p className="font-bold text-2xl text-[rgb(38,186,165)]">{questionCount}</p></div>
                <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tiempo/pregunta:</p><p className="font-medium text-slate-800 dark:text-white">5 segundos</p></div>
                <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tiempo estimado:</p><p className="font-medium text-slate-800 dark:text-white">{Math.ceil(questionCount * 5 / 60)} min</p></div>
                <Button onClick={startTest} disabled={mainMode === 'practicar' && selectedTables.length === 0} className="w-full primary-gradient hover:opacity-90 transition-opacity"><Play className="w-4 h-4 mr-2" />Comenzar Test</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default TestConfig;
