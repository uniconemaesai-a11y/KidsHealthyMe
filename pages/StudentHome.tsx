
import React, { useState, useEffect } from 'react';
import { User, AvatarData, HealthLog, Item, UserItem, ShopReward, RedemptionRecord, SocialAction } from '../types';
import { dbService } from '../services/dbService';
import { getAICoachFeedback } from '../geminiService';
import { ITEMS_SHOP, EMOJI_POOL, ENCOURAGING_STICKERS } from '../constants';
import { Zap, Coins, Plus, Box as BoxIcon, CheckCircle, Brain, Briefcase, Flame, ShoppingCart, Sparkles, X, User as UserIcon, MessageCircle, RefreshCw, Gift, Users, Heart, Send, Search } from 'lucide-react';
import HealthLogForm from '../components/HealthLogForm';
import HealthQuiz from '../components/MiniGame';
import Leaderboard from '../components/Leaderboard';
import Swal from 'sweetalert2';

interface StudentHomeProps {
  user: User;
}

const StudentHome: React.FC<StudentHomeProps> = ({ user }) => {
  const [avatar, setAvatar] = useState<AvatarData | null>(null);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showBox, setShowBox] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  
  const [rewards, setRewards] = useState<ShopReward[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<RedemptionRecord[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [socialActions, setSocialActions] = useState<SocialAction[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [savingHealth, setSavingHealth] = useState(false);
  const [isAlreadyLogged, setIsAlreadyLogged] = useState(false);
  const [isBoxAlreadyOpened, setIsBoxAlreadyOpened] = useState(false);
  const [userLogs, setUserLogs] = useState<HealthLog[]>([]);
  const [todayLog, setTodayLog] = useState<HealthLog | null>(null);
  const [openingBox, setOpeningBox] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [wonItem, setWonItem] = useState<Item | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refreshData();
  }, [user.id]);

  const refreshData = async () => {
    setLoadingData(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [avatarData, allLogs, boxLogs, items, shopItems, userClaims, friendsList, actions, allUsers] = await Promise.all([
        dbService.getAvatar(user.id),
        dbService.getAllHealthLogs(),
        dbService.getBoxLogs(user.id),
        dbService.getUserItems(user.id),
        dbService.getShopRewards(),
        dbService.getRedemptions(user.id),
        dbService.getFriends(user.id),
        dbService.getSocialActions(user.id),
        dbService.getLeaderboard(user.class)
      ]);
      
      setAvatar(avatarData);
      setUserItems(items);
      setRewards(shopItems);
      setMyRedemptions(userClaims);
      setFriends(friendsList);
      setSocialActions(actions);
      setAllStudents(allUsers.filter(u => u.user_id !== user.id));
      
      const myLogs = allLogs.filter((l: any) => l.user_id === user.id);
      setUserLogs(myLogs);
      
      const foundTodayLog = myLogs.find((l: any) => 
        new Date(l.date).toISOString().split('T')[0] === todayStr
      );
      setTodayLog(foundTodayLog || null);
      setIsAlreadyLogged(!!foundTodayLog);

      const hasTodayBox = boxLogs.some((l: any) => 
        new Date(l[2]).toISOString().split('T')[0] === todayStr
      );
      setIsBoxAlreadyOpened(hasTodayBox);

      fetchAiInsight(foundTodayLog || null, myLogs, avatarData?.level || 1);
    } catch (e) {
      console.error("Refresh data error", e);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAiInsight = async (current: HealthLog | null, history: HealthLog[], level: number) => {
    setLoadingInsight(true);
    try {
      const feedback = await getAICoachFeedback(current, history, level, user.fullname);
      setAiInsight(feedback);
    } catch (e) {
      setAiInsight("ยินดีต้อนรับกลับมาครับฮีโร่! มาเริ่มบันทึกสุขภาพกันเถอะ ✨");
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleHealthSave = async (log: any) => {
    setSavingHealth(true);
    try {
      const result = await dbService.saveHealthLog(log);
      if (!result.success) {
        Swal.fire({ title: 'โอ๊ะ!', text: result.message, icon: 'info' });
        setShowForm(false);
        return;
      }
      setShowForm(false);
      Swal.fire({ title: 'สำเร็จ!', text: `บันทึกข้อมูลแล้ว ได้รับ EXP และเหรียญ!`, icon: 'success', timer: 3000 });
      await refreshData();
    } catch (err: any) {
      Swal.fire({ title: 'ผิดพลาด', text: err.message, icon: 'error' });
    } finally {
      setSavingHealth(false);
    }
  };

  const handleOpenMysteryBox = async () => {
    if (openingBox || isBoxAlreadyOpened) return;
    if ((avatar?.coin || 0) < 20) {
      Swal.fire('เหรียญไม่พอ!', 'ต้องใช้ 20 เหรียญในการเปิดกล่องสุ่มนะจ๊ะ', 'warning');
      return;
    }

    setOpeningBox(true);
    setWonItem(null);

    setTimeout(async () => {
      try {
        const randomItem = ITEMS_SHOP[Math.floor(Math.random() * ITEMS_SHOP.length)];
        const res = await dbService.openMysteryBox(user.id, randomItem.id);
        if (res.success) {
          setWonItem(randomItem);
          await refreshData();
        }
      } catch (e) {
        Swal.fire('โอ๊ะ!', 'กล่องสมบัติล็อคแน่นเกินไป ลองใหม่อีกครั้งนะ', 'error');
        setShowBox(false);
      } finally {
        setOpeningBox(false);
      }
    }, 2000);
  };

  const handleEquip = async (itemId: string) => {
    const isCurrentlyEquipped = avatar?.equipped_item_id === String(itemId);
    const res = await dbService.equipItem(user.id, isCurrentlyEquipped ? '' : itemId);
    if (res.success) {
      Swal.fire({ title: 'สำเร็จ!', text: isCurrentlyEquipped ? 'ถอดแล้ว' : 'สวมใส่แล้ว', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      await refreshData();
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      const res = await dbService.addFriend(user.id, friendId);
      if (res.success) {
        Swal.fire({ title: 'เพิ่มเพื่อนแล้ว!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        await refreshData();
      }
    } catch (e) {}
  };

  const handleSendSticker = async (friendId: string, sticker: any) => {
    try {
      const res = await dbService.sendSocialAction({
        from_user_id: user.id,
        to_user_id: friendId,
        action_type: 'sticker',
        content: JSON.stringify(sticker)
      });
      if (res.success) {
        Swal.fire({ title: 'ส่งพลังบวกเรียบร้อย!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      }
    } catch (e) {}
  };

  const handleMarkAsRead = async () => {
    if (socialActions.filter(a => !a.is_read).length > 0) {
      await dbService.markActionsAsRead(user.id);
      setSocialActions(prev => prev.map(a => ({...a, is_read: true})));
    }
  };

  // --- Fix: Implement missing handleChangeBaseEmoji ---
  const handleChangeBaseEmoji = async (emoji: string) => {
    try {
      const res = await dbService.updateBaseEmoji(user.id, emoji);
      if (res.success) {
        setShowEmojiPicker(false);
        Swal.fire({ 
          title: 'สำเร็จ!', 
          text: 'เปลี่ยนตัวละครแล้ว', 
          icon: 'success', 
          toast: true, 
          position: 'top-end', 
          timer: 2000, 
          showConfirmButton: false 
        });
        await refreshData();
      }
    } catch (e: any) {
      Swal.fire('ผิดพลาด', e.message, 'error');
    }
  };

  // --- Fix: Implement missing handleRedeem ---
  const handleRedeem = async (reward: ShopReward) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการแลก?',
      text: `ใช้ ${reward.cost} เหรียญเพื่อแลก ${reward.title}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'แลกเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await dbService.redeemReward(user.id, reward.id, reward.cost);
        if (res.success) {
          Swal.fire({
            title: 'แลกสำเร็จ!',
            html: `ได้รหัสรางวัลคือ: <b class="text-2xl text-blue-600">${res.code}</b><br/>โปรดแจ้งรหัสนี้กับคุณครูเพื่อรับของรางวัล`,
            icon: 'success'
          });
          await refreshData();
        }
      } catch (e: any) {
        Swal.fire('ผิดพลาด', e.message, 'error');
      }
    }
  };

  const equippedItem = ITEMS_SHOP.find(i => String(i.id) === String(avatar?.equipped_item_id));
  const expPercentage = avatar ? (avatar.exp / (avatar.level * 100)) * 100 : 0;
  const unreadCount = socialActions.filter(a => !a.is_read).length;

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      {/* Profile Section */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={160} /></div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <button onClick={() => setShowEmojiPicker(true)} className="w-32 h-32 bg-gradient-to-tr from-yellow-100 to-orange-200 rounded-[2.5rem] flex items-center justify-center text-6xl border-4 border-white shadow-xl transform transition-all hover:scale-105 active:scale-95 relative overflow-hidden">
               <span className={`${equippedItem ? 'opacity-30 scale-75 translate-y-3' : 'opacity-100'}`}>{avatar?.base_emoji || '🧑‍🚀'}</span>
               {equippedItem && <span className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce" style={{ animationDuration: '3s' }}>{equippedItem.image}</span>}
               <div className="absolute inset-0 bg-black/0 hover:bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-all"><UserIcon className="text-white" size={32} /></div>
            </button>
            {avatar?.streak_count && avatar.streak_count > 0 && <div className="absolute -top-2 -left-2 bg-orange-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-black border-2 border-white shadow-lg animate-bounce"><Flame size={14} fill="white" /> {avatar.streak_count} วันติด!</div>}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black border-4 border-white text-sm shadow-lg">{avatar?.level}</div>
          </div>
          <div className="flex-grow w-full text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">ฮีโร่ {user.fullname}</h2>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-6">
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Class {user.class}</span>
              <div className="bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-widest"><Coins size={12} /> {avatar?.coin}</div>
              {equippedItem && <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full flex items-center gap-1 text-[10px] font-black uppercase animate-pulse"><Sparkles size={12} /> {equippedItem.effect}</div>}
            </div>
            <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-black text-blue-900/40 uppercase tracking-widest px-1"><span>LV.{avatar?.level} EXP</span><span>{avatar?.exp} / {avatar?.level ? avatar.level * 100 : 100}</span></div>
               <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${expPercentage}%` }}></div></div>
            </div>
          </div>
          
          <button 
            onClick={() => { setShowFriends(true); handleMarkAsRead(); }} 
            className="relative bg-white shadow-lg p-4 rounded-3xl border-2 border-slate-50 hover:bg-slate-50 transition-all active:scale-90"
          >
            <Users className="text-blue-500" size={28} />
            {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-bounce">{unreadCount}</span>}
          </button>
        </div>
      </section>

      {/* Social Notifications Banner */}
      {unreadCount > 0 && (
        <section className="bg-indigo-600 rounded-[2rem] p-4 text-white flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">✨</div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest">ข่าวสารใหม่!</p>
                <p className="text-sm font-bold opacity-90">มีเพื่อนส่งพลังบวกมาให้คุณ {unreadCount} ข้อความ</p>
             </div>
          </div>
          <button onClick={() => { setShowFriends(true); handleMarkAsRead(); }} className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">เปิดดู</button>
        </section>
      )}

      {/* AI Coach Bento */}
      <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2.5rem] p-8 shadow-inner border border-blue-100 relative overflow-hidden">
         <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12"><MessageCircle size={160} /></div>
         <div className="flex items-start gap-4 relative z-10">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-md shrink-0 animate-bounce" style={{animationDuration: '4s'}}>🤖</div>
            <div className="space-y-2">
               <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">โค้ช AI วิเคราะห์วันนี้</h3>
               {loadingInsight ? <div className="space-y-2"><div className="h-4 bg-indigo-100 rounded-full w-3/4 animate-pulse"></div><div className="h-4 bg-indigo-100 rounded-full w-full animate-pulse"></div></div> : <p className="text-slate-700 font-medium italic leading-relaxed">"{aiInsight || "ยินดีต้อนรับกลับมา! มาบันทึกสุขภาพกันเถอะ ✨"}"</p>}
            </div>
         </div>
      </section>

      {/* Main Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <button onClick={() => !isAlreadyLogged && setShowForm(true)} disabled={isAlreadyLogged} className={`${isAlreadyLogged ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 cursor-default' : 'bg-blue-500 text-white shadow-xl'} p-6 rounded-[2.5rem] transition-all flex flex-col items-center gap-2 group active:scale-95`}>
          <div className={`p-4 ${isAlreadyLogged ? 'bg-emerald-100' : 'bg-white/20'} rounded-2xl group-hover:scale-110 transition-transform`}>{isAlreadyLogged ? <CheckCircle size={32} /> : <Plus size={32} strokeWidth={3} />}</div>
          <span className="font-black text-sm">{isAlreadyLogged ? 'บันทึกแล้ว' : 'บันทึกสุขภาพ'}</span>
        </button>
        <button onClick={() => setShowGame(true)} className="bg-purple-500 p-6 rounded-[2.5rem] shadow-xl transition-all flex flex-col items-center gap-2 text-white group active:scale-95"><div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><Brain size={32} /></div><span className="font-black text-sm">ควิซสมองไว</span></button>
        <button onClick={() => setShowShop(true)} className="bg-amber-500 p-6 rounded-[2.5rem] shadow-xl transition-all flex flex-col items-center gap-2 text-white group active:scale-95"><div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><ShoppingCart size={32} /></div><span className="font-black text-sm">Hero Shop</span></button>
        <button onClick={() => setShowBox(true)} disabled={isBoxAlreadyOpened} className={`${isBoxAlreadyOpened ? 'bg-orange-300 opacity-60 cursor-default' : 'bg-orange-500 shadow-xl'} p-6 rounded-[2.5rem] transition-all flex flex-col items-center gap-2 text-white group active:scale-95`}><div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><BoxIcon size={32} /></div><span className="font-black text-sm">{isBoxAlreadyOpened ? 'เปิดแล้ววันนี้' : 'Mystery Box'}</span></button>
        <button onClick={() => setShowBackpack(true)} className="bg-indigo-500 p-6 rounded-[2.5rem] shadow-xl transition-all flex flex-col items-center gap-2 text-white group active:scale-95"><div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform relative"><Briefcase size={32} />{userItems.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">{userItems.length}</span>}</div><span className="font-black text-sm">กระเป๋าไอเทม</span></button>
      </div>

      <Leaderboard className={user.class} currentUserId={user.id} />

      {/* Friends Hub Modal - NEW FEATURE */}
      {showFriends && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-8 border-white animate-in zoom-in duration-300 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-blue-50">
                 <div>
                    <h3 className="text-2xl font-black flex items-center gap-2"><Users className="text-blue-500" /> Friends Hub</h3>
                    <p className="text-xs font-bold text-slate-400">ส่งต่อพลังใจให้เพื่อนๆ ในหมู่บ้าน</p>
                 </div>
                 <button onClick={() => setShowFriends(false)} className="p-3 text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              
              <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
                 {/* Friends List */}
                 <div className="md:w-1/2 border-r overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">เพื่อนของคุณ</h4>
                    {friends.length > 0 ? friends.map(f => (
                      <div key={f.user_id} className="p-4 bg-slate-50 rounded-[2rem] flex items-center gap-4 group hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-100">
                         <div className="text-3xl bg-white p-2 rounded-2xl shadow-sm">{f.base_emoji}</div>
                         <div className="flex-grow">
                            <p className="font-black text-slate-700 text-sm truncate">{f.fullname}</p>
                            <p className="text-[10px] font-black text-blue-500">Level {f.level}</p>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                Swal.fire({
                                  title: `ส่งใจให้ ${f.fullname}`,
                                  html: `<div class="grid grid-cols-4 gap-4 p-4">${ENCOURAGING_STICKERS.map(s => `<button onclick="window.sendSticker('${f.user_id}', '${s.id}')" class="text-4xl p-2 hover:scale-110 transition-transform">${s.emoji}</button>`).join('')}</div>`,
                                  showConfirmButton: false,
                                  didOpen: () => {
                                    (window as any).sendSticker = (fid: string, sid: string) => {
                                      const sticker = ENCOURAGING_STICKERS.find(s => s.id === sid);
                                      handleSendSticker(fid, sticker);
                                      Swal.close();
                                    };
                                  }
                                });
                              }}
                              className="p-2 bg-white text-rose-500 rounded-xl shadow-sm hover:bg-rose-50"
                            >
                              <Heart size={16} fill="currentColor" />
                            </button>
                         </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center opacity-30 italic font-bold">ยังไม่มีเพื่อนเบย...</div>
                    )}
                 </div>

                 {/* Notifications & Search */}
                 <div className="md:w-1/2 flex flex-col bg-slate-50/50">
                    <div className="p-6 border-b bg-white">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ค้นหาฮีโร่ใหม่</h4>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            type="text" 
                            placeholder="ค้นหาชื่อเพื่อน..." 
                            className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-blue-400 outline-none font-bold text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                       </div>
                       
                       {searchQuery.trim() && (
                         <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {allStudents.filter(s => s.fullname.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                              <div key={s.user_id} className="p-3 bg-white rounded-xl flex justify-between items-center shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
                                 <div className="flex items-center gap-3">
                                    <span className="text-xl">{s.base_emoji}</span>
                                    <span className="text-xs font-black text-slate-700">{s.fullname}</span>
                                 </div>
                                 <button 
                                   onClick={() => handleAddFriend(s.user_id)}
                                   disabled={friends.some(f => f.user_id === s.user_id)}
                                   className="p-1.5 bg-blue-100 text-blue-600 rounded-lg disabled:opacity-30"
                                 >
                                   <Plus size={16} />
                                 </button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">พลังบวกที่ได้รับ</h4>
                       <div className="space-y-3">
                          {socialActions.length > 0 ? socialActions.slice().reverse().map(a => {
                            const sticker = JSON.parse(a.content);
                            const sender = allStudents.find(s => s.user_id === a.from_user_id) || friends.find(f => f.user_id === a.from_user_id);
                            return (
                              <div key={a.id} className={`p-4 rounded-2xl flex items-center gap-4 ${a.is_read ? 'bg-white' : 'bg-indigo-50 border-2 border-indigo-100 animate-pulse-slow'}`}>
                                 <div className="text-3xl">{sticker.emoji}</div>
                                 <div>
                                    <p className="text-xs font-bold text-slate-800">จาก {sender?.fullname || 'เพื่อนนิรนาม'}</p>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{sticker.text}</p>
                                 </div>
                              </div>
                            );
                          }) : (
                            <div className="py-10 text-center opacity-30 italic font-bold">ยังไม่มีข่าวสารใหม่</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Mystery Box Modal */}
      {showBox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border-8 border-white animate-in zoom-in duration-300 flex flex-col items-center">
              <div className="flex justify-between w-full mb-6">
                 <h3 className="text-2xl font-black text-slate-800">Mystery Box</h3>
                 <button onClick={() => { setShowBox(false); setWonItem(null); }} className="p-2 text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              {!wonItem ? (
                <div className="text-center space-y-8 w-full py-6">
                   <div className={`text-9xl mb-4 transition-all duration-500 ${openingBox ? 'animate-bounce' : 'animate-wiggle'}`}>🎁</div>
                   <div><h4 className="text-xl font-black text-slate-700">กล่องสุ่มไอเทมวิเศษ</h4><p className="text-sm font-medium text-slate-400 mt-2">ลุ้นรับไอเทมตกแต่งอวตารของคุณ!</p></div>
                   <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 inline-flex items-center gap-2"><Coins className="text-amber-500" size={18} /><span className="font-black text-amber-600">ใช้ 20 เหรียญทอง</span></div>
                   <button onClick={handleOpenMysteryBox} disabled={openingBox} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">{openingBox ? <RefreshCw className="animate-spin" /> : <Sparkles />} {openingBox ? 'กำลังเปิดกล่อง...' : 'เปิดกล่องเลย!'}</button>
                </div>
              ) : (
                <div className="text-center space-y-8 w-full py-6 animate-in zoom-in duration-500">
                   <div className="relative"><div className="absolute inset-0 bg-yellow-400/20 blur-3xl animate-pulse rounded-full"></div><div className="text-9xl relative z-10 animate-bounce">{wonItem.image}</div></div>
                   <div><h4 className="text-2xl font-black text-emerald-600">ยินดีด้วย!</h4><p className="text-lg font-black text-slate-700 mt-1">คุณได้รับ "{wonItem.item_name}"</p><div className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-xs font-black uppercase mt-4 inline-block tracking-widest">{wonItem.effect}</div></div>
                   <button onClick={() => { setShowBox(false); setWonItem(null); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95">เก็บเข้ากระเป๋า</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Other Modals */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl"><HealthLogForm userId={user.id} onSave={handleHealthSave} onCancel={() => setShowForm(false)} isSaving={savingHealth} /></div>
        </div>
      )}
      {showGame && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col p-4 items-center justify-center"><HealthQuiz onEnd={(score) => { dbService.updateAvatarStats(user.id, score); setShowGame(false); refreshData(); }} /></div>
      )}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl border-8 border-white animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black text-slate-800">เลือกตัวละคร</h3><button onClick={() => setShowEmojiPicker(false)} className="p-2 text-slate-400"><X /></button></div>
              <div className="grid grid-cols-4 gap-4">{EMOJI_POOL.heroes.map(emoji => (<button key={emoji} onClick={() => handleChangeBaseEmoji(emoji)} className={`text-4xl p-4 rounded-3xl transition-all hover:scale-110 active:scale-95 ${avatar?.base_emoji === emoji ? 'bg-blue-100 border-4 border-blue-400' : 'bg-slate-50 border-4 border-transparent'}`}>{emoji}</button>))}</div>
           </div>
        </div>
      )}
      {showBackpack && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl border-8 border-white animate-in zoom-in">
              <div className="p-8 border-b flex justify-between items-center bg-indigo-50 rounded-t-[2.5rem]"><div><h3 className="text-2xl font-black flex items-center gap-2"><Briefcase className="text-indigo-500" /> กระเป๋าไอเทม</h3></div><button onClick={() => setShowBackpack(false)} className="p-3 text-slate-400"><X /></button></div>
              <div className="flex-grow overflow-y-auto p-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                 {userItems.length > 0 ? userItems.map((ui, idx) => {
                   const itemInfo = ITEMS_SHOP.find(i => String(i.id) === String(ui.item_id));
                   if (!itemInfo) return null;
                   const isEquipped = String(avatar?.equipped_item_id) === String(itemInfo.id);
                   return (<div key={idx} className={`group p-5 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-2 relative ${isEquipped ? 'bg-indigo-50 border-indigo-500 shadow-lg' : 'bg-slate-50 border-transparent'}`}>{isEquipped && <div className="absolute top-2 right-2"><CheckCircle size={16} className="text-indigo-500" fill="white" /></div>}<div className="text-5xl group-hover:scale-110 transition-transform mb-2">{itemInfo.image}</div><div className="text-center"><div className="font-black text-xs text-slate-700">{itemInfo.item_name}</div><div className="text-[9px] font-bold text-emerald-500 uppercase mt-1">{itemInfo.effect}</div></div><button onClick={() => handleEquip(itemInfo.id)} className={`mt-4 w-full py-2.5 rounded-2xl text-[10px] font-black transition-all ${isEquipped ? 'bg-rose-400 text-white shadow-md' : 'bg-indigo-500 text-white shadow-md'}`}>{isEquipped ? 'ถอดออก' : 'สวมใส่'}</button></div>)
                 }) : <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center"><div className="text-6xl mb-4">🎒</div><p className="italic font-bold">ยังไม่มีไอเทมเลยจ้า</p></div>}
              </div>
           </div>
        </div>
      )}
      {showShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-8 border-white">
              <div className="p-8 border-b flex justify-between items-center bg-amber-50 rounded-t-[2.5rem]"><div><h3 className="text-2xl font-black flex items-center gap-2"><ShoppingCart className="text-amber-500" /> Hero Shop</h3></div><div className="bg-white px-5 py-2 rounded-2xl shadow-sm border-2 border-amber-100 flex items-center gap-2"><Coins className="text-amber-500" size={20} /><span className="font-black text-xl text-amber-600">{avatar?.coin}</span></div></div>
              <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {rewards.length > 0 ? rewards.map((r) => (<div key={r.id} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col gap-4 group ${r.stock > 0 ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 grayscale opacity-60'}`}><div className="flex items-center gap-4"><div className="text-5xl group-hover:scale-110 transition-transform">{r.icon}</div><div><h4 className="font-black text-slate-800 text-lg leading-tight">{r.title}</h4><p className="text-xs text-slate-400 font-medium">{r.description}</p></div></div><div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50"><div className="flex items-center gap-1 font-black text-amber-600 text-sm"><Coins size={14} /> {r.cost}</div><button onClick={() => handleRedeem(r)} disabled={r.stock <= 0 || (avatar?.coin || 0) < r.cost} className={`px-6 py-2 rounded-2xl font-black text-[10px] ${r.stock > 0 && (avatar?.coin || 0) >= r.cost ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-400'}`}>แลกเลย</button></div></div>)) : <div className="col-span-full py-20 text-center text-slate-300 italic">ยังไม่มีของรางวัล</div>}
              </div>
              <div className="p-4 text-center border-t"><button onClick={() => setShowShop(false)} className="text-slate-400 font-black text-sm uppercase tracking-widest">ปิดร้านค้า</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentHome;
