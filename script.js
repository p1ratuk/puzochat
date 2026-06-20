// ==================== DEPOCHAT ENGINE ====================
let users = JSON.parse(localStorage.getItem('depochat_users') || '{}');
let chats = JSON.parse(localStorage.getItem('depochat_chats') || '{}');
let channels = JSON.parse(localStorage.getItem('depochat_channels') || '{}');
let currentUser = JSON.parse(localStorage.getItem('depochat_current_user') || 'null');
let currentChat = null;
let profileUsername = null;

// Инициализация системы
function initSystem() {
    // Создаём системных юзеров
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
            bio: 'Создатель DepoChat и депоказика. Король Дохерархии.',
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
            bio: 'Официальная поддержка DepoChat. Помогу, подскажу, задеплю.',
            balance: '1488 дохерархи',
            autoAnswers: {
                'помощь': '📋 Доступные команды: /help, /balance, /rules, /support',
                'привет': '🔵 Привет! Я официальная поддержка DepoChat! Чем помочь?',
                'баланс': '💰 Проверь баланс в депоказике! Если нужна помощь - @plexo',
                'правила': '📜 Правила: 1. Не материться 2. Деп 3. Додеп'
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
            bio: 'Главный по выигрышам. Охраняю казик 24/7. ГАВ!',
            balance: 'бесконечность',
            autoAnswers: {
                'привет': '🐕 ГАВ! ДЕП, А ПОТОМ ДОДЕП!',
                'как дела': '🐕 Отлично! Охраняю казик!',
                'кто ты': '🐕 Я Hueglot - главный по выигрышам!'
            }
        };
    }
    
    // Создаём канал puzochat
    if (!channels['puzochat']) {
        channels['puzochat'] = {
            id: 'puzochat',
            name: '📢 PuzoChat Новости',
            description: 'Официальный канал DepoChat. Новости, обновления, мемы.',
            owner: 'plexo',
            subscribers: ['plexo', 'puzochattp', 'hueglot'],
            posts: [
                {
                    id: 1,
                    author: 'plexo',
                    content: '🚀 Добро пожаловать в DepoChat! Это официальный канал с новостями!',
                    time: new Date().toISOString(),
                    likes: [],
                    reposts: [],
                    comments: []
                },
                {
                    id: 2,
                    author: 'hueglot',
                    content: '🐕 ГАВ! Я теперь в DepoChat! Буду охранять этот канал!',
                    time: new Date().toISOString(),
                    likes: ['plexo'],
                    reposts: [],
                    comments: []
                }
            ]
        };
    }
    
    // Создаём личные чаты
    if (!chats['dm_plexo_puzochattp']) {
        chats['dm_plexo_puzochattp'] = {
            id: 'dm_plexo_puzochattp',
            type: 'dm',
            participants: ['plexo', 'puzochattp'],
            messages: [
                { id: 1, from: 'puzochattp', text: '🔵 Привет! Я поддержка DepoChat! Чем могу помочь?', time: new Date().toISOString() },
                { id: 2, from: 'plexo', text: 'Привет! Всё отлично! Как дела?', time: new Date().toISOString() }
            ]
        };
    }
    
    if (!chats['dm_plexo_hueglot']) {
        chats['dm_plexo_hueglot'] = {
            id: 'dm_plexo_hueglot',
            type: 'dm',
            participants: ['plexo', 'hueglot'],
            messages: [
                { id: 1, from: 'hueglot', text: '🐕 ГАВ! ДЕП, А ПОТОМ ДОДЕП!', time: new Date().toISOString() },
                { id: 2, from: 'plexo', text: 'Добрый пёс! Держи дохерархи!', time: new Date().toISOString() }
            ]
        };
    }
    
    localStorage.setItem('depochat_users', JSON.stringify(users));
    localStorage.setItem('depochat_chats', JSON.stringify(chats));
    localStorage.setItem('depochat_channels', JSON.stringify(channels));
}

function hashPassword(pass) {
    let hash = 0;
    for (let i = 0; i < pass.length; i++) {
        hash = ((hash << 5) - hash) + pass.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

function login() {
    let username = document.getElementById('reg-username').value.trim();
    let password = document.getElementById('reg-password').value.trim();
    
    if (!username || !password) {
        alert('Введи юзернейм и пароль!');
        return;
    }
    
    if (!users[username]) {
        alert('Юзер не найден! Зарегистрируйся!');
        return;
    }
    
    if (users[username].password !== hashPassword(password)) {
        alert('Неверный пароль!');
        return;
    }
    
    if (users[username].banned) {
        alert('Ты забанен! Иди нахуй!');
        return;
    }
    
    currentUser = users[username];
    localStorage.setItem('depochat_current_user', JSON.stringify(currentUser));
    document.getElementById('auth-modal').style.display = 'none';
    renderApp();
}

function register() {
    let username = document.getElementById('reg-username').value.trim();
    let password = document.getElementById('reg-password').value.trim();
    
    if (!username || !password) {
        alert('Введи юзернейм и пароль!');
        return;
    }
    
    if (users[username]) {
        alert('Юзер уже существует!');
        return;
    }
    
    if (username.length < 3) {
        alert('Юзернейм должен быть от 3 символов!');
        return;
    }
    
    users[username] = {
        username: username,
        password: hashPassword(password),
        role: 'user',
        badge: '',
        color: 'gray',
        signature: null,
        createdAt: new Date().toISOString(),
        chats: ['dm_' + [username, 'puzochattp'].sort().join('_')],
        channels: ['puzochat'],
        permissions: [],
        banned: false,
        muted: false,
        bio: 'Новый юзер DepoChat',
        balance: '0'
    };
    
    // Создаём личный чат с поддержкой
    let supportChatId = 'dm_' + [username, 'puzochattp'].sort().join('_');
    if (!chats[supportChatId]) {
        chats[supportChatId] = {
            id: supportChatId,
            type: 'dm',
            participants: [username, 'puzochattp'],
            messages: [
                { id: Date.now(), from: 'puzochattp', text: '🔵 Привет! Добро пожаловать в DepoChat! Я твоя поддержка! Задавай вопросы!', time: new Date().toISOString() }
            ]
        };
    }
    
    // Подписываем на канал
    if (!channels['puzochat'].subscribers.includes(username)) {
        channels['puzochat'].subscribers.push(username);
    }
    
    localStorage.setItem('depochat_users', JSON.stringify(users));
    localStorage.setItem('depochat_chats', JSON.stringify(chats));
    localStorage.setItem('depochat_channels', JSON.stringify(channels));
    
    currentUser = users[username];
    localStorage.setItem('depochat_current_user', JSON.stringify(currentUser));
    document.getElementById('auth-modal').style.display = 'none';
    renderApp();
    alert('✅ Регистрация успешна! Чат с поддержкой уже ждёт тебя!');
}

function logout() {
    currentUser = null;
    currentChat = null;
    localStorage.removeItem('depochat_current_user');
    document.getElementById('auth-modal').style.display = 'flex';
    renderApp();
}

function renderApp() {
    if (!currentUser) {
        document.getElementById('auth-modal').style.display = 'flex';
        return;
    }
    
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('current-user-badge').innerText = currentUser.badge;
    document.getElementById('current-user-name').innerText = currentUser.username;
    
    if (currentUser.username === 'plexo') {
        // Показываем кнопку админки
    }
    
    renderChatList();
    if (currentChat) {
        renderChat();
    }
}

function renderChatList() {
    let list = document.getElementById('chat-list');
    list.innerHTML = '';
    
    // Личные чаты
    let userChats = currentUser.chats || [];
    userChats.forEach(chatId => {
        if (!chats[chatId]) return;
        let chat = chats[chatId];
        let otherUser = chat.participants.find(p => p !== currentUser.username);
        let otherUserData = users[otherUser];
        if (!otherUserData) return;
        
        let lastMsg = chat.messages[chat.messages.length - 1];
        let lastText = lastMsg ? lastMsg.text.substring(0, 30) : 'Нет сообщений';
        
        let div = document.createElement('div');
        div.className = 'chat-item' + (currentChat === chatId ? ' active' : '');
        div.onclick = () => openChat(chatId);
        div.innerHTML = `
            <div class="avatar">${otherUserData.badge || '👤'}</div>
            <div class="chat-info">
                <div class="chat-name">${otherUserData.username}</div>
                <div class="chat-last">${lastText}</div>
            </div>
            <div class="chat-meta">
                <span class="time">${lastMsg ? formatTime(lastMsg.time) : ''}</span>
                ${otherUserData.signature ? `<span class="unread" style="color: ${otherUserData.signature.color}">${otherUserData.signature.text}</span>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
    
    // Каналы
    let userChannels = currentUser.channels || [];
    userChannels.forEach(channelId => {
        if (!channels[channelId]) return;
        let channel = channels[channelId];
        
        let div = document.createElement('div');
        div.className = 'chat-item' + (currentChat === channelId ? ' active' : '');
        div.onclick = () => openChannel(channelId);
        div.innerHTML = `
            <div class="avatar">📢</div>
            <div class="chat-info">
                <div class="chat-name">${channel.name}</div>
                <div class="chat-last">${channel.description}</div>
            </div>
            <div class="chat-meta">
                <span class="unread">${channel.subscribers.length} подписчиков</span>
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
    document.getElementById('input-area').style.display = 'none';
    renderChatList();
    renderChannel();
}

function renderChat() {
    if (!currentChat || !chats[currentChat]) return;
    
    let chat = chats[currentChat];
    let otherUser = chat.participants.find(p => p !== currentUser.username);
    let otherUserData = users[otherUser];
    
    document.getElementById('chat-avatar').innerText = otherUserData?.badge || '👤';
    document.getElementById('chat-name').innerText = otherUserData?.username || 'Чат';
    
    let status = otherUserData?.isBot ? '🤖 Бот' : '🟢 Онлайн';
    document.getElementById('chat-status').innerText = status;
    
    let messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    
    chat.messages.forEach(msg => {
        let isSent = msg.from === currentUser.username;
        let userData = users[msg.from];
        
        let div = document.createElement('div');
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.innerHTML = `
            ${!isSent ? `<span class="username" style="color: ${userData?.color || '#fff'}">${userData?.badge || ''} ${msg.from}</span>` : ''}
            ${userData?.signature ? `<span class="badge" style="color: ${userData.signature.color}; background: ${userData.signature.background}; border: ${userData.signature.border}">${userData.signature.text}</span>` : ''}
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
            <span class="username" style="color: ${userData?.color || '#fff'}">${userData?.badge || ''} ${post.author}</span>
            ${userData?.signature ? `<span class="badge" style="color: ${userData.signature.color}; background: ${userData.signature.background}; border: ${userData.signature.border}">${userData.signature.text}</span>` : ''}
            <div>${post.content}</div>
            <div style="display:flex; gap:15px; margin-top:10px;">
                <span>👍 ${post.likes.length} депов</span>
                <span>🔄 ${post.reposts.length} перекрутов</span>
                <span>💬 ${post.comments.length} комментариев</span>
            </div>
            <div class="time">${formatTime(post.time)}</div>
        `;
        messagesDiv.appendChild(div);
    });
}

function sendMessage() {
    if (!currentChat || !chats[currentChat]) return;
    
    let input = document.getElementById('message-input');
    let text = input.value.trim();
    if (!text) return;
    
    let chat = chats[currentChat];
    
    chat.messages.push({
        id: Date.now(),
        from: currentUser.username,
        text: text,
        time: new Date().toISOString()
    });
    
    localStorage.setItem('depochat_chats', JSON.stringify(chats));
    input.value = '';
    renderChat();
    
    // Авто-ответ от ботов
    let otherUser = chat.participants.find(p => p !== currentUser.username);
    let otherUserData = users[otherUser];
    
    if (otherUserData?.isBot && otherUserData?.autoAnswers) {
        setTimeout(() => {
            let botReply = getBotReply(otherUserData, text);
            if (botReply) {
                chat.messages.push({
                    id: Date.now(),
                    from: otherUser,
                    text: botReply,
                    time: new Date().toISOString()
                });
                localStorage.setItem('depochat_chats', JSON.stringify(chats));
                renderChat();
            }
        }, 1000);
    }
}

function getBotReply(botData, userMessage) {
    let msg = userMessage.toLowerCase();
    for (let keyword in botData.autoAnswers) {
        if (msg.includes(keyword)) {
            return botData.autoAnswers[keyword];
        }
    }
    return null;
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
        
        if (!currentUser.chats.includes(chatId)) {
            currentUser.chats.push(chatId);
        }
        if (!users[username].chats.includes(chatId)) {
            users[username].chats.push(chatId);
        }
        
        localStorage.setItem('depochat_chats', JSON.stringify(chats));
        localStorage.setItem('depochat_users', JSON.stringify(users));
    }
    
    openChat(chatId);
    document.getElementById('profile-modal').style.display = 'none';
}

function openProfile(username) {
    if (!username || !users[username]) return;
    profileUsername = username;
    let user = users[username];
    
    document.getElementById('profile-avatar').innerText = user.badge || '👤';
    document.getElementById('profile-name').innerText = user.username;
    document.getElementById('profile-badge').innerHTML = user.signature ? 
        `<span style="color: ${user.signature.color}; background: ${user.signature.background}; border: ${user.signature.border}; padding: 2px 6px; border-radius: 4px;">${user.signature.text}</span>` : '';
    document.getElementById('profile-bio').innerText = user.bio || '';
    document.getElementById('profile-balance').innerText = user.balance || '0';
    
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfile() {
    document.getElementById('profile-modal').style.display = 'none';
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
                return `<div class="search-item" onclick="openProfile('${r.data.username}')">👤 ${r.data.username} ${r.data.signature ? r.data.signature.text : ''}</div>`;
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
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

// Запуск
initSystem();
renderApp();

// Проверка авторизации
if (!currentUser) {
    document.getElementById('auth-modal').style.display = 'flex';
} else {
    renderApp();
}
