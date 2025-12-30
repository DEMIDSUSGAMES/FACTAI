
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Difficulty, Fact } from './types';
import { audioService } from './services/audioService';
import { generateGameFacts, resetSessionHistory } from './services/geminiService';

const TOTAL_ROUNDS = 5;

const Menu: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-12 p-8 text-center animate-slide-up">
    <div className="relative">
      <div className="ai-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"></div>
      <h1 className="text-5xl sm:text-6xl font-orbitron font-black text-white tracking-tighter uppercase italic">
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
      className="group relative px-12 py-5 bg-indigo-600 rounded-full font-black text-white text-lg transition-all active:scale-95 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
    >
      Инициация
    </button>
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
    <div className="flex flex-col h-full p-6 glass-panel rounded-t-[32px] border-t border-indigo-500/20">
      <div className="shrink-0 mb-6">
        <h2 className="text-xl font-orbitron font-bold text-white uppercase italic">Конфигурация</h2>
        <div className="h-1 w-12 bg-indigo-500 rounded-full mt-1"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Сложность</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(Difficulty).map(d => (
              <button
                key={d}
                onClick={() => { audioService.playClick(); setDifficulty(d); }}
                className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                  difficulty === d 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Агенты</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                onClick={() => { audioService.playClick(); setPlayerCount(n); }}
                className={`h-10 rounded-lg border-2 text-xs font-black transition-all flex items-center justify-center ${
                  playerCount === n ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2 pb-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Имена</label>
          {Array.from({ length: playerCount }).map((_, i) => (
            <input
              key={i}
              placeholder={`Агент ${i + 1}`}
              value={playerNames[i]}
              onChange={(e) => {
                const newNames = [...playerNames];
                newNames[i] = e.target.value;
                setPlayerNames(newNames);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none font-bold placeholder:text-slate-700 transition-colors"
            />
          ))}
        </section>
      </div>

      <div className="shrink-0 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button 
          onClick={handleStart}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Запустить протокол
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
  const isReadingRef = useRef(false);

  const fetchFacts = useCallback(async () => {
    setIsLoading(true);
    setSelectedFactIdx(null);
    setShowResult(false);
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

  const readAllFacts = useCallback(async () => {
    if (facts.length === 0) return;
    isReadingRef.current = true;
    for (let i = 0; i < facts.length; i++) {
      if (!isReadingRef.current) break;
      await audioService.speak(`Факт ${i + 1}: ${facts[i].text}`);
      if (isReadingRef.current) await new Promise(r => setTimeout(r, 600));
    }
    isReadingRef.current = false;
  }, [facts]);

  useEffect(() => {
    if (facts.length > 0 && !isLoading) {
      const timer = setTimeout(() => readAllFacts(), 800);
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
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-xs font-orbitron font-bold text-indigo-400 tracking-[0.2em] uppercase">Генерация данных...</p>
      </div>
    );
  }

  const currentPlayer = localPlayers[currentPlayerIdx];

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-hidden">
      <header className="shrink-0 flex justify-between items-center glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs">
            {currentPlayer.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">Агент</p>
            <h3 className="text-xs font-bold text-white truncate max-w-[80px]">{currentPlayer.name}</h3>
          </div>
        </div>
        <div className="bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="text-[10px] font-black text-indigo-400">{currentRound} / {TOTAL_ROUNDS}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {facts.map((fact, i) => (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              disabled={showResult}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                showResult 
                  ? fact.isLie 
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : i === selectedFactIdx 
                      ? 'bg-rose-500/20 border-rose-500 opacity-100'
                      : 'bg-slate-900/50 border-transparent opacity-30'
                  : 'bg-slate-900/50 border-slate-800 active:scale-98'
              }`}
            >
              <div className="flex gap-4">
                <span className="text-xs font-black text-indigo-500/50">0{i+1}</span>
                <p className="text-[13px] leading-snug font-medium text-slate-200">{fact.text}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showResult && (
        <div className="shrink-0 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slide-up">
          <button 
            onClick={nextTurn}
            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
};

const Scoring: React.FC<{ players: Player[], onNext: () => void }> = ({ players, onNext }) => (
  <div className="flex flex-col h-full p-6 space-y-6 glass-panel rounded-t-[32px] border-t border-indigo-500/20">
    <h2 className="text-center text-2xl font-orbitron font-black text-white italic uppercase">Протокол очков</h2>
    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
      {players.sort((a, b) => b.score - a.score).map((p, i) => (
        <div key={p.id} className="flex justify-between items-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-indigo-500">#{i + 1}</span>
            <span className="font-bold text-slate-200 text-sm">{p.name}</span>
          </div>
          <span className="text-lg font-black text-indigo-400">{p.score}</span>
        </div>
      ))}
    </div>
    <button onClick={onNext} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest pb-[max(1rem,env(safe-area-inset-bottom))]">Продолжить</button>
  </div>
);

const Winner: React.FC<{ players: Player[], onReset: () => void }> = ({ players, onReset }) => {
  const winner = [...players].sort((a, b) => b.score - a.score)[0];
  return (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-8 animate-slide-up">
      <div className="relative">
         <div className="text-8xl animate-bounce">🏆</div>
         <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full -z-10"></div>
      </div>
      <h1 className="text-3xl font-orbitron font-black text-white uppercase">{winner.name}</h1>
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 w-full max-w-[200px]">
        <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Финальный счёт</p>
        <p className="text-5xl font-black text-indigo-500">{winner.score}</p>
      </div>
      <button 
        onClick={() => { resetSessionHistory(); onReset(); }} 
        className="w-full max-w-xs py-4 border border-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest"
      >
        Перезагрузка системы
      </button>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [players, setPlayers] = useState<Player[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.AGE_7_12);

  return (
    // Фиксированный контейнер для мобильных устройств
    <div className="fixed inset-0 w-full h-[100dvh] bg-black overflow-hidden select-none">
      <div className="w-full h-full max-w-md mx-auto bg-slate-950 relative shadow-2xl overflow-hidden flex flex-col border-x border-slate-900/50">
        {/* Фоновые градиенты */}
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-indigo-900/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[60%] bg-blue-950/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        {/* Верхняя безопасная зона (челка) */}
        <div className="h-[env(safe-area-inset-top)] w-full bg-transparent shrink-0"></div>

        <main className="relative z-10 flex-1 overflow-hidden">
          {gameState === 'MENU' && <Menu onStart={() => setGameState('SETUP')} />}
          {gameState === 'SETUP' && <Setup onComplete={(p, d) => { setPlayers(p); setDifficulty(d); setGameState('PLAYING'); }} />}
          {gameState === 'PLAYING' && <Game players={players} difficulty={difficulty} onGameComplete={(up) => { setPlayers(up); setGameState('SCORING'); }} />}
          {gameState === 'SCORING' && <Scoring players={players} onNext={() => setGameState('WINNER')} />}
          {gameState === 'WINNER' && <Winner players={players} onReset={() => setGameState('MENU')} />}
        </main>
      </div>
    </div>
  );
}
