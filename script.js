<script>
    // ============ Утилиты ============
    const avatars = [
        '🐱', '🐶', '🦊', '🐸', '🐵', '🐼', '🐨', '🐯',
        '🦁', '🐮', '🐷', '🐰', '🐻', '🐔', '🐧', '🦄',
        '🐲', '🦕', '🐙', '🦀', '🐞', '🦋', '🐌', '🐛'
    ];
    
    function getAvatar(seed, usedAvatars = new Set()) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const available = avatars.filter(a => !usedAvatars.has(a));
        if (available.length > 0) {
            const chosen = available[Math.abs(hash) % available.length];
            return chosen;
        }
        return avatars[Math.abs(hash) % avatars.length];
    }

    function getTime() {
        const now = new Date();
        return now.getHours().toString().padStart(2,'0') + ':' + 
               now.getMinutes().toString().padStart(2,'0');
    }

    function getFullTimestamp() {
        const now = new Date();
        return now.toLocaleString('ru-RU');
    }

    async function hashRoomName(name, prefix) {
        const clean = name.trim().toLowerCase();
        const msgBuffer = new TextEncoder().encode(clean);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
        return `rm_${prefix}_${hashHex}`;
    }

    function isMobile() {
        return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
    }

    // ============ Хранилище истории (localStorage) ============
    const HISTORY_KEY_PREFIX = 'p2p_room_history_';
    const LOGS_KEY_PREFIX = 'p2p_room_logs_';
    const DM_KEY_PREFIX = 'p2p_dm_messages_';
    const BANS_KEY_PREFIX = 'p2p_bans_';
    const MAX_HISTORY_ITEMS = 500;
    const MAX_LOG_ITEMS = 200;
    const DM_EXPIRY_DAYS = 3;
    const DM_EXPIRY_MS = DM_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    function getHistoryKey(roomName) {
        return HISTORY_KEY_PREFIX + roomName.trim().toLowerCase();
    }

    function getLogsKey(roomName) {
        return LOGS_KEY_PREFIX + roomName.trim().toLowerCase();
    }

    function getDMKey(userId1, userId2) {
        const ids = [userId1, userId2].sort().join('_');
        return DM_KEY_PREFIX + ids;
    }

    function getBansKey(roomName) {
        return BANS_KEY_PREFIX + roomName.trim().toLowerCase();
    }

    // Сохранение сообщения в историю комнаты
    function saveMessageToHistory(roomName, messageData) {
        if (!roomName) return;
        try {
            const key = getHistoryKey(roomName);
            let history = [];
            const stored = localStorage.getItem(key);
            if (stored) {
                history = JSON.parse(stored);
            }
            
            history.push(messageData);
            
            if (history.length > MAX_HISTORY_ITEMS) {
                history = history.slice(-MAX_HISTORY_ITEMS);
            }
            
            localStorage.setItem(key, JSON.stringify(history));
            updateHistoryInfo(roomName);
        } catch (e) {
            console.error('Ошибка сохранения истории:', e);
            if (e.name === 'QuotaExceededError') {
                try {
                    const key = getHistoryKey(roomName);
                    let history = JSON.parse(localStorage.getItem(key) || '[]');
                    history = history.slice(-Math.floor(MAX_HISTORY_ITEMS / 2));
                    localStorage.setItem(key, JSON.stringify(history));
                } catch (e2) {
                    console.error('Не удалось очистить историю:', e2);
                }
            }
        }
    }

    // Сохранение лога/ошибки
    function saveLogToHistory(roomName, logData) {
        if (!roomName) return;
        try {
            const key = getLogsKey(roomName);
            let logs = [];
            const stored = localStorage.getItem(key);
            if (stored) {
                logs = JSON.parse(stored);
            }
            
            logs.push(logData);
            
            if (logs.length > MAX_LOG_ITEMS) {
                logs = logs.slice(-MAX_LOG_ITEMS);
            }
            
            localStorage.setItem(key, JSON.stringify(logs));
        } catch (e) {
            console.error('Ошибка сохранения логов:', e);
        }
    }

    // Сохранение личного сообщения
    function saveDMMessage(userId1, userId2, messageData) {
        if (!userId1 || !userId2) return;
        try {
            const key = getDMKey(userId1, userId2);
            let messages = [];
            const stored = localStorage.getItem(key);
            if (stored) {
                messages = JSON.parse(stored);
            }
            
            messageData.timestamp = Date.now();
            messages.push(messageData);
            
            // Удаляем старые сообщения (старше 3 дней)
            const expiryTime = Date.now() - DM_EXPIRY_MS;
            messages = messages.filter(m => m.timestamp > expiryTime);
            
            // Ограничиваем количество
            if (messages.length > 300) {
                messages = messages.slice(-300);
            }
            
            localStorage.setItem(key, JSON.stringify(messages));
        } catch (e) {
            console.error('Ошибка сохранения ЛС:', e);
        }
    }

    // Загрузка личных сообщений
    function loadDMMessages(userId1, userId2) {
        if (!userId1 || !userId2) return [];
        try {
            const key = getDMKey(userId1, userId2);
            const stored = localStorage.getItem(key);
            if (!stored) return [];
            
            let messages = JSON.parse(stored);
            const expiryTime = Date.now() - DM_EXPIRY_MS;
            messages = messages.filter(m => m.timestamp > expiryTime);
            
            return messages;
        } catch (e) {
            console.error('Ошибка загрузки ЛС:', e);
            return [];
        }
    }

    // Баны
    function getBanList(roomName) {
        if (!roomName) return [];
        try {
            const key = getBansKey(roomName);
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function addBan(roomName, peerId) {
        if (!roomName) return;
        try {
            const bans = getBanList(roomName);
            bans.push({ peerId: peerId, time: Date.now() });
            localStorage.setItem(getBansKey(roomName), JSON.stringify(bans));
        } catch (e) {
            console.error('Ошибка бана:', e);
        }
    }

    function isBanned(roomName, peerId) {
        return getBanList(roomName).some(b => b.peerId === peerId);
    }

    // Загрузка истории сообщений
    function loadMessageHistory(roomName) {
        if (!roomName) return [];
        try {
            const key = getHistoryKey(roomName);
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Ошибка загрузки истории:', e);
        }
        return [];
    }

    // Загрузка логов
    function loadLogHistory(roomName) {
        if (!roomName) return [];
        try {
            const key = getLogsKey(roomName);
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Ошибка загрузки логов:', e);
        }
        return [];
    }

    // Очистка истории комнаты
    function clearRoomHistory(roomName) {
        if (!roomName) return;
        try {
            localStorage.removeItem(getHistoryKey(roomName));
            localStorage.removeItem(getLogsKey(roomName));
            updateHistoryInfo(roomName);
        } catch (e) {
            console.error('Ошибка очистки истории:', e);
        }
    }

    // Обновление информации о количестве сохранённых записей
    function updateHistoryInfo(roomName) {
        const historyInfo = document.getElementById('history-info');
        if (!historyInfo || !roomName) return;
        
        const msgCount = loadMessageHistory(roomName).length;
        const logCount = loadLogHistory(roomName).length;
        
        if (msgCount > 0 || logCount > 0) {
            historyInfo.innerText = `💾 Сохранено: ${msgCount} сообщений, ${logCount} логов`;
        } else {
            historyInfo.innerText = '';
        }
    }

    // Восстановление истории в чате
    function restoreHistoryToChat(roomName) {
        if (!roomName) return;
        
        const messages = loadMessageHistory(roomName);
        const logs = loadLogHistory(roomName);
        
        if (messages.length > 0 || logs.length > 0) {
            addSystemMessage(`📂 Загружена история: ${messages.length} сообщений, ${logs.length} логов`, true);
            
            logs.forEach(log => {
                if (log.type === 'error') {
                    addErrorMessage(log.text, true);
                } else if (log.type === 'system') {
                    addSystemMessage(log.text, true);
                } else {
                    addSystemMessage(`📋 ${log.text}`, true);
                }
            });
            
            messages.forEach(msg => {
                if (msg.msgType === 'me') {
                    addMessageToChat(msg.text, 'me', '', msg.time, true);
                } else if (msg.msgType === 'friend') {
                    addMessageToChat(msg.text, 'friend', msg.from || '', msg.time, true);
                } else if (msg.type === 'system') {
                    addSystemMessage(msg.text, true);
                }
            });
            
            if (messages.length > 0 || logs.length > 0) {
                addSystemMessage('━━━ 🔽 Новые сообщения 🔽 ━━━', true);
            }
        }
    }

    // ============ Глобальные переменные состояния ============
    const usedAvatars = new Set();
    
    // ============ DOM элементы ============
    const loginOverlay = document.getElementById('login-overlay');
    const roomInput = document.getElementById('room-input');
    const createRoomBtn = document.getElementById('create-room-btn');
    const createMegaBtn = document.getElementById('create-mega-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomDisplay = document.getElementById('room-display');
    const statusDisplay = document.getElementById('status');
    const peersCount = document.getElementById('peers-count');
    const peersList = document.getElementById('peers-list');
    const chatWindow = document.getElementById('chat-window');
    const msgInput = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    const audioContainers = document.getElementById('audio-containers');
    const myVolSlider = document.getElementById('my-volume');
    const myVolTxt = document.getElementById('my-vol-txt');
    const muteMicBtn = document.getElementById('mute-mic-btn');
    const muteAudioBtn = document.getElementById('mute-audio-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const refreshAudioBtn = document.getElementById('refresh-audio-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const debugInfo = document.getElementById('debug-info');
    const screenShareBtn = document.getElementById('screen-share-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const screenShareContainer = document.getElementById('screen-share-container');
    const screenVideo = document.getElementById('screen-video');
    const stopScreenBtn = document.getElementById('stop-screen-btn');
    const blurScreenBtn = document.getElementById('blur-screen-btn');
    const screenShareLabel = document.getElementById('screen-share-label');
    const historyInfo = document.getElementById('history-info');
    
    // DM элементы
    const dmOverlay = document.getElementById('dm-overlay');
    const dmTitle = document.getElementById('dm-title');
    const dmChat = document.getElementById('dm-chat');
    const dmMsgInput = document.getElementById('dm-msg-input');
    const dmSendBtn = document.getElementById('dm-send-btn');
    const dmCloseBtn = document.getElementById('dm-close-btn');

    // ============ Состояние ============
    let peer = null;
    let localAudioStream = null;
    let rawMicStream = null;
    let localScreenStream = null;
    let localCameraStream = null;
    let audioContext = null
