// ==================== PUZOCHAT ENGINE ====================
const APP_NAME = "PuzoChat";
const OBF_KEY = "1488puzochat_plexo_hueglot_sukabank_zaebis";

// Шифрование
function encryptData(data) {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(data.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
    }
    return btoa(encrypted);
}

function decryptData(encrypted) {
    try {
        let decoded = atob(encrypted);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
        }
        return decrypted;
    } catch(e) { return null; }
}

function generateHash(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

function secureSave(key, data) {
    let jsonData = JSON.stringify(data);
    let encrypted = encryptData(jsonData);
    let hash = generateHash(jsonData + OBF_KEY);
    localStorage.setItem(key + '_encrypted', encrypted);
    localStorage.setItem(key + '_hash', hash);
}

function secureLoad(key) {
    let encrypted = localStorage.getItem(key + '_encrypted');
    let savedHash = localStorage.getItem(key + '_hash');
    if (!encrypted || !savedHash) return null;
    let decrypted = decryptData(encrypted);
    if (!decrypted) return null;
    let calculatedHash = generateHash(decrypted + OBF_KEY);
    if (calculatedHash !== savedHash) {
        localStorage.removeItem(key + '_encrypted');
        localStorage.removeItem(key + '_hash');
        return null;
    }
    try { return JSON.parse(decrypted); } catch(e) { return null; }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

// Данные
let users = secureLoad('puzochat_users') || {};
let chats = secureLoad('puzochat_chats') || {};
let channels = secureLoad('puzochat_channels') || {};
let currentUser = secureLoad('puzochat_current_user') || null;
let currentChat = null;
let profileUsername = null;

// Инициализация
function initSystem() {
    if (!users['plexo']) {
        users['plexo'] = {
            username: 'plexo',
            password: hashPassword('admin1488'),
            role: 'owner',
            badge: '👑',
            color: 'gold',
            signature: { text: '🔴 DEV', color: '#ff0000', background: '#330000', border: '1px solid #ff0000' },
            createdAt: '2024-06-20',
            chats: ['dm_plexo_puzochattp', 'dm_plexo_hueglot'],
            channels: ['puzochat'],
            permissions: ['*'],
            banned: false,
            muted: false,
            bio: 'Создатель PuzoChat. Король Дохерархии.',
            balance: '5221 бесконечностей'
        };
    }
    if (!users['puzochattp']) {
        users['puzochattp'] = {
            username: 'puzochattp',
            password: hashPassword('support1488'),
            role: 'support',
            badge: '🔧',
            color: 'green',
            signature: { text: '🔵 OFFICIAL', color: '#0088ff', background: '#001133', border: '1px solid #0088ff' },
            createdAt: '2024-06-20',
            chats: ['dm_plexo_puzochattp'],
            channels: ['puzochat'],
            permissions: ['answer', 'help'],
            banned: false,
            muted: false,
            isBot: true,
            bio: 'Официальная поддержка PuzoChat.',
            balance: '1488 дохерархи',
            autoAnswers: {
                'помощь': '📋 Команды: /help, /balance, /rules',
                'привет': '🔵 Привет! Я поддержка PuzoChat!',
                'баланс': '💰 Проверь баланс в депоказике!',
                'правила': '📜 Правила: 1. Деп 2. Додеп 3. Не материться'
            }
        };
    }
    if (!users['hueglot']) {
        users['hueglot'] = {
            username: 'hueglot',
            password: hashPassword('dep1488'),
            role: 'moderator',
            badge: '🐕',
            color: 'orange',
            signature: { text: '🐕 GUARD', color: '#ff8800', background: '#331100', border: '1px solid #ff8800' },
            createdAt: '2024-06-20',
            chats: ['dm_plexo_hueglot'],
            channels: ['puzochat'],
            permissions: ['ban', 'mute'],
            banned: false,
            muted: false,
            isBot: true,
            bio: 'Главный по выигрышам. ГАВ!',
            balance: 'бесконечность',
            autoAnswers: {
                'привет': '🐕 ГАВ! ДЕП, А ПОТОМ ДОДЕП!',
                'как дела': '🐕 Отлично! Охраняю!',
                'кто ты': '🐕 Я Hueglot - главный по выигрышам!'
            }
        };
    }
    if (!channels['puzochat']) {
        channels['puzochat'] = {
            id: 'puzochat',
            name: '📢 PuzoChat Новости',
            description: 'Официальный канал PuzoChat.',
            owner: 'plexo',
            subscribers: ['plexo', 'puzochattp', 'hueglot'],
            posts: [{
                id: 1,
                author: 'plexo',
                content: '🚀 Добро пожаловать в PuzoChat!',
                time: new Date().toISOString(),
                likes: ['hueglot'],
                reposts: [],
                comments: []
            }]
        };
    }
    if (!chats['dm_plexo_puzochattp']) {
        chats['dm_plexo_puzochattp'] = {
            id: 'dm_plexo_puzochattp',
            type: 'dm',
            participants: ['plexo', 'puzochattp'],
            messages: [{ id: 1, from: 'puzochattp', text: '🔵 Привет! Я поддержка!', time: new Date().toISOString() }]
        };
    }
    if (!chats['dm_plexo_hueglot']) {
        chats['dm_plexo_hueglot'] = {
            id: 'dm_plexo_hueglot',
            type: 'dm',
            participants: ['plexo', 'hueglot'],
            messages: [{ id: 1, from: 'hueglot', text: '🐕 ГАВ! ДЕП, А ПОТОМ ДОДЕП!', time: new Date().toISOString() }]
        };
    }
    saveAllData();
}

function saveAllData() {
    secureSave('puzochat_users', users);
    secureSave('puzochat_chats', chats);
    secureSave('puzochat_channels', channels);
    if (currentUser) secureSave('puzochat_current_user', currentUser);
}

// Авторизация
function login() {
    let username = document.getElementById('reg-username').value.trim();
    let password = document.getElementById('reg-password').value.trim();
    if (!username || !password) { alert('Введи юзернейм и пароль!'); return; }
    if (!users[username]) { alert('Юзер не найден!'); return; }
    if (users[username].password !== hashPassword(password)) { alert('Неверный пароль!'); return; }
    if (users[username].banned) { alert('Ты забанен!'); return; }
    currentUser = users[username];
    saveAllData();
    document.getElementById('auth-modal').style.display = 'none';
    renderApp();
}

function register() {
    let username = document.getElementById('reg-username').value.trim();
    let password = document.getElementById('reg-password').value.trim();
    if (!username || !password) { alert('Введи юзернейм и пароль!'); return; }
    if (users[username]) { alert('Юзер уже существует!'); return; }
    if (username.length < 3) { alert('Минимум 3 символа!'); return; }
    
    users[username] = {
        username: username,
        password: hashPassword(password),
        role: 'user',
        badge: '',
        color: 'gray',
        signature: null,
        createdAt: new Date().toISOString(),
        chats: [],
        channels: ['puzochat'],
        permissions: [],
        banned: false,
        muted: false,
        bio: 'Новый юзер PuzoChat',
        balance: '0'
    };
    
    // Чат с поддержкой
    let supportChatId = 'dm_' + [username, 'puzochattp'].sort().join('_');
    if (!chats[supportChatId]) {
        chats[supportChatId] = {
            id: supportChatId,
            type: 'dm',
            participants: [username, 'puzochattp'],
            messages: [{ id: Date.now(), from: 'puzochattp', text: '🔵 Привет! Добро пожаловать в PuzoChat!', time: new Date().toISOString() }]
        };
        users[username].chats.push(supportChatId);
        if (!users['puzochattp'].chats.includes(supportChatId)) {
            users['puzochattp'].chats.push(supportChatId);
        }
    }
    
    if (!channels['puzochat'].subscribers.includes(username)) {
        channels['puzochat'].subscribers.push(username);
    }
    
    currentUser = users[username];
    saveAllData();
    document.getElementById('auth-modal').style.display = 'none';
    renderApp();
    alert('✅ Регистрация успешна!');
}

function logout() {
    currentUser = null;
    currentChat = null;
    localStorage.removeItem('puzochat_current_user_encrypted');
    localStorage.removeItem('puzochat_current_user_hash');
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('input-area').style.display = 'none';
    document.getElementById('messages').innerHTML = '<div class="welcome-screen"><h1>💬 PuzoChat</h1><p>Войдите в аккаунт!</p></div>';
}

// Рендер
function renderApp() {
    if (!currentUser) {
        document.getElementById('auth-modal').style.display = 'flex';
        return;
    }
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('current-user-badge').innerText = currentUser.badge || '';
    document.getElementById('current-user-name').innerText = currentUser.username;
    renderChatList();
    if (currentChat) {
        if (chats[currentChat]) {
            document.getElementById('input-area').style.display = 'flex';
            renderChat();
        } else if (channels[currentChat]) {
            document.getElementById('input-area').style.display = 'flex';
            renderChannel();
        }
    }
}

function renderChatList() {
    let list = document.getElementById('chat-list');
    list.innerHTML = '';
    
    (currentUser.chats || []).forEach(chatId => {
        if (!chats[chatId]) return;
        let chat = chats[chatId];
        let otherUser = chat.participants.find(p => p !== currentUser.username);
        let otherUserData = users[otherUser];
        if (!otherUserData) return;
        let lastMsg = chat.messages[chat.messages.length - 1];
        let div = document.createElement('div');
        div.className = 'chat-item' + (currentChat === chatId ? ' active' : '');
        div.onclick = () => openChat(chatId);
        div.innerHTML = `
            <div class="avatar">${otherUserData.badge || '👤'}</div>
            <div class="chat-info">
                <div class="chat-name">${chat.name || otherUserData.username}</div>
                <div class="chat-last">${lastMsg ? lastMsg.text.substring(0, 30) : 'Нет сообщений'}</div>
            </div>
            <div class="chat-meta">
                ${otherUserData.signature ? `<span class="signature-badge" style="color:${otherUserData.signature.color};background:${otherUserData.signature.background};border:${otherUserData.signature.border}">${otherUserData.signature.text}</span>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
    
    (currentUser.channels || []).forEach(channelId => {
        if (!channels[channelId]) return;
        let channel = channels[channelId];
        let div = document.createElement('div');
        div.className = 'chat-item' + (currentChat === channelId ? ' active' : '');
        div.onclick = () => openChannel(channelId);
        div.innerHTML = `
            <div class="avatar">📢</div>
            <div class="chat-info">
                <div class="chat-name">${channel.name}</div>
                <div class="chat-last">${channel.description || ''}</div>
            </div>
        `;
        list.appendChild(div);
    });
}

function openChat(chatId) {
    currentChat = chatId;
    document.getElementById('input-area').style.display = 'flex';
    renderChatList();
    renderChat();
}

function openChannel(channelId) {
    currentChat = channelId;
    document.getElementById('input-area').style.display = 'flex';
    renderChatList();
    renderChannel();
}

function renderChat() {
    if (!currentChat || !chats[currentChat]) return;
    let chat = chats[currentChat];
    let otherUser = chat.participants.find(p => p !== currentUser.username);
    let otherUserData = users[otherUser];
    
    document.getElementById('chat-avatar').innerText = otherUserData?.badge || '👤';
    document.getElementById('chat-name').innerText = chat.name || otherUserData?.username || 'Чат';
    document.getElementById('chat-status').innerText = otherUserData?.isBot ? '🤖 Бот' : '🟢 Онлайн';
    
    let messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    chat.messages.forEach(msg => {
        let isSent = msg.from === currentUser.username;
        let userData = users[msg.from];
        let div = document.createElement('div');
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.innerHTML = `
            ${!isSent ? `<span class="username" style="color:${userData?.color||'#fff'}">${userData?.badge||''} ${msg.from}</span>` : ''}
            ${userData?.signature ? `<span class="badge" style="color:${userData.signature.color};background:${userData.signature.background};border:${userData.signature.border}">${userData.signature.text}</span>` : ''}
            <div>${msg.text}</div>
            <div class="time">${formatTime(msg.time)}</div>
        `;
        messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function renderChannel() {
    if (!currentChat || !channels[currentChat]) return;
    let channel = channels[currentChat];
    
    document.getElementById('chat-avatar').innerText = '📢';
    document.getElementById('chat-name').innerText = channel.name;
    document.getElementById('chat-status').innerText = `${channel.subscribers.length} подписчиков`;
    
    let messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    channel.posts.forEach(post => {
        let userData = users[post.author];
        let div = document.createElement('div');
        div.className = 'message received';
        div.style.maxWidth = '100%';
        div.innerHTML = `
            <span class="username" style="color:${userData?.color||'#fff'}">${userData?.badge||''} ${post.author}</span>
            ${userData?.signature ? `<span class="badge" style="color:${userData.signature.color};background:${userData.signature.background};border:${userData.signature.border}">${userData.signature.text}</span>` : ''}
            <div>${post.content}</div>
            <div style="display:flex;gap:15px;margin-top:10px;">
                <span>👍 ${post.likes.length}</span>
                <span>🔄 ${post.reposts.length}</span>
                <span>💬 ${post.comments.length}</span>
            </div>
            <div class="time">${formatTime(post.time)}</div>
        `;
        messagesDiv.appendChild(div);
    });
}

function sendMessage() {
    if (!currentChat) return;
    let input = document.getElementById('message-input');
    let text = input.value.trim();
    if (!text) return;
    
    if (channels[currentChat]) {
        // Пишем в канал
        channels[currentChat].posts.push({
            id: Date.now(),
            author: currentUser.username,
            content: text,
            time: new Date().toISOString(),
            likes: [],
            reposts: [],
            comments: []
        });
        secureSave('puzochat_channels', channels);
        input.value = '';
        renderChannel();
    } else if (chats[currentChat]) {
        // Пишем в чат
        chats[currentChat].messages.push({
            id: Date.now(),
            from: currentUser.username,
            text: text,
            time: new Date().toISOString()
        });
        secureSave('puzochat_chats', chats);
        input.value = '';
        renderChat();
        
        // Авто-ответ от ботов
        let chat = chats[currentChat];
        let otherUser = chat.participants.find(p => p !== currentUser.username);
        let otherUserData = users[otherUser];
        if (otherUserData?.isBot && otherUserData?.autoAnswers) {
            setTimeout(() => {
                let reply = getBotReply(otherUserData, text);
                if (reply) {
                    chat.messages.push({
                        id: Date.now(),
                        from: otherUser,
                        text: reply,
                        time: new Date().toISOString()
                    });
                    secureSave('puzochat_chats', chats);
                    renderChat();
                }
            }, 1000);
        }
    }
}

function getBotReply(botData, msg) {
    msg = msg.toLowerCase();
    for (let keyword in botData.autoAnswers) {
        if (msg.includes(keyword)) return botData.autoAnswers[keyword];
    }
    return null;
}

function openProfile(username) {
    if (!username || !users[username]) return;
    profileUsername = username;
    let user = users[username];
    document.getElementById('profile-avatar').innerText = user.badge || '👤';
    document.getElementById('profile-name').innerText = user.username;
    document.getElementById('profile-badge').innerHTML = user.signature ?
        `<span class="signature-badge" style="color:${user.signature.color};background:${user.signature.background};border:${user.signature.border}">${user.signature.text}</span>` : '';
    document.getElementById('profile-bio').innerText = user.bio || '';
    document.getElementById('profile-balance').innerText = user.balance || '0';
    
    let actions = document.getElementById('profile-actions');
    actions.innerHTML = '';
    
    if (username !== currentUser.username) {
        actions.innerHTML += `<button onclick="openDM('${username}')">✉️ Написать</button>`;
    }
    
    if (username === currentUser.username || currentUser.username === 'plexo') {
        actions.innerHTML += `<button onclick="editProfile('${username}')">✏️ Редактировать профиль</button>`;
    }
    
    if (currentUser.username === 'plexo' && username !== 'plexo') {
        actions.innerHTML += `<button onclick="toggleBan('${username}')">${user.banned ? '✅ Разбанить' : '🚫 Забанить'}</button>`;
        actions.innerHTML += `<button onclick="giveSignature('${username}')">🏷️ Выдать подпись</button>`;
    }
    
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfile() {
    document.getElementById('profile-modal').style.display = 'none';
}

function editProfile(username) {
    if (username !== currentUser.username && currentUser.username !== 'plexo') {
        alert('❌ Только владелец профиля или админ могут редактировать!');
        return;
    }
    
    let user = users[username];
    document.getElementById('edit-title').innerText = '✏️ Редактировать профиль';
    document.getElementById('edit-content').innerHTML = `
        <label>Био:</label>
        <textarea id="edit-bio">${user.bio || ''}</textarea>
        <label>Баланс (для отображения):</label>
        <input type="text" id="edit-balance" value="${user.balance || '0'}">
        <button onclick="saveProfileEdit('${username}')">💾 Сохранить</button>
    `;
    document.getElementById('edit-modal').style.display = 'flex';
    document.getElementById('profile-modal').style.display = 'none';
}

function saveProfileEdit(username) {
    let bio = document.getElementById('edit-bio').value.trim();
    let balance = document.getElementById('edit-balance').value.trim();
    
    users[username].bio = bio;
    users[username].balance = balance;
    secureSave('puzochat_users', users);
    
    if (username === currentUser.username) currentUser = users[username];
    
    document.getElementById('edit-modal').style.display = 'none';
    openProfile(username);
    alert('✅ Профиль обновлён!');
}

function toggleBan(username) {
    if (currentUser.username !== 'plexo') return;
    users[username].banned = !users[username].banned;
    secureSave('puzochat_users', users);
    alert(users[username].banned ? `🚫 @${username} забанен!` : `✅ @${username} разбанен!`);
    openProfile(username);
}

function giveSignature(username) {
    if (currentUser.username !== 'plexo') return;
    
    let sigs = {
        'dev': { text: '🔴 DEV', color: '#ff0000', background: '#330000', border: '1px solid #ff0000' },
        'official': { text: '🔵 OFFICIAL', color: '#0088ff', background: '#001133', border: '1px solid #0088ff' },
        'guard': { text: '🐕 GUARD', color: '#ff8800', background: '#331100', border: '1px solid #ff8800' },
        'junior': { text: '💻 JUNIOR', color: '#888888', background: '#222222', border: '1px solid #555555' },
        'none': null
    };
    
    let html = '<select id="sig-select">';
    for (let key in sigs) {
        html += `<option value="${key}">${key === 'none' ? 'Без подписи' : sigs[key].text}</option>`;
    }
    html += '</select><button onclick="saveSignature(\'' + username + '\')">💾 Выдать</button>';
    
    document.getElementById('edit-title').innerText = '🏷️ Выдать подпись';
    document.getElementById('edit-content').innerHTML = html;
    document.getElementById('edit-modal').style.display = 'flex';
}

function saveSignature(username) {
    let sigType = document.getElementById('sig-select').value;
    let sigs = {
        'dev': { text: '🔴 DEV', color: '#ff0000', background: '#330000', border: '1px solid #ff0000' },
        'official': { text: '🔵 OFFICIAL', color: '#0088ff', background: '#001133', border: '1px solid #0088ff' },
        'guard': { text: '🐕 GUARD', color: '#ff8800', background: '#331100', border: '1px solid #ff8800' },
        'junior': { text: '💻 JUNIOR', color: '#888888', background: '#222222', border: '1px solid #555555' }
    };
    
    users[username].signature = sigs[sigType] || null;
    secureSave('puzochat_users', users);
    document.getElementById('edit-modal').style.display = 'none';
    alert(`✅ Подпись выдана @${username}!`);
}

function openDM(username) {
    if (!users[username]) return;
    let chatId = 'dm_' + [currentUser.username, username].sort().join('_');
    if (!chats[chatId]) {
        chats[chatId] = {
            id: chatId,
            type: 'dm',
            participants: [currentUser.username, username],
            messages: []
        };
        if (!currentUser.chats.includes(chatId)) currentUser.chats.push(chatId);
        if (!users[username].chats.includes(chatId)) users[username].chats.push(chatId);
        secureSave('puzochat_chats', chats);
        secureSave('puzochat_users', users);
    }
    openChat(chatId);
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('search-modal').style.display = 'none';
}

function showCreateMenu() {
    document.getElementById('create-modal').style.display = 'flex';
}

function closeCreateMenu() {
    document.getElementById('create-modal').style.display = 'none';
}

function createChannel() {
    let name = prompt('Название канала:');
    if (!name) return;
    let id = 'ch_' + Date.now();
    channels[id] = {
        id: id,
        name: name,
        description: '',
        owner: currentUser.username,
        subscribers: [currentUser.username],
        posts: []
    };
    if (!currentUser.channels) currentUser.channels = [];
    currentUser.channels.push(id);
    secureSave('puzochat_channels', channels);
    secureSave('puzochat_users', users);
    closeCreateMenu();
    openChannel(id);
    renderChatList();
    alert('📢 Канал создан!');
}

function createGroupChat() {
    let name = prompt('Название чата:');
    if (!name) return;
    let id = 'gc_' + Date.now();
    chats[id] = {
        id: id,
        type: 'group',
        name: name,
        participants: [currentUser.username],
        messages: []
    };
    if (!currentUser.chats) currentUser.chats = [];
    currentUser.chats.push(id);
    secureSave('puzochat_chats', chats);
    secureSave('puzochat_users', users);
    closeCreateMenu();
    openChat(id);
    renderChatList();
    alert('👥 Групповой чат создан!');
}

function startDM() {
    let username = prompt('Юзернейм:');
    if (!username || !users[username]) {
        alert('Юзер не найден!');
        return;
    }
    openDM(username);
    closeCreateMenu();
}

function editCurrentChat() {
    if (!currentChat) return;
    
    if (channels[currentChat]) {
        let channel = channels[currentChat];
        if (channel.owner !== currentUser.username && currentUser.username !== 'plexo') {
            alert('❌ Только владелец может редактировать!');
            return;
        }
        document.getElementById('edit-title').innerText = '✏️ Редактировать канал';
        document.getElementById('edit-content').innerHTML = `
            <label>Название:</label>
            <input type="text" id="edit-name" value="${channel.name}">
            <label>Описание:</label>
            <textarea id="edit-desc">${channel.description || ''}</textarea>
            <button onclick="saveChannelEdit('${currentChat}')">💾 Сохранить</button>
        `;
        document.getElementById('edit-modal').style.display = 'flex';
    }
}

function saveChannelEdit(channelId) {
    let name = document.getElementById('edit-name').value.trim();
    let desc = document.getElementById('edit-desc').value.trim();
    channels[channelId].name = name;
    channels[channelId].description = desc;
    secureSave('puzochat_channels', channels);
    document.getElementById('edit-modal').style.display = 'none';
    renderChannel();
    renderChatList();
    alert('✅ Канал обновлён!');
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

function handleSearch(query) {
    if (query.length < 2) return;
    let results = [];
    Object.values(users).forEach(user => {
        if (user.username.toLowerCase().includes(query.toLowerCase())) {
            results.push({ type: 'user', data: user });
        }
    });
    Object.values(channels).forEach(channel => {
        if (channel.name.toLowerCase().includes(query.toLowerCase())) {
            results.push({ type: 'channel', data: channel });
        }
    });
    if (results.length > 0) {
        document.getElementById('search-results').innerHTML = results.map(r => {
            if (r.type === 'user') {
                return `<div class="search-item" onclick="openProfile('${r.data.username}')">👤 @${r.data.username} ${r.data.signature ? r.data.signature.text : ''}</div>`;
            } else {
                return `<div class="search-item" onclick="openChannel('${r.data.id}')">📢 ${r.data.name}</div>`;
            }
        }).join('');
        document.getElementById('search-modal').style.display = 'flex';
    }
}

function closeSearch() {
    document.getElementById('search-modal').style.display = 'none';
}

function formatTime(isoString) {
    let date = new Date(isoString);
    return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

// Запуск
initSystem();
if (!currentUser) {
    document.getElementById('auth-modal').style.display = 'flex';
} else {
    renderApp();
}
