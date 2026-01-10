
import React, { useMemo, useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { getClassReport, generateQuizQuestions } from '../geminiService';
import { ShopReward, RedemptionRecord, HealthLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { Download, Users, Activity, TrendingUp, RefreshCw, ShoppingBag, Plus, Trash2, Check, Clock, X, Brain, AlertCircle, Eye, Info, Sparkles, Gift, Calendar, LayoutGrid, ListFilter, Shield, Settings, Database, MessageSquare, BookOpen, UploadCloud, Wand2, Search, BarChart3, ShieldCheck, Server, Edit2, Package } from 'lucide-react';
import Swal from 'sweetalert2';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'research' | 'shop' | 'quiz' | 'system'>('overview');
  const [allLogs, setAllLogs] = useState<HealthLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rewards, setRewards] = useState<ShopReward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [quizPool, setQuizPool] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  const [bulkInput, setBulkInput] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [searchQuiz, setSearchQuiz] = useState('');

  // Form State for Rewards
  const [rewardForm, setRewardForm] = useState<Partial<ShopReward>>({
    title: '', cost: 50, stock: 10, icon: '🎁', description: ''
  });
  const [isEditingReward, setIsEditingReward] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logs, users, shopItems, allRedemptions, questions] = await Promise.all([
        dbService.getAllHealthLogs(),
        dbService.getLeaderboard(),
        dbService.getShopRewards(),
        dbService.getRedemptions(),
        dbService.getQuizPool()
      ]);
      setAllLogs(logs);
      setLeaderboard(users);
      setRewards(shopItems);
      setRedemptions(allRedemptions);
      setQuizPool(questions);
    } catch (e) {
      console.error("Fetch admin data error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- AI & QUIZ FUNCTIONS (STABLE) ---
  const handleAIQuestionGenerate = async () => {
    if (!aiTopic.trim()) {
      Swal.fire('ระบุหัวข้อก่อนจ้า', 'คุณครูอยากให้ AI ช่วยออกข้อสอบเรื่องอะไรครับ?', 'info');
      return;
    }
    setGeneratingAI(true);
    try {
      const aiResponse = await generateQuizQuestions(aiTopic, 5);
      if (aiResponse) {
        setBulkInput(prev => prev + (prev ? '\n' : '') + aiResponse);
        Swal.fire({ title: 'AI ร่างข้อสอบสำเร็จ!', text: 'สร้างคำถามให้แล้ว 5 ข้อ ตรวจสอบได้ที่กล่อง Bulk Add', icon: 'success', toast: true, position: 'top-end', timer: 3000 });
      }
    } catch (e: any) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleBulkAddQuiz = async () => {
    const rawLines = bulkInput.trim().split('\n').filter(line => line.trim());
    if (rawLines.length === 0) return;
    const allQuestions = rawLines.map(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 6) return null;
      return { question: parts[0], option1: parts[1], option2: parts[2], option3: parts[3], option4: parts[4], answer: parseInt(parts[5]), icon: parts[6] || '❓' };
    }).filter(q => q !== null);

    setSyncing(true);
    const CHUNK_SIZE = 5;
    try {
      Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      for (let i = 0; i < allQuestions.length; i += CHUNK_SIZE) {
        await dbService.saveBulkQuiz(allQuestions.slice(i, i + CHUNK_SIZE));
      }
      Swal.fire('สำเร็จ!', 'บันทึกคำถามทั้งหมดเรียบร้อยแล้ว', 'success');
      setBulkInput('');
      fetchData();
    } catch (e: any) {
      Swal.fire('ล้มเหลว', e.message, 'error');
    } finally { setSyncing(false); }
  };

  // --- RESEARCH DATA LOGIC ---
  const sicknessAlerts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allLogs.filter(log => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      return logDate === todayStr && log.sickness && log.sickness.trim().length > 0;
    });
  }, [allLogs]);

  const researchStats = useMemo(() => {
    const bmiBins = { 'ผอม': 0, 'ปกติ': 0, 'ท้วม': 0, 'อ้วน': 0 };
    const moodCounts: Record<string, number> = { 'happy': 0, 'normal': 0, 'sad': 0, 'angry': 0 };
    
    allLogs.forEach(log => {
      const bmi = Number(log.bmi);
      if (bmi < 18.5) bmiBins['ผอม']++;
      else if (bmi < 23) bmiBins['ปกติ']++;
      else if (bmi < 25) bmiBins['ท้วม']++;
      else bmiBins['อ้วน']++;
      if (moodCounts[log.mood] !== undefined) moodCounts[log.mood]++;
    });

    const stepTrends = allLogs.slice(-30).map(l => ({
      date: new Date(l.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
      steps: Number(l.steps)
    }));

    return { 
      bmi: Object.entries(bmiBins).map(([name, value]) => ({ name, value })),
      mood: [
        { name: 'มีความสุข', value: moodCounts.happy, color: '#facc15' },
        { name: 'ปกติ', value: moodCounts.normal, color: '#60a5fa' },
        { name: 'เศร้า', value: moodCounts.sad, color: '#818cf8' },
        { name: 'หงุดหงิด', value: moodCounts.angry, color: '#f87171' }
      ],
      steps: stepTrends
    };
  }, [allLogs]);

  const filteredQuiz = useMemo(() => {
    if (!searchQuiz) return quizPool;
    const lowerSearch = searchQuiz.toLowerCase();
    return quizPool.filter(q => 
      q.question?.toLowerCase().includes(lowerSearch) ||
      q.option1?.toLowerCase().includes(lowerSearch) ||
      q.option2?.toLowerCase().includes(lowerSearch) ||
      q.option3?.toLowerCase().includes(lowerSearch) ||
      q.option4?.toLowerCase().includes(lowerSearch)
    );
  }, [quizPool, searchQuiz]);

  // --- SHOP MANAGEMENT FUNCTIONS ---
  const handleSaveReward = async () => {
    if (!rewardForm.title || !rewardForm.cost) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อและราคาของรางวัล', 'warning');
      return;
    }
    setSyncing(true);
    try {
      const res = await dbService.saveShopReward(rewardForm);
      if (res.success) {
        Swal.fire('สำเร็จ', res.message, 'success');
        setRewardForm({ title: '', cost: 50, stock: 10, icon: '🎁', description: '' });
        setIsEditingReward(false);
        fetchData();
      }
    } catch (e: any) {
      Swal.fire('ผิดพลาด', e.message, 'error');
    } finally { setSyncing(false); }
  };

  const handleEditReward = (reward: ShopReward) => {
    setRewardForm(reward);
    setIsEditingReward(true);
    // Scroll to top or to the form section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReward = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'ลบของรางวัล?',
      text: 'การกระทำนี้ไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    });
    if (confirm.isConfirmed) {
      setSyncing(true);
      try {
        await dbService.deleteShopReward(id);
        Swal.fire('ลบแล้ว', 'ลบของรางวัลออกจากระบบเรียบร้อย', 'success');
        fetchData();
      } catch (e: any) { Swal.fire('ผิดพลาด', e.message, 'error'); }
      finally { setSyncing(false); }
    }
  };

  const handleUpdateRedemptionStatus = async (id: string, status: 'completed' | 'pending') => {
    try {
      await dbService.updateRedemptionStatus(id, status);
      Swal.fire({ title: 'อัปเดตสถานะแล้ว', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      fetchData();
    } catch (e) { Swal.fire('ผิดพลาด', 'ไม่สามารถอัปเดตได้', 'error'); }
  };

  const handleDeleteQuiz = async (id: string) => {
    const confirm = await Swal.fire({ title: 'ลบคำถาม?', text: 'ไม่สามารถกู้คืนได้', icon: 'warning', showCancelButton: true });
    if (confirm.isConfirmed) {
      await dbService.deleteQuizQuestion(id);
      fetchData();
    }
  };

  // --- SYSTEM FUNCTIONS ---
  const handleSetupDatabase = async () => {
    const confirm = await Swal.fire({
      title: 'ตั้งค่าระบบใหม่?',
      text: 'ระบบจะทำการสร้าง Sheet ที่จำเป็นหากยังไม่มี (ข้อมูลเก่าจะไม่หาย)',
      icon: 'info',
      showCancelButton: true
    });
    if (confirm.isConfirmed) {
      setSyncing(true);
      try {
        await dbService.callJSONP('setupDatabase', {});
        Swal.fire('สำเร็จ', 'ระบบฐานข้อมูลพร้อมใช้งาน!', 'success');
      } catch (e: any) { Swal.fire('ผิดพลาด', e.message, 'error'); }
      finally { setSyncing(false); }
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const report = await getClassReport(allLogs, leaderboard.length);
      Swal.fire({ title: 'รายงาน AI', html: `<div class="text-left text-sm font-medium leading-relaxed">${report.replace(/\n/g, '<br/>')}</div>`, icon: 'info' });
    } catch (e) { Swal.fire('ล้มเหลว', 'AI ไม่ว่างในขณะนี้', 'error'); }
    finally { setAnalyzing(false); }
  };

  const handleBroadcast = async () => {
    const { value: v } = await Swal.fire({
      title: 'แจกรางวัลทั้งห้อง 🎁',
      html: '<input id="exp" type="number" placeholder="EXP" class="swal2-input" value="100"><input id="coin" type="number" placeholder="เหรียญ" class="swal2-input" value="20">',
      preConfirm: () => ({ exp: (document.getElementById('exp') as HTMLInputElement).value, coin: (document.getElementById('coin') as HTMLInputElement).value })
    });
    if (v) {
      setSyncing(true);
      await dbService.broadcastReward(Number(v.exp), Number(v.coin));
      Swal.fire('แจกแล้ว!', 'นักเรียนทุกคนได้รับรางวัล', 'success');
      setSyncing(false);
      fetchData();
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <RefreshCw className="animate-spin text-blue-500" size={64} />
      <p className="font-black text-blue-600 animate-pulse uppercase text-sm">กำลังโหลดศูนย์ควบคุม...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      {/* Header Bento */}
      <header className="bg-white rounded-[3.5rem] p-10 shadow-xl border-8 border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full opacity-20 -mr-20 -mt-20 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Shield size={24} /></div>
             <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Administrator</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">KidsHealthyMe Command</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">Research & Gamification Hub</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 relative z-10">
           <button onClick={handleBroadcast} className="bg-amber-400 text-white font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 shadow-lg hover:translate-y-[-2px] transition-all active:scale-95">
             <Gift size={20} /> แจกรางวัลทั้งชั้น
           </button>
           <button onClick={handleAIAnalysis} disabled={analyzing} className="bg-blue-600 text-white font-black px-8 py-4 rounded-[2rem] flex items-center gap-2 shadow-lg hover:translate-y-[-2px] transition-all active:scale-95 disabled:opacity-50">
             {analyzing ? <RefreshCw className="animate-spin" size={20} /> : <Brain size={20} />} AI วิเคราะห์ชั้นเรียน
           </button>
        </div>
      </header>

      {/* Modern Tabs */}
      <div className="flex flex-wrap gap-2 bg-white/60 backdrop-blur-md p-2 rounded-[2.5rem] w-fit mx-auto shadow-sm border border-white">
        {(['overview', 'research', 'shop', 'quiz', 'system'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-10 py-3.5 rounded-[1.8rem] text-sm font-black transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
           <div className="bg-white p-8 rounded-[3rem] shadow-lg border border-slate-50 flex flex-col justify-between hover:border-blue-200 transition-colors group">
              <Users className="text-blue-500 mb-6 group-hover:scale-110 transition-transform" size={32}/>
              <div><p className="text-xs font-black text-slate-400 uppercase">นักเรียน</p><p className="text-4xl font-black text-slate-800">{leaderboard.length} คน</p></div>
           </div>
           <div className="bg-white p-8 rounded-[3rem] shadow-lg border border-slate-50 flex flex-col justify-between hover:border-rose-200 transition-colors group">
              <Activity className="text-rose-500 mb-6 group-hover:scale-110 transition-transform" size={32}/>
              <div><p className="text-xs font-black text-slate-400 uppercase">บันทึกสะสม</p><p className="text-4xl font-black text-slate-800">{allLogs.length} ครั้ง</p></div>
           </div>
           <div className="bg-white p-8 rounded-[3rem] shadow-lg border border-slate-50 flex flex-col justify-between hover:border-amber-200 transition-colors group">
              <ShoppingBag className="text-amber-500 mb-6 group-hover:scale-110 transition-transform" size={32}/>
              <div><p className="text-xs font-black text-slate-400 uppercase">รอรับของ</p><p className="text-4xl font-black text-amber-500">{redemptions.filter(r => r.status === 'pending').length}</p></div>
           </div>
           <div className={`p-8 rounded-[3rem] shadow-lg border transition-all ${sicknessAlerts.length > 0 ? 'bg-red-500 text-white' : 'bg-white text-slate-800'}`}>
              <AlertCircle className={`mb-6 ${sicknessAlerts.length > 0 ? 'text-white animate-pulse' : 'text-slate-300'}`} size={32}/>
              <div><p className="text-xs font-black uppercase">แจ้งป่วยวันนี้</p><p className="text-4xl font-black">{sicknessAlerts.length} คน</p></div>
           </div>

           <div className="lg:col-span-4 bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-50">
              <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><TrendingUp className="text-emerald-500" /> นักเรียนที่มีเลเวลสูงสุด (Top 10)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                 {leaderboard.map((u, i) => (
                   <div key={i} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-200 transition-all flex flex-col items-center">
                      <div className="text-3xl mb-3">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</div>
                      <div className="font-black text-slate-800 text-center truncate w-full">{u.fullname}</div>
                      <div className="text-xs font-bold text-blue-500">Level {u.level}</div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'research' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
                <h3 className="text-2xl font-black mb-8 text-slate-800 flex items-center gap-2"><BarChart3 className="text-blue-500" /> BMI Distribution</h3>
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={researchStats.bmi}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                           {researchStats.bmi.map((e, i) => <Cell key={i} fill={['#60a5fa', '#10b981', '#f59e0b', '#ef4444'][i % 4]}/>)}
                        </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>
             </section>

             <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
                <h3 className="text-2xl font-black mb-8 text-slate-800 flex items-center gap-2"><MessageSquare className="text-amber-500" /> Mood Overview</h3>
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={researchStats.mood} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                         {researchStats.mood.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                       </Pie>
                       <Tooltip />
                     </PieChart>
                   </ResponsiveContainer>
                </div>
             </section>
          </div>

          <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
            <h3 className="text-2xl font-black mb-8 text-slate-800 flex items-center gap-2"><Activity className="text-emerald-500" /> Activity Trend (Recent Logs)</h3>
            <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={researchStats.steps}>
                    <defs>
                      <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="steps" stroke="#10b981" fillOpacity={1} fill="url(#colorSteps)" strokeWidth={4} />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-6 duration-500">
           <div className="lg:col-span-2 space-y-8">
              {/* List of Pending Redemptions */}
              <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
                 <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Clock className="text-amber-500" /> คำขอแลกของรางวัลล่าสุด</h3>
                 <div className="space-y-4">
                    {redemptions.map(r => (
                       <div key={r.id} className="bg-slate-50 p-6 rounded-[2rem] flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black ${r.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                {r.status === 'completed' ? <Check size={20}/> : <Clock size={20}/>}
                             </div>
                             <div>
                                <p className="font-black text-slate-700">Code: {r.code}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  โดย {leaderboard.find(u => u.user_id === r.user_id)?.fullname || 'ไม่ทราบชื่อ'} | 
                                  ของรางวัล: {rewards.find(reward => reward.id === r.reward_id)?.title || 'ไม่พบรายการ'}
                                </p>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             {r.status === 'pending' && (
                               <button onClick={() => handleUpdateRedemptionStatus(r.id, 'completed')} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-black shadow-md hover:bg-emerald-600">อนุมัติ</button>
                             )}
                             <button className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                          </div>
                       </div>
                    ))}
                    {redemptions.length === 0 && <p className="text-center py-10 italic text-slate-300 font-bold">ยังไม่มีรายการแลกของ</p>}
                 </div>
              </section>

              {/* List of Existing Rewards */}
              <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><Package className="text-blue-500" /> รายการของรางวัลในคลัง</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewards.map(reward => (
                    <div key={reward.id} className="bg-slate-50 p-5 rounded-[2rem] border-2 border-transparent hover:border-blue-100 transition-all flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{reward.icon}</div>
                        <div>
                          <p className="font-black text-slate-700">{reward.title}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">{reward.cost} Coins</span>
                            <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full uppercase">Stock: {reward.stock}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditReward(reward)} className="p-2 bg-white text-blue-500 rounded-xl shadow-sm hover:bg-blue-50"><Edit2 size={14}/></button>
                        <button onClick={() => handleDeleteReward(reward.id)} className="p-2 bg-white text-red-500 rounded-xl shadow-sm hover:bg-red-50"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
           </div>
           
           <div className="space-y-8">
              {/* Add/Edit Reward Form */}
              <section className="bg-white p-8 rounded-[3.5rem] shadow-xl border-4 border-amber-50 sticky top-24">
                 <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-amber-600">
                   {isEditingReward ? <Edit2 size={20} /> : <Plus size={20} />} 
                   {isEditingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}
                 </h3>
                 <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ชื่อของรางวัล</label>
                      <input 
                        type="text" 
                        placeholder="เช่น ตุ๊กตาหมี, สติ๊กเกอร์..." 
                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                        value={rewardForm.title}
                        onChange={(e) => setRewardForm({...rewardForm, title: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ราคา (เหรียญ)</label>
                        <input 
                          type="number" 
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                          value={rewardForm.cost}
                          onChange={(e) => setRewardForm({...rewardForm, cost: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">จำนวนสต็อก</label>
                        <input 
                          type="number" 
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                          value={rewardForm.stock}
                          onChange={(e) => setRewardForm({...rewardForm, stock: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <div className="col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ไอคอน</label>
                        <input 
                          type="text" 
                          className="w-full px-2 py-4 bg-slate-50 rounded-2xl border-none text-center outline-none font-bold text-lg"
                          value={rewardForm.icon}
                          onChange={(e) => setRewardForm({...rewardForm, icon: e.target.value})}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">คำอธิบาย</label>
                        <input 
                          type="text" 
                          placeholder="รายละเอียดของรางวัล..."
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
                          value={rewardForm.description}
                          onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      {isEditingReward && (
                        <button 
                          onClick={() => { setRewardForm({title: '', cost: 50, stock: 10, icon: '🎁', description: ''}); setIsEditingReward(false); }}
                          className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm"
                        >ยกเลิก</button>
                      )}
                      <button 
                        onClick={handleSaveReward} 
                        disabled={syncing}
                        className={`flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-100 flex items-center justify-center gap-2 ${syncing ? 'opacity-50' : 'hover:brightness-110'}`}
                      >
                        {syncing ? <RefreshCw className="animate-spin" /> : (isEditingReward ? <Check /> : <SaveIcon />)}
                        {isEditingReward ? 'บันทึกการแก้ไข' : 'เพิ่มลงคลัง'}
                      </button>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-6 duration-500">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-gradient-to-br from-indigo-700 to-blue-800 p-10 rounded-[3.5rem] shadow-xl text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-10"><Wand2 size={120} /></div>
                 <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-4 flex items-center gap-3"><Brain /> AI Quiz Architect</h3>
                    <div className="flex gap-3">
                       <input 
                          type="text" placeholder="หัวข้อที่คุณครูต้องการ..."
                          className="flex-grow bg-white/10 border border-white/20 rounded-2xl px-6 py-4 outline-none font-bold text-white shadow-inner"
                          value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                       />
                       <button onClick={handleAIQuestionGenerate} disabled={generatingAI} className="bg-white text-indigo-700 font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2">
                          {generatingAI ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} ร่างข้อสอบ
                       </button>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><BookOpen className="text-blue-500" /> คลังคำถาม ({quizPool.length})</h3>
                    <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input type="text" placeholder="ค้นหา..." className="pl-12 pr-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-sm" value={searchQuiz} onChange={(e) => setSearchQuiz(e.target.value)}/></div>
                 </div>
                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                    {filteredQuiz.map((q, idx) => (
                       <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                             <div className="text-3xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">{q.icon}</div>
                             <div><p className="font-bold text-slate-700">{q.question}</p><p className="text-[10px] font-black text-emerald-500 uppercase">Ans: {q['option' + (parseInt(q.answer) + 1)]}</p></div>
                          </div>
                          <button onClick={() => handleDeleteQuiz(q.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={20}/></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3.5rem] shadow-xl border-4 border-blue-50 flex flex-col h-fit">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6"><UploadCloud className="text-blue-500" /> Bulk Add (Chunking)</h3>
              <textarea 
                 className="w-full h-80 p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-blue-300 outline-none font-bold text-sm resize-none shadow-inner"
                 placeholder="คำถาม | ต1 | ต2 | ต3 | ต4 | คำตอบ(0-3) | ไอคอน"
                 value={bulkInput} onChange={(e) => setBulkInput(e.target.value)}
              />
              <button onClick={handleBulkAddQuiz} disabled={syncing || !bulkInput.trim()} className="w-full mt-6 py-5 bg-blue-600 text-white rounded-[2.5rem] font-black text-sm shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                 {syncing ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />} บันทึกลง Sheet
              </button>
           </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
           <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
              <h3 className="text-2xl font-black mb-8 text-slate-800 flex items-center gap-2"><Database className="text-blue-500" /> Database Management</h3>
              <div className="space-y-6">
                 <div className="p-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100">
                    <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Spreadsheet ID</p>
                    <code className="text-[11px] font-mono font-black text-blue-700 block break-all bg-white p-4 rounded-xl shadow-inner border border-blue-100">{dbService.getSpreadsheetId()}</code>
                 </div>
                 <div className="flex flex-col gap-4">
                    <button onClick={handleSetupDatabase} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all">
                       <ShieldCheck size={24} /> Initialize / Fix Database
                    </button>
                    <button onClick={() => window.open(dbService.getWebAppUrl(), '_blank')} className="w-full py-5 bg-white border-4 border-slate-100 text-slate-400 rounded-[2rem] font-black shadow-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
                       <Eye size={24} /> Open GAS Console
                    </button>
                 </div>
              </div>
           </section>

           <section className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50">
              <h3 className="text-2xl font-black mb-8 text-slate-800 flex items-center gap-2"><Server className="text-emerald-500" /> Server Health</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                    <span className="font-bold text-slate-600">Connection Status</span>
                    <span className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-xs font-black uppercase">Online</span>
                 </div>
                 <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                    <span className="font-bold text-slate-600">API Key Configured</span>
                    <span className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-xs font-black uppercase">True</span>
                 </div>
                 <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl">
                    <span className="font-bold text-slate-600">Total Records</span>
                    <span className="font-black text-slate-800 text-xl">{allLogs.length}</span>
                 </div>
                 <div className="p-8 mt-4 bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-200">
                    <div className="flex items-center gap-3 text-amber-700 font-black mb-2"><Info size={20} /> ระบบจัดการนักวิจัย</div>
                    <p className="text-xs text-amber-600 leading-relaxed font-medium">คุณครูสามารถส่งลิงก์หน้า Admin นี้ให้กับนักวิจัยภายนอกเพื่อตรวจสอบพฤติกรรมสุขภาพของนักเรียนได้ โดยสิทธิ์การจัดการ (ลบ/แก้ไข) จะจำกัดเฉพาะแอดมินเท่านั้น</p>
                 </div>
              </div>
           </section>
        </div>
      )}
    </div>
  );
};

// Helper Icon components
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);

export default AdminDashboard;
