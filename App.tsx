
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Difficulty, Fact } from './types';
import { audioService } from './services/audioService';
import { generateGameFacts, resetSessionHistory } from './services/geminiService';

const TOTAL_ROUNDS = 5; // Сделаем 5 раундов для динамики, но можно вернуть 10

// --- Components ---

const Menu: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-12 p-10 text-center animate-slide-up">
    <div className="relative">
      <div className="ai-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"></div>
      <h1 className="text-6xl font-orbitron font-black text-white tracking-tighter uppercase italic">
        Fact<span className="text-indigo-500">AI</span>
      </h1>
      <div className="mt-2 text-indigo-400 font-bold tracking-[0.3em] text-[10px] uppercase">
        Neural Game Engine
      </div>
    </div>

    <div className="space-y-4 max-w-xs">
      <p className="text-slate-400 text-sm leading-relaxed font-medium">
        Система сгенерирует 2 правды и 1 ложь. <br/>Твоя задача — взломать систему и найти обман.
      </p>
    </div>
    
    <button 
      onClick={() => { audioService.playTransition(); onStart(); }}
      className="group relative px-16 py-5 bg-indigo-600 rounded-full font-black text-white text-xl transition-all active:scale-90 shadow-[0_0_30px_rgba(79,70,229,0.5)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      Инициация
    </button>

    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 opacity-30">
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-150"></div>
    </div>
  </div>
);

const Setup: React.FC<{ onComplete: (players: Player[], diff: Difficulty) => void }> = ({ onComplete }) => {
  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>(Array(10).fill(''));
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.AGE_7_12);

  const handleStart = () => {
    audioService.playTransition();
    const players: Player[] = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      name: playerNames[i].trim() || `Агент ${i + 1}`,
      score: 0
    }));
    onComplete(players, difficulty);
  };

  return (
    <div className="flex flex-col h-full p-8 animate-slide-up overflow-hidden glass-panel rounded-t-[40px]">
      <div className="shrink-0 mb-8 space-y-1">
        <h2 className="text-2xl font-orbitron font-bold text-white uppercase italic">Конфигурация</h2>
        <div className="h-1 w-12 bg-indigo-500 rounded-full"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
        <section className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Уровень сложности / Возраст</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(Difficulty).map(d => (
              <button
                key={d}
                onClick={() => { audioService.playClick(); setDifficulty(d); }}
                className={`py-4 rounded-2xl border-2 text-[11px] font-black uppercase tracking-tight transition-all ${
                  difficulty === d 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Количество агентов</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                onClick={() => { audioService.playClick(); setPlayerCount(n); }}
                className={`h-11 rounded-xl border-2 text-sm font-black transition-all flex items-center justify-center ${
                  playerCount === n ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 pb-8">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Имена участников</label>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} className="group relative">
              <input
                placeholder={`Имя агента ${i + 1}`}
                value={playerNames[i]}
                onChange={(e) => {
                  const newNames = [...playerNames];
                  newNames[i] = e.target.value;
                  setPlayerNames(newNames);
                }}
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 font-bold"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 font-black text-[10px]">ID-{i+1}</div>
            </div>
          ))}
        </section>
      </div>

      <div className="shrink-0 pt-6 border-t border-slate-800">
        <button 
          onClick={handleStart}
          className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Подключиться
        </button>
      </div>
    </div>
  );
};

const Game: React.FC<{ 
  players: Player[], 
  difficulty: Difficulty, 
  onGameComplete: (updatedPlayers: Player[]) => void 
}> = ({ players, difficulty, onGameComplete }) => {
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFactIdx, setSelectedFactIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [localPlayers, setLocalPlayers] = useState(players);
  const [readingStatus, setReadingStatus] = useState<'idle' | 'reading' | 'finished'>('idle');
  const isReadingRef = useRef(false);

  const fetchFacts = useCallback(async () => {
    setIsLoading(true);
    setSelectedFactIdx(null);
    setShowResult(false);
    setReadingStatus('idle');
    audioService.stopSpeaking();
    isReadingRef.current = false;
    try {
      const newFacts = await generateGameFacts(difficulty);
      setFacts(newFacts);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [difficulty]);

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  const readFact = async (idx: number) => {
    audioService.stopSpeaking();
    await audioService.speak(`Факт номер ${idx + 1}. ${facts[idx].text}`);
  };

  const readAllFacts = useCallback(async () => {
    if (facts.length === 0) return;
    setReadingStatus('reading');
    isReadingRef.current = true;
    for (let i = 0; i < facts.length; i++) {
      if (!isReadingRef.current) break;
      await audioService.speak(`Факт номер ${i + 1}. ${facts[i].text}`);
      if (isReadingRef.current) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
    if (isReadingRef.current) setReadingStatus('finished');
    isReadingRef.current = false;
  }, [facts]);

  useEffect(() => {
    if (facts.length > 0 && !isLoading) {
      const timer = setTimeout(() => readAllFacts(), 1200);
      return () => {
        clearTimeout(timer);
        audioService.stopSpeaking();
        isReadingRef.current = false;
      };
    }
  }, [facts, isLoading, readAllFacts]);

  const handleChoice = (idx: number) => {
    if (selectedFactIdx !== null) return;
    audioService.stopSpeaking();
    isReadingRef.current = false;
    setSelectedFactIdx(idx);
    setShowResult(true);

    if (facts[idx].isLie) {
      audioService.playSuccess();
      const newPlayers = [...localPlayers];
      newPlayers[currentPlayerIdx].score += 10;
      setLocalPlayers(newPlayers);
    } else {
      audioService.playError();
    }
  };

  const nextTurn = () => {
    audioService.playClick();
    if (currentPlayerIdx < localPlayers.length - 1) {
      setCurrentPlayerIdx(prev => prev + 1);
      fetchFacts();
    } else {
      if (currentRound < TOTAL_ROUNDS) {
        setCurrentRound(prev => prev + 1);
        setCurrentPlayerIdx(0);
        fetchFacts();
      } else {
        onGameComplete(localPlayers);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8 animate-pulse">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-400">AI</div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-orbitron font-black text-white italic uppercase">Анализ данных...</h3>
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">Калибровка нейросети</p>
        </div>
      </div>
    );
  }

  const currentPlayer = localPlayers[currentPlayerIdx];

  return (
    <div className="flex flex-col h-full p-6 space-y-6 overflow-hidden animate-slide-up">
      <header className="shrink-0 flex justify-between items-center glass-panel p-4 rounded-3xl border border-indigo-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            {currentPlayer.name[0].toUpperCase()}
          </div>
          <div className="leading-none">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Агент в сети</p>
            <h3 className="text-sm font-bold text-white truncate max-w-[120px]">{currentPlayer.name}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Загрузка</p>
          <div className="text-sm font-black text-indigo-400">{currentRound} / {TOTAL_ROUNDS}</div>
        </div>
      </header>

      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        <div className="space-y-1">
          <h2 className="text-xl font-orbitron font-black text-white italic leading-tight uppercase">
            Детектор <span className="text-rose-500 underline underline-offset-4 decoration-rose-500/30">лжи</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Выделите ложный байт данных</p>
        </div>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
          {facts.map((fact, i) => (
            <div key={i} className="relative group">
              <button
                onClick={() => handleChoice(i)}
                disabled={showResult}
                className={`w-full p-5 rounded-3xl border-2 text-left transition-all duration-300 ${
                  showResult 
                    ? fact.isLie 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                      : i === selectedFactIdx 
                        ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)] opacity-100'
                        : 'bg-slate-900 border-slate-900 opacity-20 scale-[0.98]'
                    : 'bg-slate-900/50 border-slate-800 active:scale-[0.98] hover:border-indigo-500/30'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                    showResult && fact.isLie ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <p className="text-[13px] leading-relaxed font-medium text-slate-200">{fact.text}</p>
                </div>
              </button>
              
              {!showResult && (
                <button 
                  onClick={(e) => { e.stopPropagation(); readFact(i); }}
                  className="absolute right-3 top-3 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] hover:bg-indigo-500/20 transition-colors"
                  title="Повторить этот факт"
                >
                  🔊
                </button>
              )}
            </div>
          ))}
        </div>

        {readingStatus === 'finished' && !showResult && (
          <div className="flex gap-2 justify-center py-2">
            <button 
              onClick={() => { audioService.playClick(); readAllFacts(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-indigo-400 uppercase tracking-widest transition-all hover:bg-slate-700"
            >
              🔄 Весь пакет
            </button>
            {[0, 1, 2].map(num => (
              <button 
                key={num}
                onClick={() => { audioService.playClick(); readFact(num); }}
                className="w-10 h-10 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-400 hover:bg-indigo-600/20"
              >
                {num + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {showResult && (
        <div className="shrink-0 pt-6 animate-slide-up">
          <div className={`flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] mb-4 ${
            facts[selectedFactIdx!].isLie ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span className="w-2 h-2 rounded-full animate-ping bg-current"></span>
            {facts[selectedFactIdx!].isLie ? 'СИСТЕМА ВЗЛОМАНА' : 'ОШИБКА ДОСТУПА'}
          </div>
          <button 
            onClick={nextTurn}
            className="w-full py-5 bg-white text-slate-900 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
          >
            {currentPlayerIdx < localPlayers.length - 1 ? 'След. агент' : (currentRound < TOTAL_ROUNDS ? 'След. раунд' : 'Результаты')}
          </button>
        </div>
      )}
    </div>
  );
};

const Scoring: React.FC<{ players: Player[], onNext: () => void }> = ({ players, onNext }) => (
  <div className="flex flex-col h-full p-10 space-y-10 animate-slide-up overflow-hidden glass-panel rounded-t-[40px]">
    <div className="text-center space-y-2">
      <h2 className="text-4xl font-orbitron font-black text-white italic uppercase tracking-tighter">Рейтинг</h2>
      <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full"></div>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
      {players.sort((a, b) => b.score - a.score).map((p, i) => (
        <div key={p.id} className="group flex justify-between items-center p-5 rounded-[30px] bg-slate-900/50 border border-slate-800 transition-all hover:border-indigo-500/30" style={{animationDelay: `${i * 0.1}s`}}>
          <div className="flex items-center gap-5">
            <span className={`text-xl font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-orange-700'}`}>0{i + 1}</span>
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-0.5">ID-{p.id}</p>
              <span className="font-bold text-slate-200 text-lg">{p.name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-indigo-400 group-hover:scale-110 transition-transform block">{p.score}</span>
            <span className="text-[9px] font-black text-slate-600 uppercase">Баллов</span>
          </div>
        </div>
      ))}
    </div>

    <button 
      onClick={() => { audioService.playTransition(); onNext(); }}
      className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95"
    >
      Триумф
    </button>
  </div>
);

const Winner: React.FC<{ players: Player[], onReset: () => void }> = ({ players, onReset }) => {
  const winner = [...players].sort((a, b) => b.score - a.score)[0];
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-12 animate-slide-up">
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] animate-pulse rounded-full"></div>
        <div className="text-9xl mb-4 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">👑</div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.8em]">Чемпион</p>
          <h1 className="text-5xl font-orbitron font-black text-white italic tracking-tighter uppercase">{winner.name}</h1>
        </div>
      </div>

      <div className="w-full max-w-xs p-10 bg-slate-900/80 border-2 border-slate-800 rounded-[40px] space-y-2 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">XP</div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">Финальный счёт</p>
        <p className="text-7xl font-black text-indigo-500 relative z-10">{winner.score}</p>
      </div>

      <button 
        onClick={() => { 
          audioService.playTransition(); 
          resetSessionHistory();
          onReset(); 
        }}
        className="w-full max-w-xs py-5 border-2 border-slate-800 text-slate-500 rounded-[24px] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-slate-900 hover:text-white"
      >
        Вернуться в хаб
      </button>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [players, setPlayers] = useState<Player[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.AGE_7_12);

  const handleStartSetup = () => setGameState('SETUP');
  const handleSetupComplete = (p: Player[], d: Difficulty) => {
    setPlayers(p);
    setDifficulty(d);
    setGameState('PLAYING');
  };
  const handleGameComplete = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
    setGameState('SCORING');
  };
  const handleScoringComplete = () => setGameState('WINNER');
  const handleReset = () => {
    setPlayers([]);
    setGameState('MENU');
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-950 relative shadow-2xl overflow-hidden flex flex-col border-x border-slate-900">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] bg-blue-950/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <main className="relative z-10 flex-1 h-full overflow-hidden">
        {gameState === 'MENU' && <Menu onStart={handleStartSetup} />}
        {gameState === 'SETUP' && <Setup onComplete={handleSetupComplete} />}
        {gameState === 'PLAYING' && (
          <Game 
            players={players} 
            difficulty={difficulty} 
            onGameComplete={handleGameComplete} 
          />
        )}
        {gameState === 'SCORING' && <Scoring players={players} onNext={handleScoringComplete} />}
        {gameState === 'WINNER' && <Winner players={players} onReset={handleReset} />}
      </main>
    </div>
  );
}
