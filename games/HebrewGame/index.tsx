/**
 * Hebrew Game - Word Kingdom (ממלכת המילים והתנועות)
 *
 * A collection of 6 Hebrew language learning games for early readers:
 * - Similar Vowels: Find letters with matching niqqud
 * - Picture Match: Match words to emojis
 * - Missing Letter: Fill in the first letter
 * - Opening Sound: Identify first letter from emoji
 * - Closing Sound: Identify last letter from emoji
 * - Speed Challenge: Fast-paced word matching
 */

import React from 'react';
import Confetti from 'react-confetti';
import { Home, Star, Trophy, Volume2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { GameSettings } from '../../types';
import { GameMode } from './types';
import { useGameState } from './hooks/useGameState';
import { playClick, speakWord } from './audio';

interface HebrewGameProps {
  settings?: GameSettings;
}

export const HebrewGame: React.FC<HebrewGameProps> = ({ settings }) => {
  const game = useGameState({ settings });

  // --- Menu Screen ---
  if (game.mode === 'menu') {
    return <GameMenu onStart={game.startGame} speedSeconds={game.activeSettings.speedChallengeSeconds} />;
  }

  // --- End Screen (Speed Mode) ---
  if (game.gameFinished) {
    return <EndScreen score={game.score} onExit={game.exitToMenu} />;
  }

  // --- Game Screen ---
  return (
    <GameScreen
      game={game}
      onAnswer={game.handleAnswer}
      onExit={game.exitToMenu}
    />
  );
};

// --- Sub-components ---

interface GameMenuProps {
  onStart: (mode: GameMode) => void;
  speedSeconds: number;
}

const GameMenu: React.FC<GameMenuProps> = ({ onStart, speedSeconds }) => (
  <div className="flex flex-col items-center gap-6 p-4 animate-fade-in">
    <h1 className="text-4xl font-extrabold text-indigo-800 text-center mb-4">
      🏰 ממלכת המילים והתנועות
    </h1>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
      <MenuButton
        onClick={() => onStart('similar')}
        color="bg-purple-100 border-purple-300 text-purple-800"
        icon="🎯"
        title="התנועה הדומה"
        desc="מצאו אותיות עם אותו ניקוד"
      />
      <MenuButton
        onClick={() => onStart('pictures')}
        color="bg-blue-100 border-blue-300 text-blue-800"
        icon="🖼️"
        title="מילים ותמונות"
        desc="התאימו מילה לתמונה"
      />
      <MenuButton
        onClick={() => onStart('missing')}
        color="bg-green-100 border-green-300 text-green-800"
        icon="🧩"
        title="השלמת מילים"
        desc="איזו אות חסרה?"
      />
      <MenuButton
        onClick={() => onStart('opening')}
        color="bg-teal-100 border-teal-300 text-teal-800"
        icon="🔜"
        title="צליל פותח"
        desc="באיזו אות המילה מתחילה?"
      />
      <MenuButton
        onClick={() => onStart('closing')}
        color="bg-orange-100 border-orange-300 text-orange-800"
        icon="🔚"
        title="צליל סוגר"
        desc="במה מסתיימת המילה?"
      />
      <MenuButton
        onClick={() => onStart('speed')}
        color="bg-red-100 border-red-300 text-red-800"
        icon="⚡"
        title="אתגר המהירות"
        desc={`כמה תספיקו ב-${speedSeconds} שניות?`}
      />
    </div>
  </div>
);

interface MenuButtonProps {
  onClick: () => void;
  color: string;
  icon: string;
  title: string;
  desc: string;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onClick, color, icon, title, desc }) => (
  <button
    onClick={() => { playClick(); onClick(); }}
    className={`${color} p-6 rounded-3xl border-b-8 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-right flex items-center gap-4 group`}
  >
    <div className="text-5xl group-hover:scale-110 transition-transform">{icon}</div>
    <div>
      <h3 className="text-2xl font-bold mb-1">{title}</h3>
      <p className="opacity-80 text-sm font-medium">{desc}</p>
    </div>
  </button>
);

interface EndScreenProps {
  score: number;
  onExit: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ score, onExit }) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in text-center p-8">
    <Confetti recycle={false} numberOfPieces={500} />
    <div className="text-8xl mb-6">{score >= 20 ? '👑' : '🎗️'}</div>
    <h2 className="text-4xl font-bold text-slate-800 mb-2">{score >= 20 ? 'אלופים!' : 'כל הכבוד!'}</h2>
    <p className="text-2xl text-slate-600 mb-8">
      עניתם נכון על <span className="font-bold text-indigo-600">{score}</span> מתוך 25
    </p>
    <Button size="xl" onClick={onExit} variant="fun">חזרה לתפריט</Button>
  </div>
);

interface GameScreenProps {
  game: ReturnType<typeof useGameState>;
  onAnswer: (answer: string) => void;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ game, onAnswer, onExit }) => {
  const { mode, score, streak, question, feedback, showFullWord, timer, speedCount, showConfetti, activeSettings } = game;

  if (!question) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col items-center min-h-[60vh]">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      {/* Top Bar */}
      <TopBar score={score} streak={streak} onExit={onExit} />

      {/* Speed Timer */}
      {mode === 'speed' && (
        <SpeedTimer timer={timer} maxTime={activeSettings.speedChallengeSeconds} />
      )}

      {/* Instruction */}
      <h2 className="text-xl md:text-2xl text-slate-600 mb-6 font-bold text-center">
        {question.instruction}
      </h2>

      {/* Question Display */}
      <QuestionDisplay
        mode={mode}
        question={question}
        feedback={feedback}
        showFullWord={showFullWord}
        enableTTS={activeSettings.enableTTS}
        enableTTSOpening={activeSettings.enableTTSOpening}
      />

      {/* Answer Options */}
      <AnswerOptions
        options={question.options}
        correct={question.correct}
        feedback={feedback}
        mode={mode}
        onSelect={onAnswer}
      />

      {/* Speed Count */}
      {mode === 'speed' && (
        <div className="mt-6 text-slate-400 font-bold">
          שאלה {speedCount + 1} מתוך 25
        </div>
      )}
    </div>
  );
};

interface TopBarProps {
  score: number;
  streak: number;
  onExit: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ score, streak, onExit }) => (
  <div className="w-full flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-b-4 border-slate-200 mb-8">
    <button onClick={onExit} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
      <Home size={24} />
    </button>

    <div className="flex gap-6">
      <div className="flex items-center gap-2 text-xl font-bold text-yellow-500 bg-yellow-50 px-4 py-2 rounded-xl">
        <Star fill="currentColor" /> {score}
      </div>
      <div className="flex items-center gap-2 text-xl font-bold text-orange-500 bg-orange-50 px-4 py-2 rounded-xl">
        <Trophy size={20} /> {streak}
      </div>
    </div>
  </div>
);

interface SpeedTimerProps {
  timer: number;
  maxTime: number;
}

const SpeedTimer: React.FC<SpeedTimerProps> = ({ timer, maxTime }) => (
  <div className="w-full h-4 bg-slate-200 rounded-full mb-8 overflow-hidden">
    <div
      className={`h-full transition-all duration-1000 linear ${timer <= 1 ? 'bg-red-500' : 'bg-green-500'}`}
      style={{ width: `${(timer / maxTime) * 100}%` }}
    />
  </div>
);

interface QuestionDisplayProps {
  mode: GameMode;
  question: ReturnType<typeof useGameState>['question'];
  feedback: ReturnType<typeof useGameState>['feedback'];
  showFullWord: string | null;
  enableTTS: boolean;
  enableTTSOpening: boolean;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  mode,
  question,
  feedback,
  showFullWord,
  enableTTS,
  enableTTSOpening
}) => {
  if (!question) return null;

  const showTTSButton = (mode === 'closing' && enableTTS) || (mode === 'opening' && enableTTSOpening);

  return (
    <div className="bg-white p-12 rounded-3xl shadow-lg border-b-8 border-indigo-100 w-full text-center mb-8 relative">
      {/* Missing Letter Hint */}
      {mode === 'missing' && question.hint && (
        <div className="mb-4 text-6xl animate-bounce-slow inline-block">
          {question.hint}
        </div>
      )}

      {/* TTS Button */}
      {showTTSButton && (
        <div className="absolute top-4 left-4">
          <button
            onClick={() => question.wordForAudio && speakWord(question.wordForAudio)}
            className="p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
          >
            <Volume2 size={32} />
          </button>
        </div>
      )}

      {/* Prompt */}
      <div className={`text-6xl md:text-8xl font-bold text-slate-800 transition-transform duration-300 ${
        feedback === 'correct' ? 'scale-110 text-green-600' :
        feedback === 'wrong' ? 'animate-pulse text-red-500' : ''
      }`}>
        {mode === 'pictures' ? question.prompt :
         (mode === 'closing' || mode === 'opening') ? <span className="text-8xl">{question.prompt}</span> :
         mode === 'speed' ? <span className="text-8xl">{question.prompt}</span> :
         mode === 'missing' ? <span className="text-7xl tracking-widest">{question.prompt}</span> :
         question.prompt
        }
      </div>

      {/* Full Word Reveal (Opening/Closing) */}
      {(mode === 'closing' || mode === 'opening') && showFullWord && (
        <div className="mt-8 text-4xl font-bold animate-fade-in text-gray-400">
          {mode === 'opening' ? (
            <>
              <span className="text-green-500 scale-125 inline-block mx-1">{question.correct}</span>
              {showFullWord.substring(1)}
            </>
          ) : (
            <>
              {showFullWord.slice(0, -question.correct.length)}
              <span className="text-red-500 scale-125 inline-block mx-1">{question.correct}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface AnswerOptionsProps {
  options: string[];
  correct: string;
  feedback: ReturnType<typeof useGameState>['feedback'];
  mode: GameMode;
  onSelect: (answer: string) => void;
}

const AnswerOptions: React.FC<AnswerOptionsProps> = ({ options, correct, feedback, mode, onSelect }) => (
  <div className={`grid gap-4 w-full ${mode === 'speed' ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
    {options.map((opt, idx) => {
      let btnClass = "p-6 rounded-2xl text-4xl font-bold shadow-md border-b-4 transition-all hover:scale-105 active:scale-95 ";

      if (feedback === 'correct' && opt === correct) {
        btnClass += "bg-green-500 border-green-700 text-white shadow-green-200";
      } else if (feedback === 'wrong' && opt !== correct) {
        btnClass += "bg-white border-slate-200 text-slate-300";
      } else if (feedback === 'wrong') {
        btnClass += "bg-red-500 border-red-700 text-white";
      } else {
        btnClass += "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50";
      }

      return (
        <button
          key={idx}
          onClick={() => onSelect(opt)}
          disabled={feedback !== 'none'}
          className={btnClass}
          onClickCapture={() => playClick()}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

export default HebrewGame;
