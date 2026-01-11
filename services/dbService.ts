
import { User, HealthLog, AvatarData, UserRole, Item, UserItem, ShopReward, RedemptionRecord, SocialAction } from '../types';
import { INITIAL_AVATAR, ITEMS_SHOP } from '../constants';

const SPREADSHEET_ID = '1Y_qsmBerbRpPQdIo5ct0xni0VLoIQJ-C-r9FfRNM7Q8';
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzEcivzG_NZDpCbE-4806SbZmhKklgjGO2sfXjqQfujEQ5dTpR3YeJpz0y6bOrUAhQZCw/exec';

export const dbService = {
  getSpreadsheetId: () => SPREADSHEET_ID,
  getWebAppUrl: () => GAS_WEBAPP_URL,

  checkConnection: async (): Promise<boolean> => {
    try {
      const res = await dbService.callJSONP('ping', {});
      return res && res.success === true;
    } catch (e) {
      return false;
    }
  },

  callJSONP: (action: string, data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const callbackName = 'khm_api_cb_' + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`[Timeout] เซิร์ฟเวอร์ตอบสนองช้าเกินไปขณะทำ: ${action}`));
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete (window as any)[callbackName];
      };

      (window as any)[callbackName] = (response: any) => {
        cleanup();
        if (response && response.success === false) {
          reject(new Error(response.message || "เซิร์ฟเวอร์แจ้งข้อผิดพลาด"));
        } else {
          resolve(response);
        }
      };

      try {
        const payload = encodeURIComponent(JSON.stringify(data || {}));
        const fullUrl = `${GAS_WEBAPP_URL}?action=${action}&callback=${callbackName}&payload=${payload}&v=${Date.now()}`;
        
        if (fullUrl.length > 8000) {
          cleanup();
          reject(new Error(`ข้อมูลยาวเกินไปสำหรับการส่งแบบปกติ`));
          return;
        }

        script.src = fullUrl;
        script.async = true;
        script.setAttribute('crossorigin', 'anonymous');
        script.onerror = () => {
          cleanup();
          reject(new Error(`Network Error: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้`));
        };
        document.head.appendChild(script);
      } catch (err: any) {
        cleanup();
        reject(err);
      }
    });
  },

  register: async (userData: Partial<User>) => {
    const result = await dbService.callJSONP('registerUser', userData);
    return { ...userData, id: result.userId, role: UserRole.STUDENT } as User;
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const result = await dbService.callJSONP('loginUser', { username, password });
    return result && result.success ? result.user : null;
  },

  getAvatar: async (userId: string): Promise<AvatarData> => {
    try {
      const remote = await dbService.callJSONP('getAvatarData', { userId });
      if (remote && remote.success) {
        return {
          user_id: userId,
          avatar_name: remote.avatar_name,
          level: Number(remote.level),
          exp: Number(remote.exp),
          coin: Number(remote.coin),
          equipped_item_id: remote.equipped_item_id,
          streak_count: Number(remote.streak_count || 0),
          base_emoji: remote.base_emoji || '🧑‍🚀'
        };
      }
    } catch (e) {}
    return INITIAL_AVATAR(userId);
  },

  getQuizPool: async (): Promise<any[]> => {
    try {
      const res = await dbService.callJSONP('getQuizPool', {});
      return res.data || [];
    } catch (e) {
      return [];
    }
  },

  saveBulkQuiz: async (questions: any[]) => {
    return await dbService.callJSONP('saveBulkQuiz', { questions });
  },

  deleteQuizQuestion: async (id: string) => {
    return await dbService.callJSONP('deleteQuizQuestion', { id });
  },

  saveHealthLog: async (log: Omit<HealthLog, 'id'>) => {
    return await dbService.callJSONP('saveHealthLog', log);
  },

  getAllHealthLogs: async (): Promise<any[]> => {
    try {
      const res = await dbService.callJSONP('getAllHealthLogs', {});
      return res.data || [];
    } catch (e) {
      return [];
    }
  },

  getShopRewards: async (): Promise<ShopReward[]> => {
    try {
      const res = await dbService.callJSONP('getShopRewards', {});
      return res.rewards || [];
    } catch (e) {
      return [];
    }
  },

  saveShopReward: async (reward: Partial<ShopReward>) => {
    return await dbService.callJSONP('saveShopReward', { reward });
  },

  deleteShopReward: async (id: string) => {
    return await dbService.callJSONP('deleteShopReward', { id });
  },

  redeemReward: async (userId: string, rewardId: string, cost: number) => {
    return await dbService.callJSONP('redeemReward', { userId, rewardId, cost });
  },

  getRedemptions: async (userId?: string): Promise<RedemptionRecord[]> => {
    try {
      const res = await dbService.callJSONP('getRedemptions', { userId });
      return res.redemptions || [];
    } catch (e) {
      return [];
    }
  },

  updateRedemptionStatus: async (id: string, status: string) => {
    return await dbService.callJSONP('updateRedemptionStatus', { id, status });
  },

  getUserItems: async (userId: string): Promise<UserItem[]> => {
    try {
      const res = await dbService.callJSONP('getUserItems', { userId });
      return res.items || [];
    } catch (e) {
      return [];
    }
  },

  equipItem: async (userId: string, itemId: string) => {
    return await dbService.callJSONP('equipItem', { userId, itemId });
  },

  updateBaseEmoji: async (userId: string, emoji: string) => {
    return await dbService.callJSONP('updateBaseEmoji', { userId, emoji });
  },

  broadcastReward: async (exp: number, coins: number) => {
    return await dbService.callJSONP('broadcastReward', { exp, coins });
  },

  updateAvatarStats: async (userId: string, expGain: number) => {
    return await dbService.callJSONP('updateAvatarStats', { userId, expGain });
  },

  openMysteryBox: async (userId: string, itemName: string) => {
    return await dbService.callJSONP('openMysteryBox', { userId, itemName });
  },

  getBoxLogs: async (userId: string): Promise<any[]> => {
    try {
      const res = await dbService.callJSONP('getBoxLogs', { userId });
      return res.logs || [];
    } catch (e) {
      return [];
    }
  },

  getLeaderboard: async (className?: string): Promise<any[]> => {
    try {
      const res = await dbService.callJSONP('getLeaderboardData', { className });
      return res.data || [];
    } catch (e) {
      return [];
    }
  },

  // --- SOCIAL SYSTEM API ---
  getFriends: async (userId: string): Promise<any[]> => {
    try {
      const res = await dbService.callJSONP('getFriends', { userId });
      return res.friends || [];
    } catch (e) {
      return [];
    }
  },

  addFriend: async (userId: string, friendId: string) => {
    return await dbService.callJSONP('addFriend', { userId, friendId });
  },

  removeFriend: async (userId: string, friendId: string) => {
    return await dbService.callJSONP('removeFriend', { userId, friendId });
  },

  sendSocialAction: async (action: Omit<SocialAction, 'id' | 'is_read' | 'created_at'>) => {
    return await dbService.callJSONP('sendSocialAction', action);
  },

  getSocialActions: async (userId: string): Promise<SocialAction[]> => {
    try {
      const res = await dbService.callJSONP('getSocialActions', { userId });
      return res.actions || [];
    } catch (e) {
      return [];
    }
  },

  markActionsAsRead: async (userId: string) => {
    return await dbService.callJSONP('markActionsAsRead', { userId });
  }
};
