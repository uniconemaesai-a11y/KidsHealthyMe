
/**
 * KidsHealthyMe - Complete Unified Backend (Code.gs)
 * Version: 2.3 (Admin Shop CRUD Update)
 */

const SPREADSHEET_ID = '1Y_qsmBerbRpPQdIo5ct0xni0VLoIQJ-C-r9FfRNM7Q8';

function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const structures = {
    'users': ['id', 'username', 'password', 'role', 'fullname', 'class', 'room', 'number', 'gender', 'created_at'],
    'health_logs': [
      'id', 'user_id', 'date', 'missions', 'mood', 'water_glasses', 
      'sleep_start', 'sleep_end', 'sleep_hours', 'exercise_activity', 
      'exercise_minutes', 'sickness', 'height', 'weight', 'bmi', 'steps', 'vegetable_score'
    ],
    'avatar': ['id', 'user_id', 'avatar_name', 'level', 'exp', 'coin', 'equipped_item_id', 'streak_count', 'last_log_date', 'base_emoji'],
    'quiz_questions': ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'answer', 'icon'],
    'box_logs': ['id', 'user_id', 'date', 'item_name'],
    'user_items': ['id', 'user_id', 'item_id', 'is_equipped', 'acquired_at'],
    'shop_rewards': ['id', 'title', 'cost', 'stock', 'icon', 'description'],
    'redemptions': ['id', 'user_id', 'reward_id', 'status', 'claimed_at', 'code']
  };

  for (let sheetName in structures) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(structures[sheetName]);
      sheet.getRange(1, 1, 1, structures[sheetName].length).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    }
  }
  return { success: true, message: "ระบบฐานข้อมูลถูกตั้งค่าเรียบร้อยแล้ว!" };
}

function doGet(e) {
  const callback = e.parameter.callback;
  let result = { success: false, message: 'Unknown error' };
  
  try {
    const action = e.parameter.action;
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
    
    if (!action) throw new Error("No action specified");

    switch(action) {
      case 'ping': result = { success: true, message: 'Pong!' }; break;
      case 'setupDatabase': result = setupDatabase(); break;
      case 'registerUser': result = registerUser(payload); break;
      case 'loginUser': result = loginUser(payload.username, payload.password); break;
      case 'saveHealthLog': result = saveHealthLog(payload); break;
      case 'getAvatarData': result = getAvatarData(payload.userId); break;
      case 'broadcastReward': result = broadcastReward(payload.exp, payload.coins); break;
      case 'getQuizPool': result = { success: true, data: getQuizPool() }; break;
      case 'saveBulkQuiz': result = saveBulkQuiz(payload.questions); break;
      case 'deleteQuizQuestion': result = deleteQuizQuestion(payload.id); break;
      case 'getLeaderboardData': result = { success: true, data: getLeaderboardData(payload.className) }; break;
      case 'getShopRewards': result = { success: true, rewards: getShopRewards() }; break;
      case 'saveShopReward': result = saveShopReward(payload.reward); break;
      case 'deleteShopReward': result = deleteShopReward(payload.id); break;
      case 'redeemReward': result = redeemReward(payload.userId, payload.rewardId, payload.cost); break;
      case 'getRedemptions': result = { success: true, redemptions: getRedemptions(payload.userId) }; break;
      case 'updateRedemptionStatus': result = updateRedemptionStatus(payload.id, payload.status); break;
      case 'getAllHealthLogs': result = { success: true, data: getAllHealthLogs() }; break;
      case 'openMysteryBox': result = openMysteryBoxOnServer(payload.userId, payload.itemName); break;
      case 'getBoxLogs': result = { success: true, logs: getBoxLogs(payload.userId) }; break;
      case 'getUserItems': result = { success: true, items: getUserItems(payload.userId) }; break;
      case 'equipItem': result = equipItem(payload.userId, payload.itemId); break;
      case 'updateBaseEmoji': result = updateBaseEmoji(payload.userId, payload.emoji); break;
      case 'updateAvatarStats': result = updateAvatarStats(payload.userId, payload.expGain); break;
      default: result = { success: false, message: 'Action not found: ' + action };
    }
  } catch (err) {
    result = { success: false, message: 'Server Error: ' + err.toString() };
  }
  
  if (callback) {
    const output = callback + "(" + JSON.stringify(result) + ")";
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetSafe(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function getQuizPool() {
  const sheet = getSheetSafe('quiz_questions');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {}; headers.forEach((h, idx) => obj[h] = row[idx]); return obj;
  });
}

function saveBulkQuiz(questions) {
  if (!questions || !Array.isArray(questions)) return { success: false, message: "Invalid question data format" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sheet = getSheetSafe('quiz_questions');
    const rowsToAppend = questions.map(q => [
      'Q-' + Utilities.getUuid().substr(0, 8),
      q.question || '', q.option1 || '', q.option2 || '', 
      q.option3 || '', q.option4 || '', 
      q.answer !== undefined ? q.answer : 0, q.icon || '❓'
    ]);
    if (rowsToAppend.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsToAppend.length, 8).setValues(rowsToAppend);
    }
    return { success: true, message: `เพิ่มคำถามใหม่ ${questions.length} ข้อ!` };
  } catch (err) { return { success: false, message: err.toString() }; } finally { lock.releaseLock(); }
}

function deleteQuizQuestion(id) {
  const sheet = getSheetSafe('quiz_questions');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

function saveShopReward(reward) {
  const sheet = getSheetSafe('shop_rewards');
  const data = sheet.getDataRange().getValues();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    let rowIdx = -1;
    if (reward.id) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(reward.id)) {
          rowIdx = i + 1; break;
        }
      }
    }
    const rewardData = [
      reward.id || 'R-' + Utilities.getUuid().substr(0, 8),
      reward.title || 'ของรางวัลใหม่',
      Number(reward.cost) || 0,
      Number(reward.stock) || 0,
      reward.icon || '🎁',
      reward.description || ''
    ];
    if (rowIdx !== -1) {
      sheet.getRange(rowIdx, 1, 1, 6).setValues([rewardData]);
      return { success: true, message: "อัปเดตของรางวัลแล้ว" };
    } else {
      sheet.appendRow(rewardData);
      return { success: true, message: "เพิ่มของรางวัลใหม่แล้ว" };
    }
  } catch (e) { return { success: false, message: e.toString() }; } finally { lock.releaseLock(); }
}

function deleteShopReward(id) {
  const sheet = getSheetSafe('shop_rewards');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false };
}

function registerUser(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetSafe('users');
    const userId = 'U-' + Utilities.getUuid().substr(0, 8);
    sheet.appendRow([userId, data.username, data.password, 'student', data.fullname, data.class, data.room, data.number, data.gender, new Date().toISOString()]);
    const avatarSheet = getSheetSafe('avatar');
    avatarSheet.appendRow(['AV-' + userId, userId, 'Hero-' + data.fullname, 1, 0, 50, '', 0, '', '🧑‍🚀']);
    return { success: true, userId: userId };
  } finally { lock.releaseLock(); }
}

function loginUser(username, password) {
  const data = getSheetSafe('users').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(username) && String(data[i][2]) === String(password)) {
      return { success: true, user: { id: String(data[i][0]), username: String(data[i][1]), role: String(data[i][3]), fullname: String(data[i][4]), class: String(data[i][5]) } };
    }
  }
  return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

function getAvatarData(userId) {
  const sheet = getSheetSafe('avatar');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId)) {
      return { 
        success: true, avatar_name: data[i][2], level: Number(data[i][3]), 
        exp: Number(data[i][4]), coin: Number(data[i][5]), 
        equipped_item_id: String(data[i][6]), streak_count: Number(data[i][7]), 
        last_log_date: data[i][8], base_emoji: String(data[i][9] || '🧑‍🚀')
      };
    }
  }
  return { success: false };
}

function broadcastReward(exp, coins) {
  const sheet = getSheetSafe('avatar');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    let lv = Number(data[i][3]);
    let currentExp = Number(data[i][4]) + Number(exp);
    let currentCoin = Number(data[i][5]) + Number(coins);
    while (currentExp >= (lv * 100)) { currentExp -= (lv * 100); lv++; }
    sheet.getRange(i + 1, 4, 1, 3).setValues([[lv, currentExp, currentCoin]]);
  }
  return { success: true, message: `แจกรางวัลสำเร็จแก่เด็กทั้งหมด ${data.length - 1} คน` };
}

function updateAvatarStats(userId, expGain, updateStreak = false) {
  const sheet = getSheetSafe('avatar');
  const avatarData = sheet.getDataRange().getValues();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  for (let i = 1; i < avatarData.length; i++) {
    if (String(avatarData[i][1]) === String(userId)) {
      let lv = Number(avatarData[i][3]);
      let exp = Number(avatarData[i][4]) + Number(expGain);
      let coin = Number(avatarData[i][5]) + Math.floor(expGain / 2);
      let streak = Number(avatarData[i][7] || 0);
      const lastLogDate = avatarData[i][8] ? new Date(avatarData[i][8]).toISOString().split('T')[0] : '';
      if (updateStreak) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastLogDate === yesterdayStr) streak++;
        else if (lastLogDate !== todayStr) streak = 1;
      }
      while (exp >= (lv * 100)) { exp -= (lv * 100); lv++; }
      sheet.getRange(i + 1, 4, 1, 6).setValues([[lv, exp, coin, avatarData[i][6], streak, today.toISOString()]]);
      return { success: true };
    }
  }
}

function saveHealthLog(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetSafe('health_logs');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const logs = sheet.getDataRange().getValues();
    for (let i = 1; i < logs.length; i++) {
      const logDate = new Date(logs[i][2]).toISOString().split('T')[0];
      if (String(logs[i][1]) === String(data.user_id) && logDate === todayStr) {
        return { success: false, message: 'วันนี้คุณได้บันทึกไปเรียบร้อยแล้ว' };
      }
    }
    const logId = 'LOG-' + Utilities.getUuid().substr(0, 8);
    sheet.appendRow([
      logId, data.user_id, today.toISOString(), 
      JSON.stringify(data.missions), data.mood, data.water_glasses,
      data.sleep_start, data.sleep_end, data.sleep_hours,
      data.exercise_activity, data.exercise_minutes, data.sickness,
      data.height, data.weight, data.bmi, data.steps, data.vegetable_score
    ]);
    let expGain = 10 + (Number(data.exercise_minutes) || 0);
    updateAvatarStats(data.user_id, expGain, true);
    return { success: true, expGain: expGain };
  } finally { lock.releaseLock(); }
}

function getShopRewards() {
  const data = getSheetSafe('shop_rewards').getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {}; headers.forEach((h, idx) => obj[h] = row[idx]); return obj;
  });
}

function redeemReward(userId, rewardId, cost) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const avatarSheet = getSheetSafe('avatar');
    const rewardSheet = getSheetSafe('shop_rewards');
    const redemptionSheet = getSheetSafe('redemptions');
    const avatars = avatarSheet.getDataRange().getValues();
    let avatarRow = -1;
    for (let i = 1; i < avatars.length; i++) {
      if (String(avatars[i][1]) === String(userId)) {
        if (Number(avatars[i][5]) < cost) return { success: false, message: 'เหรียญไม่พอ' };
        avatarRow = i + 1; break;
      }
    }
    const rewards = rewardSheet.getDataRange().getValues();
    let rewardRow = -1;
    for (let i = 1; i < rewards.length; i++) {
      if (String(rewards[i][0]) === String(rewardId)) {
        if (Number(rewards[i][3]) <= 0) return { success: false, message: 'ของรางวัลชิ้นนี้หมดแล้ว' };
        rewardRow = i + 1; break;
      }
    }
    if (avatarRow !== -1 && rewardRow !== -1) {
      avatarSheet.getRange(avatarRow, 6).setValue(Number(avatars[avatarRow-1][5]) - cost);
      rewardSheet.getRange(rewardRow, 4).setValue(Number(rewards[rewardRow-1][3]) - 1);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      redemptionSheet.appendRow(['RD-' + Utilities.getUuid().substr(0, 8), userId, rewardId, 'pending', new Date().toISOString(), code]);
      return { success: true };
    }
    return { success: false };
  } finally { lock.releaseLock(); }
}

function getRedemptions(userId) {
  const data = getSheetSafe('redemptions').getDataRange().getValues();
  const headers = data[0];
  let records = data.slice(1).map(row => {
    let obj = {}; headers.forEach((h, idx) => obj[h] = row[idx]); return obj;
  });
  if (userId) records = records.filter(r => String(r.user_id) === String(userId));
  return records.reverse();
}

function updateRedemptionStatus(id, status) {
  const sheet = getSheetSafe('redemptions');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sheet.getRange(i + 1, 4).setValue(status); return { success: true }; }
  }
  return { success: false };
}

function getLeaderboardData(className) {
  const avatars = getSheetSafe('avatar').getDataRange().getValues();
  const users = getSheetSafe('users').getDataRange().getValues();
  
  let result = avatars.slice(1).map(row => {
    const user = users.find(u => String(u[0]) === String(row[1]));
    if (!user) return null;
    return { 
      user_id: row[1], 
      fullname: String(user[4]), 
      level: Number(row[3]), 
      exp: Number(row[4]), 
      coin: Number(row[5]),
      class: String(user[5]),
      base_emoji: String(row[9] || '🧑‍🚀')
    };
  }).filter(u => u !== null);

  // Filter by class if provided
  if (className) {
    result = result.filter(u => u.class === className);
  }

  return result.sort((a, b) => b.level - a.level || b.exp - a.exp).slice(0, 10);
}

function getAllHealthLogs() {
  const data = getSheetSafe('health_logs').getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {}; headers.forEach((h, idx) => obj[h] = row[idx]); return obj;
  });
}

function openMysteryBoxOnServer(userId, itemName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const logSheet = getSheetSafe('box_logs');
    const avatarSheet = getSheetSafe('avatar');
    const itemSheet = getSheetSafe('user_items');
    const avatars = avatarSheet.getDataRange().getValues();
    for (let i = 1; i < avatars.length; i++) {
      if (String(avatars[i][1]) === String(userId)) {
        const currentCoin = Number(avatars[i][5]);
        if (currentCoin < 20) return { success: false, message: 'เหรียญไม่พอจ้า' };
        avatarSheet.getRange(i + 1, 6).setValue(currentCoin - 20);
        logSheet.appendRow(['BOX-' + Utilities.getUuid().substr(0, 8), userId, new Date().toISOString(), itemName]);
        itemSheet.appendRow(['UI-' + Utilities.getUuid().substr(0, 8), userId, itemName, false, new Date().toISOString()]);
        return { success: true };
      }
    }
    return { success: false };
  } finally { lock.releaseLock(); }
}

function getBoxLogs(userId) {
  const data = getSheetSafe('box_logs').getDataRange().getValues();
  return data.slice(1).filter(row => String(row[1]) === String(userId));
}

function getUserItems(userId) {
  const data = getSheetSafe('user_items').getDataRange().getValues();
  return data.slice(1).filter(row => String(row[1]) === String(userId)).map(row => ({
    id: row[0], user_id: row[1], item_id: String(row[2]), is_equipped: row[3], acquired_at: row[4]
  }));
}

function equipItem(userId, itemId) {
  const sheet = getSheetSafe('avatar');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId)) {
      sheet.getRange(i + 1, 7).setValue(String(itemId));
      return { success: true };
    }
  }
  return { success: false };
}

function updateBaseEmoji(userId, emoji) {
  const sheet = getSheetSafe('avatar');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId)) {
      sheet.getRange(i + 1, 10).setValue(String(emoji));
      return { success: true };
    }
  }
  return { success: false };
}
