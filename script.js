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
    let audioContext = null;
    let gainNode = null;
    let dataConnections = [];
    let mediaCalls = [];
    let videoCalls = [];
    let isMegaRoom = false;
    let amIHost = false;
    let myPeerId = '';
    let myAvatar = '';
    let hostPeerId = null;
    let isSharingScreen = false;
    let isSharingCamera = false;
    let currentCameraFacing = 'user';
    let currentRoomName = '';
    let historyRestored = false;
    let micMuted = false;
    let audioMuted = false;
    let blurred = false;
    let dmPeerId = null;
    let speakingPeers = new Map();

    // ============ Аудио контекст ============
    function ensureAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    document.addEventListener('click', ensureAudio);
    document.addEventListener('touchstart', ensureAudio);

    // ============ Микрофон ============
    async function getMicrophone() {
        try {
            rawMicStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: false 
            });
            
            ensureAudio();
            const source = audioContext.createMediaStreamSource(rawMicStream);
            gainNode = audioContext.createGain();
            source.connect(gainNode);
            
            localAudioStream = rawMicStream;
            
            statusDisplay.innerText = '🎤 Микрофон готов';
            debug('Микрофон успешно активирован (чистый поток)');
            logToHistory('system', 'Микрофон успешно активирован');
            return true;
        } catch (err) {
            console.warn('Микрофон не доступен:', err);
            statusDisplay.innerText = '⚠️ Без микрофона';
            const errMsg = 'Ошибка микрофона: ' + err.message;
            debug(errMsg);
            logToHistory('error', errMsg);
            return false;
        }
    }

    function debug(msg) {
        console.log('[DEBUG]', msg);
        debugInfo.innerText = msg;
        if (currentRoomName && amIHost) {
            saveLogToHistory(currentRoomName, {
                type: 'debug',
                text: msg,
                time: getFullTimestamp()
            });
        }
    }

    function logToHistory(type, text) {
        if (!currentRoomName || !amIHost) return;
        saveLogToHistory(currentRoomName, {
            type: type,
            text: text,
            time: getFullTimestamp()
        });
    }

    // ============ Мут микрофона ============
    function toggleMicMute() {
        micMuted = !micMuted;
        if (micMuted) {
            muteMicBtn.classList.add('active');
            muteMicBtn.innerText = '🔇 Микрофон ВЫКЛ';
            if (rawMicStream) {
                rawMicStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
            }
        } else {
            muteMicBtn.classList.remove('active');
            muteMicBtn.innerText = '🎤 Микрофон вкл';
            if (rawMicStream) {
                rawMicStream.getAudioTracks().forEach(track => {
                    track.enabled = true;
                });
            }
        }
        addSystemMessage(micMuted ? '🔇 Микрофон выключен' : '🎤 Микрофон включен');
        logToHistory('system', micMuted ? 'Микрофон выключен' : 'Микрофон включен');
    }

    muteMicBtn.addEventListener('click', toggleMicMute);

    // ============ Мут звука ============
    function toggleAudioMute() {
        audioMuted = !audioMuted;
        if (audioMuted) {
            muteAudioBtn.classList.add('active');
            muteAudioBtn.innerText = '🔇 Звук ВЫКЛ';
        } else {
            muteAudioBtn.classList.remove('active');
            muteAudioBtn.innerText = '🔊 Звук вкл';
        }
        
        const allAudio = audioContainers.querySelectorAll('audio');
        allAudio.forEach(audio => {
            if (audioMuted) {
                audio.dataset.oldVolume = audio.volume;
                audio.volume = 0;
            } else {
                audio.volume = audio.dataset.oldVolume || 1;
            }
        });
        
        addSystemMessage(audioMuted ? '🔇 Звук выключен' : '🔊 Звук включен');
        logToHistory('system', audioMuted ? 'Звук выключен' : 'Звук включен');
    }

    muteAudioBtn.addEventListener('click', toggleAudioMute);

    // ============ Блюр демки ============
    function toggleBlur() {
        blurred = !blurred;
        if (blurred) {
            screenShareContainer.classList.add('blurred');
            blurScreenBtn.innerText = '👁️ Убрать блюр';
        } else {
            screenShareContainer.classList.remove('blurred');
            blurScreenBtn.innerText = '🔍 Блюр';
        }
        addSystemMessage(blurred ? '🔍 Блюр включен' : '👁️ Блюр выключен');
    }

    blurScreenBtn.addEventListener('click', toggleBlur);

    // ============ Детект речи (зелёная обводка) ============
    function detectSpeaking(stream, peerId) {
        if (!audioContext) return;
        
        try {
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const checkSpeaking = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                
                const avatarElement = document.querySelector(`.avatar[data-peer="${peerId}"]`);
                
                if (average > 20) {
                    speakingPeers.set(peerId, Date.now());
                    if (avatarElement) {
                        avatarElement.classList.add('speaking');
                    }
                } else {
                    const lastSpoke = speakingPeers.get(peerId) || 0;
                    if (Date.now() - lastSpoke > 500) {
                        speakingPeers.delete(peerId);
                        if (avatarElement) {
                            avatarElement.classList.remove('speaking');
                        }
                    }
                }
                
                if (stream.active) {
                    requestAnimationFrame(checkSpeaking);
                }
            };
            
            checkSpeaking();
        } catch (e) {
            console.error('Ошибка детекта речи:', e);
        }
    }

    // ============ Экран (только ПК) ============
    async function startScreenShare() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            const errMsg = 'Демка экрана не поддерживается на этом устройстве. Используйте камеру.';
            addErrorMessage(errMsg);
            debug(errMsg);
            logToHistory('error', errMsg);
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });
            
            if (isSharingCamera) {
                stopCameraShare();
            }
            
            localScreenStream = stream;
            screenVideo.srcObject = stream;
            screenShareContainer.classList.add('active');
            screenShareLabel.innerText = '🖥️ Демка экрана';
            screenShareBtn.classList.add('active');
            screenShareBtn.innerText = '🖥️ Идёт демка... (стоп)';
            isSharingScreen = true;
            
            closeAllVideoCalls();
            broadcastVideo(stream, 'screen');
            
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                stopScreenShare();
            });
            
            const msg = 'Демка экрана запущена';
            addSystemMessage('🖥️ ' + msg);
            debug(msg);
            logToHistory('system', msg);
            
        } catch (err) {
            console.error('Ошибка шеринга экрана:', err);
            const errMsg = 'Ошибка демки: ' + err.message;
            debug(errMsg);
            addErrorMessage('❌ ' + errMsg);
            logToHistory('error', errMsg);
        }
    }

    function stopScreenShare() {
        if (localScreenStream) {
            localScreenStream.getTracks().forEach(track => track.stop());
            localScreenStream = null;
        }
        
        closeAllVideoCalls();
        
        screenVideo.srcObject = null;
        screenShareContainer.classList.remove('active', 'blurred');
        blurred = false;
        blurScreenBtn.innerText = '🔍 Блюр';
        screenShareLabel.innerText = '📺 Трансляция';
        screenShareBtn.classList.remove('active');
        screenShareBtn.innerText = '🖥️ Демка экрана (ПК)';
        isSharingScreen = false;
        
        const msg = 'Демка экрана остановлена';
        addSystemMessage('🖥️ ' + msg);
        debug(msg);
        logToHistory('system', msg);
    }

    // ============ Камера с переключением ============
    async function startCameraShare(facingMode = 'user') {
        try {
            if (localCameraStream) {
                localCameraStream.getTracks().forEach(track => track.stop());
                localCameraStream = null;
            }
            if (isSharingScreen) {
                stopScreenShare();
            }
            
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            localCameraStream = stream;
            currentCameraFacing = facingMode;
            
            screenVideo.srcObject = stream;
            screenShareContainer.classList.add('active');
            screenShareLabel.innerText = facingMode === 'user' ? '📱 Фронтальная камера' : '📱 Основная камера';
            cameraBtn.classList.add('active');
            cameraBtn.innerText = '📱 Камера работает... (стоп)';
            switchCameraBtn.classList.add('visible');
            isSharingCamera = true;
            
            closeAllVideoCalls();
            broadcastVideo(stream, 'camera');
            
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                stopCameraShare();
            });
            
            const camName = facingMode === 'user' ? 'фронтальная' : 'основная';
            const msg = `Камера включена (${camName})`;
            addSystemMessage('📱 ' + msg);
            debug(msg);
            logToHistory('system', msg);
            
        } catch (err) {
            console.error('Ошибка камеры:', err);
            const errMsg = 'Ошибка камеры: ' + err.message;
            debug(errMsg);
            
            if (err.name === 'NotAllowedError') {
                addErrorMessage('⚠️ Доступ к камере запрещён. Разрешите в настройках браузера.');
            } else if (err.name === 'NotFoundError') {
                addErrorMessage('⚠️ Камера не найдена на устройстве.');
            } else {
                addErrorMessage('❌ ' + errMsg);
            }
            logToHistory('error', errMsg);
        }
    }

    function stopCameraShare() {
        if (localCameraStream) {
            localCameraStream.getTracks().forEach(track => track.stop());
            localCameraStream = null;
        }
        
        closeAllVideoCalls();
        
        screenVideo.srcObject = null;
        screenShareContainer.classList.remove('active', 'blurred');
        blurred = false;
        blurScreenBtn.innerText = '🔍 Блюр';
        screenShareLabel.innerText = '📺 Трансляция';
        cameraBtn.classList.remove('active');
        cameraBtn.innerText = '📱 Включить камеру';
        switchCameraBtn.classList.remove('visible');
        isSharingCamera = false;
        
        const msg = 'Камера выключена';
        addSystemMessage('📱 ' + msg);
        debug(msg);
        logToHistory('system', msg);
    }

    function switchCamera() {
        if (!isSharingCamera) return;
        const newFacing = currentCameraFacing === 'user' ? 'environment' : 'user';
        const msg = 'Переключение камеры на: ' + (newFacing === 'user' ? 'фронтальную' : 'основную');
        debug(msg);
        startCameraShare(newFacing);
    }

    // ============ Видео-звонки ============
    function broadcastVideo(stream, type) {
        dataConnections.forEach(conn => {
            const exists = videoCalls.find(c => c.peer === conn.peer);
            if (!exists && peer) {
                const call = peer.call(conn.peer, stream);
                setupVideoCall(call, conn.peer, type);
            }
        });
    }

    function setupVideoCall(call, peerId, type) {
        videoCalls.push(call);
        const peerShort = peerId.substring(0, 8);
        debug(`Видео-звонок (${type}) установлен с: ${peerShort}`);
        
        call.on('close', () => {
            videoCalls = videoCalls.filter(c => c.peer !== peerId);
            updatePeersUI();
            debug(`Видео-звонок закрыт: ${peerShort}`);
        });
        
        call.on('error', (err) => {
            const errMsg = `Ошибка видео-звонка: ${err.message}`;
            debug(errMsg);
            logToHistory('error', errMsg);
        });
    }

    function closeAllVideoCalls() {
        videoCalls.forEach(call => {
            try { call.close(); } catch(e) {}
        });
        videoCalls = [];
        updatePeersUI();
    }

    function receiveVideoStream(stream, peerId, type) {
        const peerShort = peerId.substring(0, 8);
        const typeLabel = type === 'camera' ? '📱 Камера' : '🖥️ Экран';
        
        screenShareLabel.innerText = `${typeLabel} от ${peerShort}...`;
        screenVideo.srcObject = stream;
        screenShareContainer.classList.add('active');
        
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            screenVideo.srcObject = null;
            screenShareContainer.classList.remove('active', 'blurred');
            blurred = false;
            blurScreenBtn.innerText = '🔍 Блюр';
            screenShareLabel.innerText = '📺 Трансляция';
            const msg = `${typeLabel} от ${peerShort}... завершилась`;
            addSystemMessage(msg);
            logToHistory('system', msg);
        });
        
        const msg = `${typeLabel} от ${peerShort}...`;
        addSystemMessage(msg);
        debug(`Получен видео-стрим (${type}) от: ${peerShort}`);
        logToHistory('system', msg);
    }

    // ============ Интерфейс ============
    function updatePeersUI() {
        const count = dataConnections.length + 1;
        peersCount.innerText = `👥 Участников: ${count}`;
        
        let html = `<div class="peer-item" data-peer="${myPeerId}" style="cursor:default">
            <span class="peer-dot"></span> Вы 
            <span class="avatar" data-peer="${myPeerId}">${myAvatar}</span>
        </div>`;
        
        dataConnections.forEach(conn => {
            const peerShort = conn.peer.substring(0, 8);
            const ava = getAvatar(conn.peer, usedAvatars);
            usedAvatars.add(ava);
            const hasAudio = mediaCalls.some(c => c.peer === conn.peer);
            const hasVideo = videoCalls.some(c => c.peer === conn.peer);
            const audioIcon = hasAudio ? '🔊' : '🔇';
            const videoIcon = hasVideo ? ' 📹' : '';
            
            html += `<div class="peer-item" data-peer="${conn.peer}" onclick="openDM('${conn.peer}')">
                <span class="peer-dot"></span> ${peerShort}... 
                <span class="avatar" data-peer="${conn.peer}">${ava}</span> 
                ${audioIcon}${videoIcon}
                <button class="btn-ban" onclick="event.stopPropagation();banPeer('${conn.peer}')" title="Забанить">🚫</button>
            </div>`;
        });
        
        peersList.innerHTML = html;
    }

    function addSystemMessage(text, skipSave = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg system';
        msgDiv.innerHTML = `<span>${text}</span>`;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        if (!skipSave && currentRoomName && amIHost) {
            saveMessageToHistory(currentRoomName, {
                type: 'system',
                text: text,
                time: getFullTimestamp()
            });
        }
    }

    function addErrorMessage(text, skipSave = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg error';
        msgDiv.innerHTML = `<span>${text}</span>`;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        if (!skipSave && currentRoomName) {
            saveLogToHistory(currentRoomName, {
                type: 'error',
                text: text,
                time: getFullTimestamp()
            });
        }
    }

    function addMessageToChat(text, type, peerId = '', timeStr = null, skipSave = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${type}`;
        
        if (type === 'system') {
            msgDiv.innerHTML = `<span>${text}</span>`;
        } else {
            const ava = type === 'me' ? myAvatar : getAvatar(peerId, usedAvatars);
            if (type !== 'me') {
                usedAvatars.add(ava);
            }
            const displayTime = timeStr || getTime();
            
            msgDiv.innerHTML = `
                <div class="avatar" data-peer="${type === 'me' ? myPeerId : peerId}">${ava}</div>
                <div class="msg-content">
                    <div>${escapeHtml(text)}</div>
                    <div class="msg-time">${displayTime} <span class="read-check">✓</span></div>
                </div>
            `;
        }
        
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        if (!skipSave && currentRoomName && amIHost) {
            saveMessageToHistory(currentRoomName, {
                type: 'text',
                text: text,
                from: type === 'me' ? myPeerId : (peerId || 'unknown'),
                time: timeStr || getFullTimestamp(),
                msgType: type
            });
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============ Отправка сообщений ============
    function sendMessage() {
        const text = msgInput.value.trim();
        if (!text) return;
        
        const payload = { 
            type: 'text', 
            text: text,
            from: myPeerId,
            time: getFullTimestamp(),
            read: false
        };
        
        dataConnections.forEach(conn => {
            if (conn.open) {
                conn.send(payload);
            }
        });
        
        addMessageToChat(text, 'me');
        msgInput.value = '';
        
        if (dataConnections.length === 0) {
            addSystemMessage('⚠️ Нет подключённых участников. Сообщение видно только вам.');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // ============ Data Connection ============
    function setupDataConnection(conn) {
        if (dataConnections.find(c => c.peer === conn.peer)) {
            debug('Дубликат data соединения: ' + conn.peer.substring(0, 8));
            return;
        }
        
        // Проверка бана
        if (isBanned(currentRoomName, conn.peer)) {
            conn.send({ type: 'banned' });
            conn.close();
            debug('Забаненный попытался войти: ' + conn.peer.substring(0, 8));
            return;
        }
        
        dataConnections.push(conn);
        updatePeersUI();
        
        const peerShort = conn.peer.substring(0, 8);
        const connectMsg = `Участник ${peerShort}... подключился`;
        addSystemMessage('🔗 ' + connectMsg);
        debug('Data соединение установлено: ' + peerShort);
        logToHistory('system', connectMsg);
        
        if (isSharingScreen && localScreenStream && peer) {
            setTimeout(() => {
                const call = peer.call(conn.peer, localScreenStream);
                setupVideoCall(call, conn.peer, 'screen');
            }, 500);
        }
        if (isSharingCamera && localCameraStream && peer) {
            setTimeout(() => {
                const call = peer.call(conn.peer, localCameraStream);
                setupVideoCall(call, conn.peer, 'camera');
            }, 700);
        }
        
        if (amIHost && currentRoomName) {
            setTimeout(() => {
                const history = loadMessageHistory(currentRoomName);
                if (history.length > 0) {
                    const recentHistory = history.slice(-50);
                    conn.send({
                        type: 'history',
                        messages: recentHistory,
                        from: myPeerId
                    });
                }
            }, 1000);
        }
        
        conn.on('data', (data) => {
            if (data.type === 'text') {
                addMessageToChat(data.text, 'friend', data.from || conn.peer, data.time);
                
                // Отправляем подтверждение прочтения
                conn.send({
                    type: 'read',
                    msgTime: data.time,
                    from: myPeerId
                });
                
                if (amIHost && isMegaRoom) {
                    dataConnections.forEach(c => {
                        if (c.peer !== conn.peer && c.open) {
                            c.send(data);
                        }
                    });
                }
            } else if (data.type === 'read') {
                // Обновляем галочки на своих сообщениях
                const myMessages = chatWindow.querySelectorAll('.msg.me .read-check');
                myMessages.forEach(check => {
                    const timeSpan = check.parentElement;
                    if (timeSpan && timeSpan.textContent.includes(data.msgTime)) {
                        check.textContent = '✓✓';
                        check.classList.add('double');
                    }
                });
            } else if (data.type === 'dm') {
                // Личное сообщение
                if (dmPeerId === data.from) {
                    const div = document.createElement('div');
                    div.className = 'msg friend';
                    div.innerHTML = `
                        <div class="avatar">${getAvatar(data.from, usedAvatars)}</div>
                        <div class="msg-content">
                            <div>${escapeHtml(data.text)}</div>
                            <div class="msg-time">${new Date(data.timestamp).toLocaleTimeString('ru-RU')}</div>
                        </div>
                    `;
                    dmChat.appendChild(div);
                    dmChat.scrollTop = dmChat.scrollHeight;
                }
                saveDMMessage(myPeerId, data.from, data);
            } else if (data.type === 'banned') {
                addErrorMessage('🚫 Вы были забанены в этой комнате');
                setTimeout(() => leaveRoom(), 1000);
            } else if (data.type === 'history') {
                if (data.messages && Array.isArray(data.messages)) {
                    addSystemMessage('📂 Получена история чата от хоста', true);
                    data.messages.forEach(msg => {
                        if (msg.msgType === 'me') {
                            addMessageToChat(msg.text, 'me', '', msg.time, true);
                        } else if (msg.msgType === 'friend') {
                            addMessageToChat(msg.text, 'friend', msg.from || '', msg.time, true);
                        } else if (msg.type === 'system') {
                            addSystemMessage(msg.text, true);
                        }
                    });
                    addSystemMessage('━━━ 🔽 Текущие сообщения 🔽 ━━━', true);
                }
            }
        });
        
        conn.on('close', () => {
            const peerShort = conn.peer.substring(0, 8);
            dataConnections = dataConnections.filter(c => c.peer !== conn.peer);
            
            const audioCall = mediaCalls.find(c => c.peer === conn.peer);
            if (audioCall) {
                try { audioCall.close(); } catch(e) {}
                mediaCalls = mediaCalls.filter(c => c.peer !== conn.peer);
            }
            
            const videoCall = videoCalls.find(c => c.peer === conn.peer);
            if (videoCall) {
                try { videoCall.close(); } catch(e) {}
                videoCalls = videoCalls.filter(c => c.peer !== conn.peer);
            }
            
            updatePeersUI();
            
            const disconnectMsg = `Участник ${peerShort}... отключился`;
            addSystemMessage('🔌 ' + disconnectMsg);
            debug('Data соединение закрыто: ' + peerShort);
            logToHistory('system', disconnectMsg);
            
            if (screenVideo.srcObject && videoCalls.length === 0 && !isSharingScreen && !isSharingCamera) {
                screenVideo.srcObject = null;
                screenShareContainer.classList.remove('active', 'blurred');
                blurred = false;
                blurScreenBtn.innerText = '🔍 Блюр';
                screenShareLabel.innerText = '📺 Трансляция';
            }
        });
        
        conn.on('error', (err) => {
            const errMsg = 'Ошибка data соединения: ' + err.message;
            debug(errMsg);
            logToHistory('error', errMsg);
        });
    }

    // ============ Личные сообщения (ЛС) ============
    function openDM(peerId) {
        dmPeerId = peerId;
        dmTitle.innerText = '💬 ЛС: ' + peerId.substring(0, 12) + '...';
        dmChat.innerHTML = '';
        
        const messages = loadDMMessages(myPeerId, peerId);
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `msg ${msg.from === myPeerId ? 'me' : 'friend'}`;
            div.innerHTML = `
                <div class="avatar">${msg.from === myPeerId ? myAvatar : getAvatar(msg.from, usedAvatars)}</div>
                <div class="msg-content">
                    <div>${escapeHtml(msg.text)}</div>
                    <div class="msg-time">${new Date(msg.timestamp).toLocaleTimeString('ru-RU')}</div>
                </div>
            `;
            dmChat.appendChild(div);
        });
        
        dmChat.scrollTop = dmChat.scrollHeight;
        dmOverlay.classList.add('active');
        dmMsgInput.focus();
    }

    function closeDM() {
        dmOverlay.classList.remove('active');
        dmPeerId = null;
    }

    function sendDMMessage() {
        if (!dmPeerId) return;
        const text = dmMsgInput.value.trim();
        if (!text) return;
        
        const payload = {
            type: 'dm',
            text: text,
            from: myPeerId,
            timestamp: Date.now()
        };
        
        dataConnections.forEach(conn => {
            if (conn.peer === dmPeerId && conn.open) {
                conn.send(payload);
            }
        });
        
        saveDMMessage(myPeerId, dmPeerId, payload);
        
        const div = document.createElement('div');
        div.className = 'msg me';
        div.innerHTML = `
            <div class="avatar">${myAvatar}</div>
            <div class="msg-content">
                <div>${escapeHtml(text)}</div>
                <div class="msg-time">${new Date().toLocaleTimeString('ru-RU')}</div>
            </div>
        `;
        dmChat.appendChild(div);
        dmChat.scrollTop = dmChat.scrollHeight;
        dmMsgInput.value = '';
    }

    dmCloseBtn.addEventListener('click', closeDM);
    dmSendBtn.addEventListener('click', sendDMMessage);
    dmMsgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendDMMessage();
        }
    });

    // Глобальные функции для onclick
    window.openDM = openDM;

    // ============ Бан ============
    function banPeer(peerId) {
        if (!amIHost) {
            addErrorMessage('Только хост может банить участников');
            return;
        }
        
        if (!confirm('Забанить участника ' + peerId.substring(0, 8) + '...?')) {
            return;
        }
        
        addBan(currentRoomName, peerId);
        
        const conn = dataConnections.find(c => c.peer === peerId);
        if (conn) {
            conn.send({ type: 'banned' });
            setTimeout(() => {
                try { conn.close(); } catch(e) {}
            }, 500);
        }
        
        addSystemMessage('🚫 Участник ' + peerId.substring(0, 8) + '... забанен');
        logToHistory('system', 'Забанен: ' + peerId.substring(0, 8));
    }

    window.banPeer = banPeer;

    // ============ Аудио-звонки ============
    function setupMediaCall(call) {
        const existingIdx = mediaCalls.findIndex(c => c.peer === call.peer);
        if (existingIdx >= 0) {
            try { mediaCalls[existingIdx].close(); } catch(e) {}
            mediaCalls.splice(existingIdx, 1);
        }
        
        mediaCalls.push(call);
        updatePeersUI();
        
        const audioElem = document.createElement('audio');
        audioElem.id = 'audio-' + call.peer.substring(0, 8);
        audioElem.autoplay = true;
        audioElem.playsinline = true;
        audioElem.controls = false;
        audioContainers.appendChild(audioElem);
        
        if (audioMuted) {
            audioElem.volume = 0;
        }
        
        const peerShort = call.peer.substring(0, 8);
        debug('🔊 Аудио-звонок установлен: ' + peerShort);
        
        const handleStream = (remoteStream) => {
            const audioTracks = remoteStream.getAudioTracks();
            if (audioTracks.length === 0) {
                debug('⚠️ Поток без аудио от: ' + peerShort);
                return;
            }
            
            debug('🔊 Получен аудио-поток от: ' + peerShort + ' (дорожек: ' + audioTracks.length + ')');
            
            if (audioElem.srcObject) {
                debug('🔊 Аудио уже подключено для: ' + peerShort);
                return;
            }
            
            audioElem.srcObject = remoteStream;
            detectSpeaking(remoteStream, call.peer);
            
            audioElem.play().then(() => {
                debug('🔊 Аудио играет от: ' + peerShort);
                addSystemMessage('🔊 Звук от ' + peerShort + '... работает');
                logToHistory('system', 'Звук от ' + peerShort + ' работает');
            }).catch((e) => {
                debug('👆 Ожидание клика для звука от: ' + peerShort);
                addSystemMessage('👆 Коснитесь экрана для включения звука');
            });
        };
        
        // Если поток уже пришёл — обрабатываем сразу
        if (call.peerConnection) {
            const remoteStreams = call.peerConnection.getRemoteStreams ? call.peerConnection.getRemoteStreams() : [];
            if (remoteStreams.length > 0) {
                debug('🔊 Поток уже доступен для: ' + peerShort);
                handleStream(remoteStreams[0]);
            }
        }
        
        call.on('stream', handleStream);
        
        call.on('close', () => {
            mediaCalls = mediaCalls.filter(c => c.peer !== call.peer);
            audioElem.remove();
            updatePeersUI();
            debug('🔊 Аудио-звонок закрыт: ' + peerShort);
        });
        
        call.on('error', (err) => {
            const errMsg = 'Ошибка аудио-звонка: ' + err.message;
            debug(errMsg);
            logToHistory('error', errMsg);
        });
    }

    function callPeerAudio(peerId) {
        if (!localAudioStream) {
            debug('Нет микрофона для звонка к: ' + peerId.substring(0, 8));
            return;
        }
        
        if (!peer || !peer.id) {
            debug('Peer не готов для звонка');
            return;
        }
        
        const oldCall = mediaCalls.find(c => c.peer === peerId);
        if (oldCall) {
            try { oldCall.close(); } catch(e) {}
            mediaCalls = mediaCalls.filter(c => c.peer !== peerId);
        }
        
        debug('📞 Звоним аудио: ' + peerId.substring(0, 8));
        const call = peer.call(peerId, localAudioStream);
        setupMediaCall(call);
    }

    function refreshAllAudio() {
        debug('🔄 Переподключение звука...');
        logToHistory('system', 'Ручное переподключение звука');
        
        mediaCalls.forEach(call => {
            try { call.close(); } catch(e) {}
        });
        mediaCalls = [];
        
        audioContainers.innerHTML = '';
        
        if (amIHost) {
            dataConnections.forEach(conn => {
                setTimeout(() => {
                    callPeerAudio(conn.peer);
                }, 300);
            });
            addSystemMessage('🔄 Хост переподключает звук всем участникам...');
        } else if (hostPeerId) {
            setTimeout(() => {
                callPeerAudio(hostPeerId);
            }, 300);
            addSystemMessage('🔄 Переподключение звука к хосту...');
        }
        
        if (isSharingScreen && localScreenStream) {
            closeAllVideoCalls();
            setTimeout(() => broadcastVideo(localScreenStream, 'screen'), 500);
        }
        if (isSharingCamera && localCameraStream) {
            closeAllVideoCalls();
            setTimeout(() => broadcastVideo(localCameraStream, 'camera'), 700);
        }
        
        updatePeersUI();
    }

    refreshAudioBtn.addEventListener('click', refreshAllAudio);

    // ============ PeerJS инициализация ============
    function initPeer(myId, hostId = null) {
        if (peer) {
            peer.destroy();
        }
        
        debug('Инициализация PeerJS: ' + myId.substring(0, 16));
        logToHistory('system', 'Инициализация PeerJS');
        
        peer = new Peer(myId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ],
                iceCandidatePoolSize: 2
            }
        });
        
        peer.on('open', async (id) => {
            myPeerId = id;
            myAvatar = getAvatar(id, usedAvatars);
            usedAvatars.add(myAvatar);
            statusDisplay.innerText = '🟢 Онлайн';
            debug('Peer открыт: ' + id.substring(0, 16));
            logToHistory('system', 'Peer открыт, ID: ' + id.substring(0, 16));
            updatePeersUI();
            
            await getMicrophone();
            
            if (amIHost && currentRoomName && !historyRestored) {
                restoreHistoryToChat(currentRoomName);
                historyRestored = true;
                updateHistoryInfo(currentRoomName);
            }
            
            if (!amIHost && hostId) {
                hostPeerId = hostId;
                statusDisplay.innerText = '🔗 Подключение к хосту...';
                debug('Подключаюсь к хосту: ' + hostId.substring(0, 16));
                logToHistory('system', 'Подключение к хосту: ' + hostId.substring(0, 16));
                
                const conn = peer.connect(hostId, {
                    reliable: true
                });
                setupDataConnection(conn);
                
                // ГОСТЬ САМ ЗВОНИТ ХОСТУ
                if (localAudioStream) {
                    setTimeout(() => {
                        debug('📞 ГОСТЬ звонит хосту со своим аудио');
                        callPeerAudio(hostId);
                    }, 1500);
                }
            }
        });
        
        peer.on('connection', (conn) => {
            debug('Входящее соединение: ' + conn.peer.substring(0, 16));
            logToHistory('system', 'Входящее соединение от: ' + conn.peer.substring(0, 16));
            setupDataConnection(conn);
            
            // ХОСТ ТОЖЕ ЗВОНИТ ГОСТЮ
            if (amIHost && localAudioStream) {
                setTimeout(() => {
                    const hasAudio = mediaCalls.some(c => c.peer === conn.peer);
                    if (!hasAudio) {
                        debug('📞 ХОСТ звонит гостю');
                        callPeerAudio(conn.peer);
                    }
                }, 2000);
            }
        });
        
        peer.on('call', (call) => {
            debug('📞 Входящий звонок от: ' + call.peer.substring(0, 16));
            
            // ВСЕГДА отвечаем с аудио
            if (localAudioStream) {
                call.answer(localAudioStream);
                debug('📞 Отвечаем с локальным аудио');
            } else {
                call.answer();
                debug('📞 Отвечаем без аудио');
            }
            
            // Ждём 500мс чтобы PeerJS обработал answer, затем проверяем поток
            setTimeout(() => {
                let gotStream = false;
                
                try {
                    if (call.peerConnection) {
                        const remoteStreams = [];
                        if (call.peerConnection.getRemoteStreams) {
                            const streams = call.peerConnection.getRemoteStreams();
                            streams.forEach(s => remoteStreams.push(s));
                        }
                        
                        if (remoteStreams.length > 0) {
                            gotStream = true;
                            const remoteStream = remoteStreams[0];
                            
                            if (remoteStream.getVideoTracks().length > 0) {
                                const videoTrack = remoteStream.getVideoTracks()[0];
                                const label = videoTrack.label || '';
                                
                                let videoType = 'screen';
                                if (label.toLowerCase().includes('camera') || 
                                    label.toLowerCase().includes('front') || 
                                    label.toLowerCase().includes('back') ||
                                    label.toLowerCase().includes('камера')) {
                                    videoType = 'camera';
                                }
                                
                                receiveVideoStream(remoteStream, call.peer, videoType);
                                setupVideoCall(call, call.peer, videoType);
                            } else if (remoteStream.getAudioTracks().length > 0) {
                                setupMediaCall(call);
                                const mediaCall = mediaCalls.find(c => c.peer === call.peer);
                                if (mediaCall) {
                                    call.emit('stream', remoteStream);
                                }
                            }
                        }
                    }
                } catch(e) {
                    debug('📞 Ошибка проверки потока: ' + e.message);
                }
                
                // Если поток не получен сразу — ждём через событие
                if (!gotStream) {
                    debug('📞 Поток ещё не доступен, ждём событие stream для: ' + call.peer.substring(0, 8));
                    
                    call.on('stream', (remoteStream) => {
                        debug('📞 Событие stream для: ' + call.peer.substring(0, 8));
                        
                        if (remoteStream.getVideoTracks().length > 0) {
                            const videoTrack = remoteStream.getVideoTracks()[0];
                            const label = videoTrack.label || '';
                            
                            let videoType = 'screen';
                            if (label.toLowerCase().includes('camera') || 
                                label.toLowerCase().includes('front') || 
                                label.toLowerCase().includes('back') ||
                                label.toLowerCase().includes('камера')) {
                                videoType = 'camera';
                            }
                            
                            receiveVideoStream(remoteStream, call.peer, videoType);
                            setupVideoCall(call, call.peer, videoType);
                        } else {
                            setupMediaCall(call);
                            const mediaCall = mediaCalls.find(c => c.peer === call.peer);
                            if (mediaCall) {
                                call.emit('stream', remoteStream);
                            }
                        }
                    });
                }
            }, 500);
        });
        
        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            const errMsg = 'Ошибка PeerJS: ' + err.type + ' - ' + (err.message || '');
            debug(errMsg);
            
            if (err.type === 'peer-unavailable') {
                statusDisplay.innerText = '❌ Комната не найдена';
                addErrorMessage('⚠️ Хост не в сети. Проверьте название комнаты.');
            } else if (err.type === 'disconnected') {
                statusDisplay.innerText = '🔴 Соединение потеряно';
                addErrorMessage('🔴 Соединение с сигнальным сервером потеряно.');
            } else {
                statusDisplay.innerText = '❌ Ошибка: ' + err.type;
                addErrorMessage('❌ ' + errMsg);
            }
            
            logToHistory('error', errMsg);
        });
        
        peer.on('disconnected', () => {
            statusDisplay.innerText = '🔴 Отключён от сервера';
            const msg = 'Отключён от сигнального сервера. Нажмите "Покинуть комнату" и зайдите заново.';
            addErrorMessage('🔴 ' + msg);
            debug(msg);
            logToHistory('error', msg);
        });
    }

    // ============ Старт сессии ============
    async function startSession(role, megaMode) {
        const roomName = roomInput.value.trim();
        if (!roomName) {
            alert('Введите название комнаты!');
            return;
        }
        
        isMegaRoom = megaMode;
        amIHost = (role === 'host');
        hostPeerId = null;
        currentRoomName = roomName;
        historyRestored = false;
        usedAvatars.clear();
        
        loginOverlay.style.display = 'none';
        roomDisplay.innerText = roomName + (isMegaRoom ? ' 🔥MEGA' : '');
        statusDisplay.innerText = '⏳ Инициализация...';
        
        chatWindow.innerHTML = '';
        addSystemMessage('⏳ Подготовка комнаты...');
        
        const randomId = Math.random().toString(36).substring(2, 6);
        let myId = '';
        let targetHostId = null;
        
        if (amIHost) {
            myId = await hashRoomName(roomName, 'host');
            statusDisplay.innerText = '🏠 Создаю комнату...';
            debug('Создание комнаты. ID хоста: ' + myId.substring(0, 16));
        } else {
            targetHostId = await hashRoomName(roomName, 'host');
            hostPeerId = targetHostId;
            myId = (await hashRoomName(roomName, 'guest')) + '_' + randomId;
            statusDisplay.innerText = '🔍 Ищу комнату...';
            debug('Поиск комнаты. ID хоста: ' + targetHostId.substring(0, 16));
        }
        
        initPeer(myId, targetHostId);
    }

    // ============ Выход из комнаты ============
    function leaveRoom() {
        debug('Выход из комнаты...');
        logToHistory('system', 'Выход из комнаты');
        
        stopScreenShare();
        stopCameraShare();
        
        mediaCalls.forEach(call => {
            try { call.close(); } catch(e) {}
        });
        mediaCalls = [];
        
        videoCalls.forEach(call => {
            try { call.close(); } catch(e) {}
        });
        videoCalls = [];
        
        dataConnections.forEach(conn => {
            try { conn.close(); } catch(e) {}
        });
        dataConnections = [];
        
        if (peer) {
            peer.destroy();
            peer = null;
        }
        
        audioContainers.innerHTML = '';
        localAudioStream = null;
        rawMicStream = null;
        localScreenStream = null;
        localCameraStream = null;
        hostPeerId = null;
        isSharingScreen = false;
        isSharingCamera = false;
        micMuted = false;
        audioMuted = false;
        blurred = false;
        
        screenVideo.srcObject = null;
        screenShareContainer.classList.remove('active', 'blurred');
        screenShareLabel.innerText = '📺 Трансляция';
        screenShareBtn.classList.remove('active');
        screenShareBtn.innerText = '🖥️ Демка экрана (ПК)';
        cameraBtn.classList.remove('active');
        cameraBtn.innerText = '📱 Включить камеру';
        switchCameraBtn.classList.remove('visible');
        muteMicBtn.classList.remove('active');
        muteMicBtn.innerText = '🎤 Микрофон вкл';
        muteAudioBtn.classList.remove('active');
        muteAudioBtn.innerText = '🔊 Звук вкл';
        blurScreenBtn.innerText = '🔍 Блюр';
        usedAvatars.clear();
        
        updatePeersUI();
        chatWindow.innerHTML = '<div class="msg system">💬 Вы вышли из комнаты</div>';
        
        loginOverlay.style.display = 'flex';
        roomDisplay.innerText = '---';
        statusDisplay.innerText = 'Ожидание...';
        debugInfo.innerText = '';
        historyInfo.innerText = '';
        
        currentRoomName = '';
        historyRestored = false;
        
        // Закрываем ЛС если открыто
        closeDM();
    }

    // ============ Громкость ============
    myVolSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        myVolTxt.innerText = val + '%';
        if (gainNode) {
            gainNode.gain.value = val / 100;
        }
    });

    // ============ Кнопки ============
    screenShareBtn.addEventListener('click', () => {
        if (isSharingScreen) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    });

    cameraBtn.addEventListener('click', () => {
        if (isSharingCamera) {
            stopCameraShare();
        } else {
            startCameraShare('user');
        }
    });

    switchCameraBtn.addEventListener('click', switchCamera);

    stopScreenBtn.addEventListener('click', () => {
        if (isSharingScreen) stopScreenShare();
        if (isSharingCamera) stopCameraShare();
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (currentRoomName && confirm('Очистить всю историю чата и логов для этой комнаты?')) {
            clearRoomHistory(currentRoomName);
            addSystemMessage('🗑️ История очищена');
            chatWindow.innerHTML = '';
            addSystemMessage('🗑️ История очищена. Новые сообщения будут сохраняться.');
        }
    });

    leaveBtn.addEventListener('click', leaveRoom);

    createRoomBtn.addEventListener('click', () => startSession('host', false));
    createMegaBtn.addEventListener('click', () => startSession('host', true));
    joinRoomBtn.addEventListener('click', () => startSession('guest', false));

    roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startSession('guest', false);
        }
    });

    // ============ Глобальная разблокировка звука ============
    document.addEventListener('click', () => {
        ensureAudio();
        const audios = audioContainers.querySelectorAll('audio');
        audios.forEach(a => {
            if (a.paused && a.srcObject) {
                a.play().catch(() => {});
            }
        });
    });

    document.addEventListener('touchstart', () => {
        ensureAudio();
    }, { once: true });

    // ============ Восстановление последней комнаты ============
    window.addEventListener('beforeunload', () => {
        if (currentRoomName && amIHost) {
            try {
                sessionStorage.setItem('last_room', currentRoomName);
                sessionStorage.setItem('last_role', 'host');
                sessionStorage.setItem('last_mega', isMegaRoom.toString());
            } catch (e) {}
        }
    });

    (function checkPreviousSession() {
        try {
            const lastRoom = sessionStorage.getItem('last_room');
            const lastRole = sessionStorage.getItem('last_role');
            const lastMega = sessionStorage.getItem('last_mega');
            
            if (lastRoom && lastRole) {
                const quickJoin = document.createElement('button');
                quickJoin.style.cssText = 'background:#ff0000;color:#ffffff;margin-top:8px;font-size:0.8em;border:1px solid #ff4444;';
                quickJoin.innerText = `⚡ Вернуться в "${lastRoom}"`;
                quickJoin.addEventListener('click', () => {
                    roomInput.value = lastRoom;
                    startSession(lastRole, lastMega === 'true');
                });
                
                const loginCard = document.querySelector('.login-card');
                if (loginCard) {
                    loginCard.appendChild(quickJoin);
                }
                
                sessionStorage.removeItem('last_room');
                sessionStorage.removeItem('last_role');
                sessionStorage.removeItem('last_mega');
            }
        } catch (e) {}
    })();

    console.log('✅ P2P Мега-Комнаты v3.0 | Полный комплект функций');
</script>
