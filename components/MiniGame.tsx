
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { CheckCircle2, XCircle, Award, Brain, Star, Loader2, RefreshCw } from 'lucide-react';

interface MiniGameProps {
  onEnd: (score: number) => void;
}

const HealthQuiz: React.FC<MiniGameProps> = ({ onEnd }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizSet, setQuizSet] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);

  const startQuiz = async () => {
    setLoading(true);
    try {
      const pool = await dbService.getQuizPool();
      if (pool.length === 0) {
        // Fallback if empty
        alert("ยังไม่มีคำถามในคลัง กรุณาแจ้งคุณครูนะจ๊ะ!");
        return;
      }
      
      // Shuffle and take 20
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      setQuizSet(shuffled.slice(0, 20));
      setCurrentIdx(0);
      setCorrectCount(0);
      setSelectedIdx(null);
      setIsAnswered(false);
      setIsPlaying(true);
      setShowResult(false);
    } catch (e) {
      console.error("Quiz start error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    setIsAnswered(true);
    
    // Check answer (stored as index 0-3 in DB)
    const correctAns = parseInt(quizSet[currentIdx].answer);
    if (idx === correctAns) {
      setCorrectCount(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentIdx < quizSet.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setSelectedIdx(null);
        setIsAnswered(false);
      } else {
        setShowResult(true);
      }
    }, 1200);
  };

  if (loading) return (
    <div className="w-full max-w-[600px] bg-white rounded-[3rem] p-20 text-center shadow-2xl flex flex-col items-center">
      <RefreshCw className="w-16 h-16 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-blue-600 uppercase tracking-widest">กำลังดึงข้อสอบสายฟ้าฟาด...</p>
    </div>
  );

  if (!isPlaying) {
    return (
      <div className="w-full max-w-[600px] bg-white rounded-[3rem] p-12 text-center shadow-2xl border-8 border-blue-50 flex flex-col items-center animate-in zoom-in">
        <div className="w-28 h-28 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-[2.5rem] flex items-center justify-center text-6xl mb-8 animate-bounce shadow-inner">
          🧠
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">ควิซสมองไว! ⚡</h2>
        <p className="text-slate-500 font-bold mb-10 leading-relaxed max-w-sm">
          ตอบคำถามสุขภาพจากคลังมหาสมบัติ <br />
          <span className="text-blue-500 bg-blue-50 px-4 py-1 rounded-full text-sm mt-2 inline-block">ตอบถูกรับข้อละ 5 EXP!</span>
        </p>
        <button 
          onClick={startQuiz}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-16 py-5 rounded-[2rem] shadow-xl shadow-blue-100 transition-all transform hover:scale-105 active:scale-95"
        >
          เริ่มประลองเลย! 🚀
        </button>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="w-full max-w-[600px] bg-white rounded-[3rem] p-12 text-center shadow-2xl border-8 border-emerald-50 animate-in zoom-in">
        <Award className="w-28 h-28 text-yellow-400 mx-auto mb-8 drop-shadow-lg" />
        <h2 className="text-4xl font-black text-slate-800 mb-4">เก่งมากฮีโร่!</h2>
        <div className="text-xl font-bold text-slate-500 mb-10">คุณตอบถูก {correctCount} จาก {quizSet.length} ข้อ</div>
        
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">แต้ม EXP</p>
            <p className="text-3xl font-black text-blue-600">+{correctCount * 5}</p>
          </div>
          <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">เหรียญทอง</p>
            <p className="text-3xl font-black text-amber-600">+{Math.floor(correctCount / 2)}</p>
          </div>
        </div>

        <button 
          onClick={() => onEnd(correctCount * 5)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-2 text-lg"
        >
          รับรางวัลและกลับหมู่บ้าน <Star fill="white" size={24} />
        </button>
      </div>
    );
  }

  const currentQ = quizSet[currentIdx];
  const progress = ((currentIdx + 1) / quizSet.length) * 100;
  const options = [currentQ.option1, currentQ.option2, currentQ.option3, currentQ.option4].filter(o => o);

  return (
    <div className="w-full max-w-[700px] bg-white rounded-[3.5rem] shadow-2xl border-8 border-white overflow-hidden flex flex-col min-h-[600px] relative">
      {/* Progress Bar Top */}
      <div className="w-full h-3 bg-slate-100 shrink-0 relative overflow-hidden">
        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Header */}
      <div className="px-10 py-6 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <Brain className="text-blue-500" />
          <span className="font-black text-slate-600">ข้อที่ {currentIdx + 1} / {quizSet.length}</span>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full font-black text-xs flex items-center gap-2">
          <CheckCircle2 size={14} /> ถูกแล้ว {correctCount}
        </div>
      </div>

      {/* Question Body */}
      <div className="flex-grow p-12 flex flex-col items-center">
        <div className="text-7xl mb-8 p-8 bg-blue-50 rounded-[3rem] shadow-inner group-hover:scale-110 transition-transform">
          {currentQ.icon || '❓'}
        </div>
        <h3 className="text-3xl font-black text-slate-800 text-center leading-tight mb-12">
          {currentQ.question}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {options.map((opt, i) => {
            let style = "bg-slate-50 border-4 border-transparent text-slate-700 hover:border-blue-400 hover:bg-white";
            const correctAns = parseInt(currentQ.answer);

            if (isAnswered) {
              if (i === correctAns) {
                style = "bg-emerald-50 border-emerald-500 text-emerald-700 scale-105 shadow-lg shadow-emerald-50";
              } else if (i === selectedIdx) {
                style = "bg-rose-50 border-rose-400 text-rose-700 opacity-80";
              } else {
                style = "bg-slate-50 border-transparent text-slate-300 opacity-40 grayscale";
              }
            }

            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => handleAnswer(i)}
                className={`flex items-center px-8 py-5 rounded-[2rem] font-black text-left transition-all relative ${style}`}
              >
                <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center mr-4 text-[10px] font-black shadow-sm text-slate-400">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-base flex-grow">{opt}</span>
                {isAnswered && i === correctAns && <CheckCircle2 className="ml-2 text-emerald-500" />}
                {isAnswered && i === selectedIdx && i !== correctAns && <XCircle className="ml-2 text-rose-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HealthQuiz;
