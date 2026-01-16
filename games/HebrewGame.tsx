import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { Gamepad2, Volume2, Home, Star, Trophy, HelpCircle, VolumeX } from 'lucide-react';
import { Button } from '../components/Button';
import { GAME_DATA, LETTERS, VOWELS, FINAL_LETTERS } from './hebrewData';
import { GameSettings } from '../types';

// --- Sound Engine (Web Audio API) ---
const playTone = (freq: number, type: OscillatorType, duration: number) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

const playWin = () => {
  playTone(523.25, 'sine', 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.1), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.2), 200); // G5
};

const playLoss = () => {
  playTone(150, 'sawtooth', 0.3);
};

const playClick = () => {
  playTone(800, 'sine', 0.05);
};

const speakWord = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    utterance.rate = 0.8; 
    window.speechSynthesis.speak(utterance);
  }
};

// --- Types ---
type GameMode = 'menu' | 'similar' | 'pictures' | 'missing' | 'closing' | 'opening' | 'speed';

interface HebrewGameProps {
  settings?: GameSettings;
}

export const HebrewGame: React.FC<HebrewGameProps> = ({ settings }) => {
  // Default fallback settings
  const activeSettings: GameSettings = settings || {
    allowedVowels: VOWELS.map(v => v.name),
    showMissingLetterHint: true,
    speedChallengeSeconds: 4,
    allowedCategories: ['animals', 'food', 'objects', 'transport', 'nature'],
    enableTTS: true,
    enableTTSOpening: true
  };

  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>('menu');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState<any>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [showFullWord, setShowFullWord] = useState<string | null>(null); // For closing letter mode
  const [timer, setTimer] = useState(0); // For speed mode
  const [gameFinished, setGameFinished] = useState(false);
  const [speedCount, setSpeedCount] = useState(0); // Count for speed mode (25 total)
  
  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (streak > 0 && streak % 5 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [streak]);

  // --- Filtered Data Helpers ---
  const getActiveVowels = () => {
    const filtered = VOWELS.filter(v => activeSettings.allowedVowels.includes(v.name));
    return filtered.length > 0 ? filtered : VOWELS; // Fallback if none selected
  };

  const getActiveGameData = () => {
    const filtered = GAME_DATA.filter(w => activeSettings.allowedCategories.includes(w.category));
    return filtered.length > 0 ? filtered : GAME_DATA; // Fallback
  };

  // --- Game Generators ---

  const generateSimilarVowel = () => {
    const activeVowels = getActiveVowels();
    // 1. Pick a random vowel from allowed list
    const vowel = activeVowels[Math.floor(Math.random() * activeVowels.length)];
    // 2. Pick target letter
    const targetLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    // 3. Create the Question Text
    const questionText = targetLetter + vowel.char;
    
    // 4. Generate Correct Answer (Different letter, same vowel)
    let correctLetter = targetLetter;
    while(correctLetter === targetLetter) {
        correctLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
    const correctAnswer = correctLetter + vowel.char;

    // 5. Generate Distractors (Random letters with DIFFERENT vowels)
    // IMPORTANT: Distractors can use any vowel to make it easier to distinguish, 
    // or strictly allowed ones. Let's allow ANY vowel for distractors to ensure contrast.
    const distractors = [];
    while (distractors.length < 3) {
        const randLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        const randVowel = VOWELS[Math.floor(Math.random() * VOWELS.length)];
        if (randVowel.name !== vowel.name) {
            distractors.push(randLetter + randVowel.char);
        }
    }

    return {
      type: 'similar',
      prompt: questionText,
      correct: correctAnswer,
      options: shuffle([correctAnswer, ...distractors]),
      instruction: 'מצאו את האות עם אותו הניקוד!'
    };
  };

  const generatePictureWord = () => {
    const activeData = getActiveGameData();
    const item = activeData[Math.floor(Math.random() * activeData.length)];
    
    // Distractors: 3 other emojis
    const distractors = [];
    while(distractors.length < 3) {
        // Distractors can come from full set to be more varied
        const d = GAME_DATA[Math.floor(Math.random() * GAME_DATA.length)];
        if (d.word !== item.word && !distractors.includes(d.emoji)) {
            distractors.push(d.emoji);
        }
    }

    return {
      type: 'pictures',
      prompt: item.word,
      correct: item.emoji,
      options: shuffle([item.emoji, ...distractors]),
      instruction: 'איזו תמונה מתאימה למילה?'
    };
  };

  const generateMissingLetter = () => {
    const activeData = getActiveGameData();
    const item = activeData[Math.floor(Math.random() * activeData.length)];
    const word = item.word;
    
    let missingChar = word[0];
    let displayWord = '_';
    
    const match = word.match(/^([\u05D0-\u05EA][\u05B0-\u05C2]*)/);
    if (match) {
        const fullFirstLetterGroup = match[0];
        missingChar = fullFirstLetterGroup;
        // Single underscore per specs
        displayWord = '_' + word.substring(fullFirstLetterGroup.length);
    } else {
        displayWord = '_' + word.substring(1);
    }

    const distractors = [];
    while(distractors.length < 3) {
        const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        // Use active vowels for distractors if possible to keep consistent style
        const activeVowels = getActiveVowels(); 
        const v = activeVowels[Math.floor(Math.random() * activeVowels.length)];
        const d = l + v.char;
        if (d !== missingChar) distractors.push(d);
    }

    return {
      type: 'missing',
      prompt: displayWord,
      correct: missingChar,
      options: shuffle([missingChar, ...distractors]),
      hint: activeSettings.showMissingLetterHint ? item.emoji : null,
      instruction: 'איזו אות חסרה בהתחלה?'
    };
  };

  const generateOpeningSound = () => {
    const activeData = getActiveGameData();
    const item = activeData[Math.floor(Math.random() * activeData.length)];
    
    // Logic: Identify the base letter of the first character
    // We treat the first character of the string as the base letter (assuming unicode structure is Base+Niqqud)
    const baseLetter = item.word.charAt(0);
    
    const distractors = [];
    while(distractors.length < 3) {
        const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        if (l !== baseLetter && !distractors.includes(l)) {
            distractors.push(l);
        }
    }

    return {
      type: 'opening',
      prompt: item.emoji,
      wordForAudio: item.word, // For TTS
      correct: baseLetter,
      fullWord: item.word, // For feedback
      options: shuffle([baseLetter, ...distractors]),
      instruction: 'באיזו אות מתחילה המילה?'
    };
  };

  const generateClosingSound = () => {
    const activeData = getActiveGameData();
    const item = activeData[Math.floor(Math.random() * activeData.length)];
    
    const match = item.word.match(/([\u05D0-\u05EA][\u05B0-\u05C2]*)$/);
    let lastGroup = match ? match[0] : item.word.slice(-1);
    
    const distractors = [];
    while(distractors.length < 3) {
        const fl = FINAL_LETTERS[Math.floor(Math.random() * FINAL_LETTERS.length)];
        if (fl !== lastGroup && !distractors.includes(fl)) distractors.push(fl);
    }
    while(distractors.length < 3) {
       const l = LETTERS[Math.floor(Math.random() * LETTERS.length)];
       distractors.push(l);
    }

    return {
      type: 'closing',
      prompt: item.emoji,
      wordForAudio: item.word, // For TTS
      correct: lastGroup,
      fullWord: item.word, // For feedback
      options: shuffle([lastGroup, ...distractors]),
      instruction: 'באיזו אות מסתיימת המילה?'
    };
  };

  const generateSpeedChallenge = () => {
    const activeData = getActiveGameData();
    const item = activeData[Math.floor(Math.random() * activeData.length)];
    
    const distractors = [];
    while(distractors.length < 2) {
        const d = activeData[Math.floor(Math.random() * activeData.length)];
        if (d.word !== item.word) distractors.push(d.word);
    }
    
    return {
      type: 'speed',
      prompt: item.emoji,
      correct: item.word,
      options: shuffle([item.word, ...distractors]),
      instruction: 'מהר! איזו מילה מתאימה?'
    };
  };

  const shuffle = (array: any[]) => {
    return array.sort(() => Math.random() - 0.5);
  };

  const loadQuestion = (currentMode: GameMode) => {
    setFeedback('none');
    setShowFullWord(null);
    let q;
    switch (currentMode) {
      case 'similar': q = generateSimilarVowel(); break;
      case 'pictures': q = generatePictureWord(); break;
      case 'missing': q = generateMissingLetter(); break;
      case 'opening': q = generateOpeningSound(); break;
      case 'closing': q = generateClosingSound(); break;
      case 'speed': q = generateSpeedChallenge(); break;
      default: return;
    }
    setQuestion(q);
    
    if (currentMode === 'speed') {
        setTimer(activeSettings.speedChallengeSeconds);
    }
  };

  // --- Game Loop ---

  useEffect(() => {
    if (mode === 'speed' && timer > 0 && !gameFinished) {
        const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    } else if (mode === 'speed' && timer === 0 && !gameFinished && feedback === 'none') {
        handleAnswer('TIMEOUT');
    }
  }, [timer, mode, gameFinished, feedback]);

  const handleStart = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setScore(0);
    setStreak(0);
    setGameFinished(false);
    setSpeedCount(0);
    loadQuestion(selectedMode);
  };

  const handleAnswer = (ans: string) => {
    if (feedback !== 'none') return; // Block input
    
    const isCorrect = ans === question.correct;
    
    if (isCorrect) {
      playWin();
      setFeedback('correct');
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      
      // Special logic for Opening/Closing Sound mode
      if (question.type === 'closing' || question.type === 'opening') {
          setShowFullWord(question.fullWord);
          
          const shouldSpeak = question.type === 'closing' ? activeSettings.enableTTS : activeSettings.enableTTSOpening;
          
          if (shouldSpeak) {
             speakWord(question.fullWord);
          }
      }
    } else {
      playLoss();
      setFeedback('wrong');
      setStreak(0);
    }

    // Delay for next question
    const delay = (question.type === 'closing' || question.type === 'opening') && isCorrect ? 4000 : (mode === 'speed' ? 1000 : 2000);
    
    setTimeout(() => {
        if (mode === 'speed') {
            const nextCount = speedCount + 1;
            setSpeedCount(nextCount);
            if (nextCount >= 25) {
                setGameFinished(true);
            } else {
                loadQuestion('speed');
            }
        } else {
            loadQuestion(mode);
        }
    }, delay);
  };

  const handleExit = () => {
      setMode('menu');
  };

  // --- Render Functions ---

  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center gap-6 p-4 animate-fade-in">
        <h1 className="text-4xl font-extrabold text-indigo-800 text-center mb-4">
            🏰 ממלכת המילים והתנועות
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            <MenuButton 
                onClick={() => handleStart('similar')} 
                color="bg-purple-100 border-purple-300 text-purple-800"
                icon="🎯"
                title="התנועה הדומה"
                desc="מצאו אותיות עם אותו ניקוד"
            />
            <MenuButton 
                onClick={() => handleStart('pictures')} 
                color="bg-blue-100 border-blue-300 text-blue-800"
                icon="🖼️"
                title="מילים ותמונות"
                desc="התאימו מילה לתמונה"
            />
            <MenuButton 
                onClick={() => handleStart('missing')} 
                color="bg-green-100 border-green-300 text-green-800"
                icon="🧩"
                title="השלמת מילים"
                desc="איזו אות חסרה?"
            />
            <MenuButton 
                onClick={() => handleStart('opening')} 
                color="bg-teal-100 border-teal-300 text-teal-800"
                icon="🔜"
                title="צליל פותח"
                desc="באיזו אות המילה מתחילה?"
            />
            <MenuButton 
                onClick={() => handleStart('closing')} 
                color="bg-orange-100 border-orange-300 text-orange-800"
                icon="🔚"
                title="צליל סוגר"
                desc="במה מסתיימת המילה?"
            />
             <MenuButton 
                onClick={() => handleStart('speed')} 
                color="bg-red-100 border-red-300 text-red-800"
                icon="⚡"
                title="אתגר המהירות"
                desc={`כמה תספיקו ב-${activeSettings.speedChallengeSeconds} שניות?`}
            />
        </div>
      </div>
    );
  }

  // End Screen for Speed Mode
  if (gameFinished) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in text-center p-8">
            <Confetti recycle={false} numberOfPieces={500} />
            <div className="text-8xl mb-6">{score >= 20 ? '👑' : '🎗️'}</div>
            <h2 className="text-4xl font-bold text-slate-800 mb-2">{score >= 20 ? 'אלופים!' : 'כל הכבוד!'}</h2>
            <p className="text-2xl text-slate-600 mb-8">
                עניתם נכון על <span className="font-bold text-indigo-600">{score}</span> מתוך 25
            </p>
            <Button size="xl" onClick={handleExit} variant="fun">חזרה לתפריט</Button>
        </div>
      );
  }

  // Game UI
  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col items-center min-h-[60vh]">
        {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
        
        {/* Top Bar */}
        <div className="w-full flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-b-4 border-slate-200 mb-8">
            <button onClick={handleExit} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
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

        {/* Speed Timer Bar */}
        {mode === 'speed' && (
            <div className="w-full h-4 bg-slate-200 rounded-full mb-8 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 linear ${timer <= 1 ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${(timer / activeSettings.speedChallengeSeconds) * 100}%` }}
                />
            </div>
        )}

        {/* Instruction */}
        <h2 className="text-xl md:text-2xl text-slate-600 mb-6 font-bold text-center">
            {question?.instruction}
        </h2>

        {/* Main Display Area */}
        <div className="bg-white p-12 rounded-3xl shadow-lg border-b-8 border-indigo-100 w-full text-center mb-8 relative">
            
            {/* Missing Letter Hint */}
            {mode === 'missing' && question?.hint && (
                <div className="mb-4 text-6xl animate-bounce-slow inline-block">
                    {question.hint}
                </div>
            )}
            
            {/* Closing/Opening Letter TTS Button */}
            {((mode === 'closing' && activeSettings.enableTTS) || (mode === 'opening' && activeSettings.enableTTSOpening)) && (
                <div className="absolute top-4 left-4">
                    <button 
                         onClick={() => speakWord(question.wordForAudio)}
                         className="p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
                    >
                        <Volume2 size={32} />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className={`text-6xl md:text-8xl font-bold text-slate-800 transition-transform duration-300 ${feedback === 'correct' ? 'scale-110 text-green-600' : feedback === 'wrong' ? 'animate-pulse text-red-500' : ''}`}>
                {mode === 'pictures' ? question.prompt : 
                 (mode === 'closing' || mode === 'opening') ? <span className="text-8xl">{question.prompt}</span> :
                 mode === 'speed' ? <span className="text-8xl">{question.prompt}</span> :
                 mode === 'missing' ? <span className="text-7xl tracking-widest">{question.prompt}</span> :
                 question.prompt
                }
            </div>

            {/* Feedback for Opening/Closing Sound: Show Full Word */}
            {(mode === 'closing' || mode === 'opening') && showFullWord && (
                <div className="mt-8 text-4xl font-bold animate-fade-in text-gray-400">
                    {mode === 'opening' ? (
                        <>
                             <span className="text-green-500 scale-125 inline-block mx-1">{question.correct}</span>
                             {showFullWord.substring(1)} 
                             {/* Note: substring(1) assumes correct letter is exactly 1 char. 
                                 It might be visually weird if word starts with niqqud, but data is 1st char = base letter. 
                             */}
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

        {/* Options Grid */}
        <div className={`grid gap-4 w-full ${mode === 'speed' ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
            {question?.options.map((opt: string, idx: number) => {
                const isSelected = false; // We use instant feedback
                let btnClass = "p-6 rounded-2xl text-4xl font-bold shadow-md border-b-4 transition-all hover:scale-105 active:scale-95 ";
                
                // Logic for color during feedback
                if (feedback === 'correct' && opt === question.correct) {
                    btnClass += "bg-green-500 border-green-700 text-white shadow-green-200";
                } else if (feedback === 'wrong' && opt !== question.correct) {
                     btnClass += "bg-white border-slate-200 text-slate-300"; // Fade others
                } else if (feedback === 'wrong') {
                     btnClass += "bg-red-500 border-red-700 text-white"; // Highlight clicked wrong (not tracked here but simple UX)
                } else {
                    btnClass += "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50";
                }

                return (
                    <button 
                        key={idx}
                        onClick={() => handleAnswer(opt)}
                        disabled={feedback !== 'none'}
                        className={btnClass}
                        onClickCapture={() => playClick()}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
        
        {mode === 'speed' && (
            <div className="mt-6 text-slate-400 font-bold">
                שאלה {speedCount + 1} מתוך 25
            </div>
        )}
    </div>
  );
};

// Simple Menu Card Component
const MenuButton = ({ onClick, color, icon, title, desc }: any) => (
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