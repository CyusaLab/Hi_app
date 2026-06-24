const DB = {
    get: (key) => JSON.parse(localStorage.getItem('hi_' + key) || '[]'),
    save: (key, data) => localStorage.setItem('hi_' + key, JSON.stringify(data)),
    currentUser: () => JSON.parse(localStorage.getItem('hi_session') || 'null')
};

const App = {
    state: {
        activeTab: 'chats',
        isDark: false,
        contacts: [
            { id: 'cyusa_bot', name: 'CYUSA (AI)', phone: '000', email: 'hello@cyusa.dev', avatar: 'https://i.pravatar.cc/150?u=cyusa' }
        ]
    },

    init() {
        if (DB.currentUser()) {
            this.showMainApp();
        } else {
            this.showScreen('auth-screen');
        }
        this.render();
        this.startPolling();
        
        // Listen for cross-tab updates
        window.addEventListener('storage', () => this.render());
    },

    // --- NAVIGATION & UI ---
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    navigate(tab) {
        this.state.activeTab = tab;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        this.render();
    },

    toggleAuth() {
        const l = document.getElementById('login-form');
        const r = document.getElementById('register-form');
        l.style.display = l.style.display === 'none' ? 'block' : 'none';
        r.style.display = r.style.display === 'none' ? 'block' : 'none';
    },

    toggleTheme() {
        this.state.isDark = !this.state.isDark;
        document.body.className = this.state.isDark ? 'dark-mode' : 'light-mode';
    },

    // --- AUTHENTICATION ---
    previewAvatar(input) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('avatar-preview').style.backgroundImage = `url(${e.target.result})`;
            document.getElementById('avatar-preview').innerText = '';
            this.tempAvatar = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    },

    handleRegister() {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        if (!name || !email || !pass) return alert("Fill all fields");

        const users = DB.get('users');
        const newUser = { id: Date.now().toString(), name, email, pass, avatar: this.tempAvatar || '' };
        users.push(newUser);
        DB.save('users', users);
        this.loginUser(newUser);
    },

    handleLogin() {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const users = DB.get('users');
        const user = users.find(u => u.email === email && u.pass === pass);
        if (user) this.loginUser(user);
        else alert("Invalid credentials");
    },

    loginUser(user) {
        localStorage.setItem('hi_session', JSON.stringify(user));
        this.showMainApp();
    },

    showMainApp() {
        const user = DB.currentUser();
        if (user.avatar) {
            document.getElementById('nav-avatar-icon').innerHTML = `<img src="${user.avatar}" class="nav-avatar">`;
            document.getElementById('dynamic-favicon').href = user.avatar;
        }
        this.showScreen('main-app');
        this.navigate('chats');
    },

    logout() {
        localStorage.removeItem('hi_session');
        location.reload();
    },

    // --- CHAT LOGIC ---
    render() {
        const container = document.getElementById('content-area');
        const user = DB.currentUser();
        if (!user) return;

        if (this.state.activeTab === 'chats') {
            const users = DB.get('users').filter(u => u.id !== user.id);
            const allContacts = [...this.state.contacts, ...users];
            const messages = DB.get('messages');

            container.innerHTML = `<div class="chat-list">
                ${allContacts.map(c => {
                    const lastMsg = messages.filter(m => 
                        (m.from === user.id && m.to === c.id) || (m.from === c.id && m.to === user.id)
                    ).pop();
                    return `
                        <div class="chat-list-item" onclick="App.openChat('${c.id}')">
                            <img src="${c.avatar || 'https://i.pravatar.cc/150?u='+c.id}" class="avatar">
                            <div class="chat-info">
                                <div class="chat-top">
                                    <span class="chat-name">${c.name}</span>
                                    <span class="chat-time">${lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                                </div>
                                <div class="chat-preview">${lastMsg ? (lastMsg.img ? '📷 Photo' : lastMsg.text) : 'Tap to start chatting'}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>`;
        } 
        
        else if (this.state.activeTab === 'feed') {
            const posts = DB.get('posts').sort((a,b) => b.time - a.time);
            container.innerHTML = `
                <button class="fab" onclick="App.openNewPost()">+</button>
                <div class="feed-container">
                    ${posts.length ? posts.map(p => `
                        <div class="feed-card">
                            <div class="card-header">
                                <img src="${p.authorAvatar}" class="avatar" style="width:32px;height:32px">
                                <b>${p.authorName}</b>
                            </div>
                            <img src="${p.img}" class="post-img">
                            <div class="card-actions">
                                <span onclick="App.likePost('${p.id}')">❤️ ${p.likes || 0}</span>
                                <span onclick="App.openComments('${p.id}')">💬</span>
                            </div>
                            <div class="card-caption"><b>${p.authorName}</b> ${p.caption}</div>
                        </div>
                    `).join('') : '<p style="text-align:center; padding:50px; color:gray">No posts yet. Be the first!</p>'}
                </div>
            `;
        }

        else if (this.state.activeTab === 'profile') {
            container.innerHTML = `
                <div style="padding:20px; text-align:center">
                    <img src="${user.avatar || 'https://i.pravatar.cc/150?u=me'}" class="avatar" style="width:100px; height:100px">
                    <h2>${user.name}</h2>
                    <p style="color:var(--gray-mid)">${user.email}</p>
                    <button class="btn-primary" style="background:var(--gray-light); color:var(--text); margin-bottom:10px" onclick="App.logout()">Logout</button>
                    <div style="margin-top:40px; border-top:1px solid var(--gray-light); padding-top:20px">
                        <p><b>hi</b> Social v1.0</p>
                        <p style="color:var(--accent); font-weight:bold">Built by CYUSA</p>
                    </div>
                </div>
            `;
        }
    },

    openChat(contactId) {
        const user = DB.currentUser();
        const contact = [...this.state.contacts, ...DB.get('users')].find(u => u.id === contactId);
        
        const win = document.createElement('div');
        win.className = 'chat-window';
        win.id = 'active-chat-win';
        win.innerHTML = `
            <header class="app-header">
                <div style="display:flex; align-items:center">
                    <button onclick="document.getElementById('active-chat-win').remove()" style="background:none; border:none; font-size:20px; margin-right:10px">←</button>
                    <img src="${contact.avatar || 'https://i.pravatar.cc/150?u='+contact.id}" class="avatar" style="width:35px;height:35px">
                    <div>
                        <div style="font-weight:bold">${contact.name}</div>
                        <div class="typing-indicator" id="typing-status">online</div>
                    </div>
                </div>
            </header>
            <div class="msg-container" id="msg-flow"></div>
            <div class="input-area">
                <label for="chat-img-up" style="font-size:24px; cursor:pointer">📷</label>
                <input type="file" id="chat-img-up" hidden accept="image/*" onchange="App.sendImage(this, '${contactId}')">
                <input type="text" id="msg-input" placeholder="Message..." oninput="App.handleTyping('${contactId}')">
                <button onclick="App.sendMessage('${contactId}')" style="background:none; border:none; color:var(--accent); font-weight:bold">Send</button>
            </div>
        `;
        document.body.appendChild(win);
        this.renderMessages(contactId);
    },

    renderMessages(contactId) {
        const user = DB.currentUser();
        const flow = document.getElementById('msg-flow');
        if (!flow) return;
        const messages = DB.get('messages').filter(m => 
            (m.from === user.id && m.to === contactId) || (m.from === contactId && m.to === user.id)
        );
        flow.innerHTML = messages.map(m => `
            <div class="msg ${m.from === user.id ? 'sent' : 'recv'}">
                ${m.img ? `<img src="${m.img}" style="width:100%; border-radius:10px; margin-bottom:5px">` : ''}
                ${m.text || ''}
                <span class="msg-time">${new Date(m.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
        `).join('');
        flow.scrollTop = flow.scrollHeight;
    },

    sendMessage(to) {
        const input = document.getElementById('msg-input');
        if (!input.value.trim()) return;
        const msg = { from: DB.currentUser().id, to, text: input.value, time: Date.now() };
        const msgs = DB.get('messages');
        msgs.push(msg);
        DB.save('messages', msgs);
        input.value = '';
        this.renderMessages(to);
        
        // Mock reply if chatting with bot
        if (to === 'cyusa_bot') setTimeout(() => this.mockReply(), 1000);
    },

    sendImage(input, to) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const msg = { from: DB.currentUser().id, to, text: '', img: e.target.result, time: Date.now() };
            const msgs = DB.get('messages');
            msgs.push(msg);
            DB.save('messages', msgs);
            this.renderMessages(to);
        };
        reader.readAsDataURL(input.files[0]);
    },

    mockReply() {
        const msgs = DB.get('messages');
        msgs.push({ from: 'cyusa_bot', to: DB.currentUser().id, text: "Thanks for checking out 'hi'! This platform is built for speed.", time: Date.now() });
        DB.save('messages', msgs);
        this.renderMessages('cyusa_bot');
    },

    // --- FEED LOGIC ---
    openNewPost() {
        const overlay = document.getElementById('modal-overlay');
        const content = document.querySelector('.modal-content');
        overlay.style.display = 'flex';
        content.innerHTML = `
            <h3>New Post</h3>
            <div id="post-prev" style="width:100%; aspect-ratio:1; background:#eee; margin-bottom:10px; display:flex; align-items:center; justify-content:center">Select Photo</div>
            <input type="file" id="post-file" accept="image/*" onchange="App.previewPost(this)">
            <input type="text" id="post-caption" placeholder="Write a caption...">
            <button class="btn-primary" onclick="App.submitPost()">Share</button>
        `;
    },

    previewPost(input) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('post-prev').innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover">`;
            this.tempPostImg = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    },

    submitPost() {
        if (!this.tempPostImg) return alert("Select an image");
        const user = DB.currentUser();
        const posts = DB.get('posts');
        posts.push({
            id: Date.now(),
            authorId: user.id,
            authorName: user.name,
            authorAvatar: user.avatar,
            img: this.tempPostImg,
            caption: document.getElementById('post-caption').value,
            likes: 0,
            time: Date.now()
        });
        DB.save('posts', posts);
        this.closeModal();
        this.render();
    },

    likePost(id) {
        const posts = DB.get('posts');
        const post = posts.find(p => p.id == id);
        post.likes = (post.likes || 0) + 1;
        DB.save('posts', posts);
        this.render();
    },

    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    startPolling() {
        // Simple interval to refresh the UI for new messages/likes
        setInterval(() => {
            if (document.getElementById('active-chat-win')) {
                const contactId = document.getElementById('typing-status').dataset.id;
                // In a real app, check server here
                this.renderMessages(contactId);
            }
        }, 2000);
    }
};

App.init();
