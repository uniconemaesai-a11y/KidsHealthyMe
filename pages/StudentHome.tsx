
import React, { useState, useEffect } from 'react';
import { User, AvatarData, HealthLog, Item, UserItem, ShopReward, RedemptionRecord } from '../types';
import { dbService } from '../services/dbService';
import { ITEMS_SHOP, EMOJI_POOL } from '../constants';
import { Zap, Coins, Plus, Box, CheckCircle, Brain, Briefcase, Flame, ShoppingCart, Ticket, Sparkles, X, User as UserIcon } from 'lucide-react';
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
  const [showRedemptions, setShowRedemptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [rewards, setRewards] = useState<ShopReward[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<RedemptionRecord[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [savingHealth, setSavingHealth] = useState(false);
  const [isAlreadyLogged, setIsAlreadyLogged] = useState(false);
  const [isBoxAlreadyOpened, setIsBoxAlreadyOpened] = useState(false);
  const [userLogs, setUserLogs] = useState<HealthLog[]>([]);
  const [todayLog, setTodayLog] = useState<HealthLog | null>(null);
  const [openingBox, setOpeningBox] = useState(false);

  useEffect(() => {
    refreshData();
  }, [user.id]);

  const refreshData = async () => {
    setLoadingData(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [avatarData, allLogs, boxLogs, items, shopItems, userClaims] = await Promise.all([
        dbService.getAvatar(user.id),
        dbService.getAllHealthLogs(),
        dbService.getBoxLogs(user.id),
        dbService.getUserItems(user.id),
        dbService.getShopRewards(),
        dbService.getRedemptions(user.id)
      ]);
      
      setAvatar(avatarData);
      setUserItems(items);
      setRewards(shopItems);
      setMyRedemptions(userClaims);
      
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

    } catch (e) {
      console.error("Refresh data error", e);
    } finally {
      setLoadingData(false);
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

  const handleEquip = async (itemId: string) => {
    const isCurrentlyEquipped = avatar?.equipped_item_id === String(itemId);
    const targetId = isCurrentlyEquipped ? '' : itemId;

    try {
      const res = await dbService.equipItem(user.id, targetId);
      if (res.success) {
        Swal.fire({
          title: isCurrentlyEquipped ? 'ถอดไอเทมแล้ว' : 'สวมใส่ไอเทมแล้ว!',
          text: isCurrentlyEquipped ? 'เบาสบายขึ้นเยอะเลย' : 'ว้าว! ลุคนี้ดูดีมากฮีโร่',
          icon: 'success',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
        await refreshData();
      }
    } catch (e) {
      Swal.fire({ title: 'โอ๊ะ!', text: 'เกิดข้อผิดพลาดในการเปลี่ยนไอเทม', icon: 'error' });
    }
  };

  const handleChangeBaseEmoji = async (emoji: string) => {
    try {
      const res = await dbService.updateBaseEmoji(user.id, emoji);
      if (res.success) {
        setShowEmojiPicker(false);
        Swal.fire({ title: 'เปลี่ยนตัวละครแล้ว!', text: 'ลุคนี้แหละที่ใช่!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        await refreshData();
      }
    } catch (e) {
      Swal.fire({ title: 'โอ๊ะ!', text: 'ไม่สามารถเปลี่ยนตัวละครได้ในขณะนี้', icon: 'error' });
    }
  };

  const handleOpenBox = async () => {
    if (isBoxAlreadyOpened) return;
    if (avatar && avatar.coin < 20) {
      Swal.fire({ title: 'เหรียญไม่พอจ้า', text: 'สะสมเหรีย่งเพิ่มอีกนิดนะฮีโร่!', icon: 'warning' });
      return;
    }

    setOpeningBox(true);
    try {
      const randomItem = ITEMS_SHOP[Math.floor(Math.random() * ITEMS_SHOP.length)];
      const res = await dbService.openMysteryBox(user.id, randomItem.id);
      if (res.success) {
        Swal.fire({
          title: 'ว้าว! ได้ไอเทมใหม่',
          text: `คุณได้รับ "${randomItem.item_name}" (${randomItem.image})`,
          icon: 'success',
          confirmButtonText: 'เก็บเข้ากระเป๋า'
        });
        await refreshData();
      }
    } catch (e) {
      Swal.fire({ title: 'โอ๊ะ!', text: 'กล่องสมบัติล็อคแน่นเกินไป ลองใหม่นะ', icon: 'error' });
    } finally {
      setOpeningBox(false);
      setShowBox(false);
    }
  };

  const handleRedeem = async (r: ShopReward) => {
    if (!avatar || avatar.coin < r.cost) {
      Swal.fire({ title: 'เหรียญไม่พอจ้า', text: 'สะสมเหรียญเพิ่มอีกนิดนะฮีโร่!', icon: 'warning' });
      return;
    }
    const confirm = await Swal.fire({
      title: 'ยืนยันการแลกรางวัล?',
      text: `ใช้ ${r.cost} เหรียญ แลก "${r.title}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'แลกเลย!',
      cancelButtonText: 'เดี๋ยวก่อน'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await dbService.redeemReward(user.id, r.id, r.cost);
        if (res.success) {
          Swal.fire({ title: 'แลกรางวัลสำเร็จ!', text: 'ได้รับรหัสแลกรางวัลแล้ว นำไปโชว์ให้คุณครูนะ!', icon: 'success' });
          await refreshData();
        }
      } catch (e) {
        Swal.fire({ title: 'โอ๊ะ!', text: 'เกิดข้อผิดพลาดในการแลกรางวัล', icon: 'error' });
      }
    }
  };

  const equippedItem = ITEMS_SHOP.find(i => String(i.id) === String(avatar?.equipped_item_id));
  const expPercentage = avatar ? (avatar.exp / (avatar.level * 100)) * 100 : 0;

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      {/* Profile Section */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={160} /></div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            {/* Avatar Display - Click to Change Emoji */}
            <button 
              onClick={() => setShowEmojiPicker(true)}
              className="w-32 h-32 bg-gradient-to-tr from-yellow-100 to-orange-200 rounded-[2.5rem] flex items-center justify-center text-6xl border-4 border-white shadow-xl transform transition-all hover:scale-105 active:scale-95 relative overflow-hidden cursor-pointer"
            >
               <span className={`transition-all duration-500 ${equippedItem ? 'opacity-30 scale-75 translate-y-3' : 'opacity-100'}`}>
                  {avatar?.base_emoji || '🧑‍🚀'}
               </span>
               {equippedItem && (
                 <span className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce" style={{ animationDuration: '3s' }}>
                   {equippedItem.image}
                 </span>
               )}
               <div className="absolute inset-0 bg-black/0 hover:bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                  <UserIcon className="text-white drop-shadow-lg" size={32} />
               </div>
            </button>
            
            {avatar?.streak_count && avatar.streak_count > 0 && (
              <div className="absolute -top-2 -left-2 bg-orange-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-black border-2 border-white shadow-lg animate-bounce">
                <Flame size={14} fill="white" /> {avatar.streak_count} วันติด!
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black border-4 border-white text-sm shadow-lg">
              {avatar?.level}
            </div>
          </div>
          
          <div className="flex-grow w-full text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">ฮีโร่ {user.fullname}</h2>
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-6">
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Class {user.class}</span>
              <div className="bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                <Coins size={12} /> {avatar?.coin}
              </div>
              {equippedItem && (
                <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full flex items-center gap-1 text-[10px] font-black uppercase animate-pulse">
                  <Sparkles size={12} /> {equippedItem.effect}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-black text-blue-900/40 uppercase tracking-widest px-1">
                 <span>LV.{avatar?.level} ประสบการณ์</span>
                 <span>{avatar?.exp} / {avatar?.level ? avatar.level * 100 : 100}</span>
               </div>
               <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${expPercentage}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl border-8 border-white animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-black text-slate-800">เลือกตัวละคร</h3>
                 <button onClick={() => setShowEmojiPicker(false)} className="p-2 text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                 {EMOJI_POOL.heroes.map(emoji => (
                   <button 
                     key={emoji} 
                     onClick={() => handleChangeBaseEmoji(emoji)}
                     className={`text-4xl p-4 rounded-3xl transition-all hover:scale-110 active:scale-95 ${avatar?.base_emoji === emoji ? 'bg-blue-100 border-4 border-blue-400' : 'bg-slate-50 border-4 border-transparent'}`}
                   >
                     {emoji}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <button 
          onClick={() => !isAlreadyLogged && setShowForm(true)}
          disabled={isAlreadyLogged}
          className={`${isAlreadyLogged ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 cursor-default' : 'bg-blue-500 text-white shadow-blue-100 shadow-xl'} p-6 rounded-[2.5rem] transition-all flex flex-col items-center gap-2 group active:scale-95`}
        >
          <div className={`p-4 ${isAlreadyLogged ? 'bg-emerald-100' : 'bg-white/20'} rounded-2xl group-hover:scale-110 transition-transform`}>
            {isAlreadyLogged ? <CheckCircle size={32} /> : <Plus size={32} strokeWidth={3} />}
          </div>
          <span className="font-black text-sm">{isAlreadyLogged ? 'บันทึกแล้ว' : 'บันทึกสุขภาพ'}</span>
        </button>
        
        <button onClick={() => setShowGame(true)} className="bg-purple-500 p-6 rounded-[2.5rem] shadow-xl shadow-purple-100 transition-all flex flex-col items-center gap-2 text-white group active:scale-95">
          <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><Brain size={32} strokeWidth={3} /></div>
          <span className="font-black text-sm">ควิซสมองไว</span>
        </button>

        <button onClick={() => setShowShop(true)} className="bg-amber-500 p-6 rounded-[2.5rem] shadow-xl shadow-amber-100 transition-all flex flex-col items-center gap-2 text-white group active:scale-95">
          <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><ShoppingCart size={32} strokeWidth={3} /></div>
          <span className="font-black text-sm">Hero Shop</span>
        </button>

        <button 
          onClick={() => setShowBox(true)} 
          disabled={isBoxAlreadyOpened}
          className={`${isBoxAlreadyOpened ? 'bg-orange-300 opacity-60 cursor-default' : 'bg-orange-500 shadow-orange-100 shadow-xl'} p-6 rounded-[2.5rem] transition-all flex flex-col items-center gap-2 text-white group active:scale-95`}
        >
          <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform"><Box size={32} strokeWidth={3} /></div>
          <span className="font-black text-sm">{isBoxAlreadyOpened ? 'เปิดแล้ววันนี้' : 'Mystery Box'}</span>
        </button>

        <button onClick={() => setShowBackpack(true)} className="bg-indigo-500 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100 transition-all flex flex-col items-center gap-2 text-white group active:scale-95">
          <div className="p-4 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform relative">
            <Briefcase size={32} strokeWidth={3} />
            {userItems.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">{userItems.length}</span>}
          </div>
          <span className="font-black text-sm">กระเป๋าไอเทม</span>
        </button>
      </div>

      <Leaderboard className={user.class} currentUserId={user.id} />

      {/* Backpack Modal ... */}
      {showBackpack && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl border-8 border-white animate-in zoom-in duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-indigo-50 rounded-t-[2.5rem]">
                 <div>
                    <h3 className="text-2xl font-black flex items-center gap-2"><Briefcase className="text-indigo-500" /> กระเป๋าไอเทม</h3>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">สวมใส่ไอเทมเพื่อเพิ่มพลังพิเศษ!</p>
                 </div>
                 <button onClick={() => setShowBackpack(false)} className="p-3 hover:bg-white rounded-full transition-colors text-slate-400"><X /></button>
              </div>
              <div className="flex-grow overflow-y-auto p-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                 {userItems.length > 0 ? (
                   userItems.map((ui, idx) => {
                     const itemInfo = ITEMS_SHOP.find(i => String(i.id) === String(ui.item_id));
                     if (!itemInfo) return null;
                     const isEquipped = String(avatar?.equipped_item_id) === String(itemInfo.id);
                     return (
                       <div key={idx} className={`group p-5 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-2 relative ${isEquipped ? 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-slate-50 border-transparent hover:border-indigo-200'}`}>
                          {isEquipped && <div className="absolute top-2 right-2"><CheckCircle size={16} className="text-indigo-500" fill="white" /></div>}
                          <div className="text-5xl group-hover:scale-110 transition-transform mb-2">{itemInfo.image}</div>
                          <div className="text-center">
                             <div className="font-black text-xs text-slate-700">{itemInfo.item_name}</div>
                             <div className="text-[9px] font-bold text-emerald-500 uppercase mt-1">{itemInfo.effect}</div>
                          </div>
                          <button 
                            onClick={() => handleEquip(itemInfo.id)} 
                            className={`mt-4 w-full py-2.5 rounded-2xl text-[10px] font-black transition-all ${isEquipped ? 'bg-rose-400 text-white shadow-md' : 'bg-indigo-500 text-white shadow-md hover:bg-indigo-600'}`}
                          >
                            {isEquipped ? 'ถอดออก' : 'สวมใส่'}
                          </button>
                       </div>
                     )
                   })
                 ) : (
                   <div className="col-span-full py-20 text-center opacity-30 flex flex-col items-center">
                      <div className="text-6xl mb-4">🎒</div>
                      <p className="italic font-bold">ยังไม่มีไอเทมเลยจ้า ไปสุ่ม Mystery Box กัน!</p>
                   </div>
                 )}
              </div>
              <div className="p-6 text-center border-t">
                 <button onClick={() => setShowBackpack(false)} className="text-slate-400 font-black text-sm hover:text-slate-600 uppercase tracking-widest">ปิดกระเป๋า</button>
              </div>
           </div>
        </div>
      )}

      {/* Shop Modal ... */}
      {showShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-8 border-white">
              <div className="p-8 border-b flex justify-between items-center bg-amber-50 rounded-t-[2.5rem]">
                 <div>
                    <h3 className="text-2xl font-black flex items-center gap-2"><ShoppingCart className="text-amber-500" /> Hero Shop</h3>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">ใช้เหรียญทองแลกของรางวัลจริง!</p>
                 </div>
                 <div className="bg-white px-5 py-2 rounded-2xl shadow-sm border-2 border-amber-100 flex items-center gap-2">
                    <Coins className="text-amber-500" size={20} />
                    <span className="font-black text-xl text-amber-600">{avatar?.coin}</span>
                 </div>
              </div>
              <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {rewards.length > 0 ? rewards.map((r) => (
                   <div key={r.id} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col gap-4 group ${r.stock > 0 ? 'bg-white border-slate-100 hover:border-amber-300 shadow-sm' : 'bg-slate-50 border-transparent grayscale opacity-60'}`}>
                      <div className="flex items-center gap-4">
                         <div className="text-5xl group-hover:scale-110 transition-transform">{r.icon}</div>
                         <div>
                            <h4 className="font-black text-slate-800 text-lg leading-tight">{r.title}</h4>
                            <p className="text-xs text-slate-400 font-medium">{r.description}</p>
                         </div>
                      </div>
                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                         <div className="flex items-center gap-1 font-black text-amber-600 text-sm">
                            <Coins size={14} /> {r.cost}
                         </div>
                         <button onClick={() => handleRedeem(r)} disabled={r.stock <= 0 || (avatar?.coin || 0) < r.cost} className={`px-6 py-2 rounded-2xl font-black text-[10px] ${r.stock > 0 && (avatar?.coin || 0) >= r.cost ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-400'}`}>แลกเลย</button>
                      </div>
                   </div>
                 )) : <div className="col-span-full py-20 text-center text-slate-300 italic">ยังไม่มีของรางวัลในร้านค้าจ้า</div>}
              </div>
              <div className="p-4 text-center border-t"><button onClick={() => setShowShop(false)} className="text-slate-400 font-black text-sm uppercase tracking-widest">ปิดร้านค้า</button></div>
           </div>
        </div>
      )}

      {/* Shared Modals... */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl">
            <HealthLogForm userId={user.id} onSave={handleHealthSave} onCancel={() => setShowForm(false)} isSaving={savingHealth} />
          </div>
        </div>
      )}
      
      {showGame && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col p-4 items-center justify-center">
           <HealthQuiz onEnd={(score) => { dbService.updateAvatarStats(user.id, score); setShowGame(false); refreshData(); }} />
        </div>
      )}
    </div>
  );
};

export default StudentHome;
