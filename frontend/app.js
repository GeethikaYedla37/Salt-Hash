// macOS Password Manager Application

class PasswordManager {
    constructor() {
        this.currentUser = null;
        this.windows = new Map();
        this.zIndex = 100;
        this.settings = {
            minPasswordLength: 8,
            sessionTimeout: 30,
            trackHistory: true
        };
        this.apiBaseUrl = 'http://127.0.0.1:5000';
        
        // Demo data - stored in memory
        this.users = [];
        
        this.loginHistory = [];
        
        this.wallpapers = this.loadDefaultWallpapers();
        
        this.currentWallpaper = this.wallpapers.find(w => w.isDefault) || this.wallpapers[0];
        
        this.dynamicWallpaperEnabled = false;
        this.dynamicWallpaperInterval = null;
        this.customWallpaper = null;
    this.wallpaperSettingsRender = null;
        
        this.terminalHistory = [];
        this.terminalHistoryIndex = -1;
        
        this.init();
    }
    
    init() {
        this.bindLoginEvents();
        this.bindDesktopEvents();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.populateLoginWallpaperTray();
        this.applyWallpaper(this.currentWallpaper, { immediate: true });
        this.updateStatus('Ready');
        this.updateLoginDisplayName('');
    }
    
    // Authentication Methods
    bindLoginEvents() {
        const loginForm = document.getElementById('login-form');
        const registerBtn = document.getElementById('register-btn');
        const usernameInput = document.getElementById('username');
        const userSwitcher = document.querySelector('.user-switcher');
        const loginMessage = document.getElementById('login-message');
        
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        registerBtn.addEventListener('click', () => this.handleRegister());
        
        if (usernameInput) {
            usernameInput.addEventListener('input', () => {
                this.updateLoginDisplayName(usernameInput.value);
                if (loginMessage) {
                    loginMessage.textContent = '';
                    loginMessage.className = 'login-message';
                }
            });
        }
        
        if (userSwitcher) {
            userSwitcher.addEventListener('click', () => {
                const currentIndex = this.wallpapers.findIndex(w => w.id === this.currentWallpaper.id);
                const nextWallpaper = this.wallpapers[(currentIndex + 1) % this.wallpapers.length];
                this.applyWallpaper(nextWallpaper);
            });
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('login-message');
        this.updateLoginDisplayName(username);
        this.updateStatus('Verifying credentials…');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.username;
                this.showMessage(messageEl, 'Login successful!', 'success');
                this.updateStatus(`Welcome, ${this.currentUser}`);
                setTimeout(() => this.showDesktop(), 1000);
            } else {
                this.showMessage(messageEl, data.error, 'error');
                this.updateStatus(data.error);
            }
        } catch (error) {
            this.showMessage(messageEl, 'Failed to connect to server', 'error');
            this.updateStatus('Connection error');
        }
    }
    
    async handleRegister() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('login-message');
        
        if (!username || !password) {
            this.showMessage(messageEl, 'Please enter username and password', 'error');
            return;
        }
        
        if (password.length < this.settings.minPasswordLength) {
            this.showMessage(messageEl, `Password must be at least ${this.settings.minPasswordLength} characters`, 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(messageEl, 'Registration successful! Please login.', 'success');
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                this.updateLoginDisplayName('');
            } else {
                this.showMessage(messageEl, data.error, 'error');
            }
        } catch (error) {
            this.showMessage(messageEl, 'Failed to connect to server', 'error');
        }
    }
    
    handleLogout() {
        if (this.currentUser) {
            this.addToHistory(this.currentUser, 'logout');
        }
        
        this.currentUser = null;
        this.closeAllWindows();
        
        const desktop = document.getElementById('desktop');
        const loginScreen = document.getElementById('login-screen');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginMessage = document.getElementById('login-message');
        
        desktop.classList.remove('visible');
        desktop.classList.add('hidden');
        
        loginScreen.classList.remove('hidden');
        requestAnimationFrame(() => {
            loginScreen.classList.remove('fade-out');
        });
        
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (loginMessage) {
            loginMessage.textContent = '';
            loginMessage.className = 'login-message';
        }
        
        this.updateLoginDisplayName('');
        this.updateMenuUser('Guest');
        this.updateStatus('Ready');
        this.populateLoginWallpaperTray();
    }
    
    showDesktop() {
        const loginScreen = document.getElementById('login-screen');
        const desktop = document.getElementById('desktop');
        
        loginScreen.classList.add('fade-out');
        
        setTimeout(() => {
            loginScreen.classList.add('hidden');
            desktop.classList.remove('hidden');
            desktop.classList.add('visible');
            
            this.updateMenuUser(this.currentUser);
            this.applyWallpaper(this.currentWallpaper, { immediate: true });
            this.updateStatus(`Signed in as ${this.currentUser}`);
        }, 500);
    }
    
    // Desktop Environment
    bindDesktopEvents() {
        const dockIcons = document.querySelectorAll('.dock-icon');
        
        dockIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const appName = icon.dataset.app;
                if (appName) {
                    this.openApp(appName);
                } else if (icon.id === 'dock-trash') {
                    this.updateStatus('Trash is empty');
                }
            });
        });
        
        // Close modal events
        this.bindModalEvents();
        this.bindMenuBarEvents();
        this.bindDockEffects();
    }
    
    bindMenuBarEvents() {
        const appleMenuBtn = document.getElementById('apple-menu-btn');
        const appleMenu = document.getElementById('apple-menu');
        const loginOptionsBtn = document.getElementById('login-options-btn');
        const switchUserBtn = document.getElementById('switch-user-btn');

        if (appleMenuBtn && appleMenu) {
            appleMenuBtn.addEventListener('click', () => {
                const expanded = appleMenuBtn.getAttribute('aria-expanded') === 'true';
                appleMenuBtn.setAttribute('aria-expanded', (!expanded).toString());
                appleMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!appleMenu.contains(e.target) && e.target !== appleMenuBtn) {
                    appleMenu.classList.add('hidden');
                    appleMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });

            appleMenu.querySelectorAll('.menu-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    this.handleAppleMenuAction(action);
                    appleMenu.classList.add('hidden');
                    appleMenuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }

        if (loginOptionsBtn) {
            loginOptionsBtn.addEventListener('click', () => {
                this.updateStatus('Power controls are unavailable in demo mode');
                alert('Simulated Shutdown Options:\nSleep, Restart, Shut Down are not available in demo mode.');
            });
        }

        if (switchUserBtn) {
            switchUserBtn.addEventListener('click', () => {
                if (!this.currentUser) {
                    this.updateStatus('No user signed in');
                    return;
                }

                this.updateStatus('Switching user…');
                this.handleLogout();

                const usernameInput = document.getElementById('username');
                if (usernameInput) {
                    requestAnimationFrame(() => usernameInput.focus());
                }
            });
        }
    }

    handleAppleMenuAction(action) {
        switch (action) {
            case 'about':
                alert('macOS Password Manager\nVersion 1.0 · mac-inspired interface');
                this.updateStatus('About panel opened');
                break;
            case 'sleep':
                this.updateStatus('Sleep is unavailable in demo mode');
                alert('Sleep mode is not available in this demo.');
                break;
            case 'restart':
                this.updateStatus('Restart is unavailable in demo mode');
                alert('Restart is not available in this demo.');
                break;
            case 'shutdown':
                this.updateStatus('Shut Down is unavailable in demo mode');
                alert('Shut Down is not available in this demo.');
                break;
            case 'logout':
                this.updateStatus('Logging out…');
                this.handleLogout();
                break;
            default:
                break;
        }
    }

    bindDockEffects() {
        const dock = document.querySelector('.dock');
        const icons = document.querySelectorAll('.dock-icon');

        if (!dock) return;

        dock.addEventListener('mousemove', (e) => {
            icons.forEach(icon => {
                const rect = icon.getBoundingClientRect();
                const distance = Math.abs(e.clientX - (rect.left + rect.width / 2));
                const scale = Math.max(1, 1.8 - distance / 150);
                icon.style.setProperty('--dock-scale', scale.toFixed(2));
            });
        });

        dock.addEventListener('mouseleave', () => {
            icons.forEach(icon => icon.style.removeProperty('--dock-scale'));
        });
    }

    bindModalEvents() {
        const addUserModal = document.getElementById('add-user-modal');
        const closeModalBtn = document.getElementById('close-add-user-modal');
        const cancelBtn = document.getElementById('cancel-add-user');
        const addUserForm = document.getElementById('add-user-form');
        
        closeModalBtn.addEventListener('click', () => this.hideModal(addUserModal));
        cancelBtn.addEventListener('click', () => this.hideModal(addUserModal));
        
        addUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUser();
        });
        
        // Close modal when clicking outside
        addUserModal.addEventListener('click', (e) => {
            if (e.target === addUserModal) {
                this.hideModal(addUserModal);
            }
        });
    }
    
    openApp(appName) {
        if (this.windows.has(appName)) {
            const existingWindow = this.windows.get(appName);
            if (existingWindow.classList.contains('minimized')) {
                this.restoreWindow(existingWindow);
            } else {
                this.bringToFront(existingWindow);
            }
            return;
        }
        
        const window = this.createWindow(appName);
        this.windows.set(appName, window);
        
        // Update dock icon state
        const dockIcon = document.querySelector(`[data-app="${appName}"]`);
        if (dockIcon) {
            dockIcon.classList.add('active');
        }
    }
    
    createWindow(appName) {
        const template = document.getElementById('window-template');
        const windowClone = template.content.cloneNode(true);
        const windowEl = windowClone.querySelector('.window');
        
        windowEl.dataset.app = appName;
        windowEl.style.zIndex = ++this.zIndex;
        
        // Set window title and content
        const titleEl = windowEl.querySelector('.window-title');
        const contentEl = windowEl.querySelector('.window-content');
        
        const appInfo = this.getAppInfo(appName);
        titleEl.textContent = appInfo.title;
        
        // Load app content
        this.loadAppContent(appName, contentEl);
        
        // Bind window events
        this.bindWindowEvents(windowEl);
        
        // Add random offset
        const offset = this.windows.size * 30;
        windowEl.style.top = (100 + offset) + 'px';
        windowEl.style.left = (100 + offset) + 'px';
        
        document.getElementById('windows-container').appendChild(windowEl);
        
        // Animate window appearance
        setTimeout(() => {
            windowEl.classList.add('fade-in');
        }, 10);
        
        return windowEl;
    }
    
    getAppInfo(appName) {
        const appInfoMap = {
            'user-manager': { title: 'User Manager' },
            'terminal': { title: 'Terminal' },
            'history-viewer': { title: 'History Viewer' },
            'report-generator': { title: 'Report Generator' },
            'export-data': { title: 'Export Data' },
            'advanced-settings': { title: 'Advanced Settings' },
            'wallpaper-settings': { title: 'Wallpaper Settings' }
        };
        
        return appInfoMap[appName] || { title: 'Unknown App' };
    }
    
    loadAppContent(appName, contentEl) {
        const templateId = `${appName}-template`;
        const template = document.getElementById(templateId);
        
        if (template) {
            const content = template.content.cloneNode(true);
            contentEl.appendChild(content);
            
            // Initialize app-specific functionality
            this.initializeApp(appName, contentEl);
        }
    }
    
    initializeApp(appName, contentEl) {
        switch (appName) {
            case 'user-manager':
                this.initUserManager(contentEl);
                break;
            case 'terminal':
                this.initTerminal(contentEl);
                break;
            case 'history-viewer':
                this.initHistoryViewer(contentEl);
                break;
            case 'report-generator':
                this.initReportGenerator(contentEl);
                break;
            case 'export-data':
                this.initExportData(contentEl);
                break;
            case 'advanced-settings':
                this.initAdvancedSettings(contentEl);
                break;
            case 'wallpaper-settings':
                this.initWallpaperSettings(contentEl);
                break;
        }
    }
    
    // Window Management
    bindWindowEvents(windowEl) {
        const header = windowEl.querySelector('.window-header');
        const trafficLights = windowEl.querySelectorAll('.traffic-light');
        
        // Dragging
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('traffic-light')) return;
            
            isDragging = true;
            this.bringToFront(windowEl);
            
            const rect = windowEl.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            windowEl.classList.add('dragging');
            header.classList.add('dragging');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffset.x;
            const y = Math.max(28, e.clientY - dragOffset.y); // Don't go above menu bar
            
            windowEl.style.left = x + 'px';
            windowEl.style.top = y + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                windowEl.classList.remove('dragging');
                header.classList.remove('dragging');
            }
        });
        
        // Traffic light actions
        trafficLights.forEach(light => {
            light.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = light.dataset.action;
                this.handleWindowAction(windowEl, action);
            });
        });
        
        // Bring to front on click
        windowEl.addEventListener('mousedown', () => {
            this.bringToFront(windowEl);
        });
    }
    
    handleWindowAction(windowEl, action) {
        const appName = windowEl.dataset.app;
        
        switch (action) {
            case 'close':
                this.closeWindow(windowEl, appName);
                break;
            case 'minimize':
                this.minimizeWindow(windowEl);
                break;
            case 'maximize':
                this.toggleMaximize(windowEl);
                break;
        }
    }
    
    closeWindow(windowEl, appName) {
        windowEl.classList.add('fade-out');
        
        setTimeout(() => {
            windowEl.remove();
            this.windows.delete(appName);
            if (appName === 'wallpaper-settings') {
                this.wallpaperSettingsRender = null;
            }
            
            // Update dock icon state
            const dockIcon = document.querySelector(`[data-app="${appName}"]`);
            if (dockIcon) {
                dockIcon.classList.remove('active');
            }
        }, 300);
    }
    
    minimizeWindow(windowEl) {
        if (windowEl.classList.contains('minimized') || windowEl.classList.contains('animating')) return;

        const targetRect = this.getDockTargetRect(windowEl.dataset.app);
        const windowRect = windowEl.getBoundingClientRect();
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            windowEl.classList.add('minimized');
            windowEl.style.opacity = '0';
            return;
        }

        const translateX = targetRect.left + targetRect.width / 2 - (windowRect.left + windowRect.width / 2);
        const translateY = targetRect.top + targetRect.height / 2 - (windowRect.top + windowRect.height / 2);

        windowEl.classList.add('animating');
        windowEl.style.transformOrigin = 'center bottom';

        const animation = windowEl.animate([
            {
                transform: 'translate(0, 0) scale(1)',
                clipPath: 'inset(0% 0% 0% 0% round 16px)',
                opacity: 1
            },
            {
                transform: `translate(${translateX}px, ${translateY}px) scale(0.05)`,
                clipPath: 'inset(55% 45% 0% 45% round 72px)',
                opacity: 0
            }
        ], {
            duration: 420,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)'
        });

        animation.onfinish = () => {
            windowEl.classList.remove('animating');
            windowEl.classList.add('minimized');
            windowEl.style.opacity = '0';
            windowEl.style.transform = '';
            windowEl.style.clipPath = '';
        };

        animation.oncancel = () => {
            windowEl.classList.remove('animating');
            windowEl.style.opacity = '';
            windowEl.style.transform = '';
            windowEl.style.clipPath = '';
        };
    }
    
    restoreWindow(windowEl) {
        if (!windowEl.classList.contains('minimized') || windowEl.classList.contains('animating')) return;

        const targetRect = this.getDockTargetRect(windowEl.dataset.app);
        windowEl.classList.remove('minimized');
        this.bringToFront(windowEl);

        const windowRect = windowEl.getBoundingClientRect();
        const translateX = targetRect.left + targetRect.width / 2 - (windowRect.left + windowRect.width / 2);
        const translateY = targetRect.top + targetRect.height / 2 - (windowRect.top + windowRect.height / 2);
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            windowEl.style.opacity = '';
            return;
        }

        windowEl.classList.add('animating');
        windowEl.style.opacity = '0';
        windowEl.style.transformOrigin = 'center bottom';

        const animation = windowEl.animate([
            {
                transform: `translate(${translateX}px, ${translateY}px) scale(0.05)`,
                clipPath: 'inset(55% 45% 0% 45% round 72px)',
                opacity: 0
            },
            {
                transform: 'translate(0, 0) scale(1)',
                clipPath: 'inset(0% 0% 0% 0% round 16px)',
                opacity: 1
            }
        ], {
            duration: 420,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)'
        });

        animation.onfinish = () => {
            windowEl.classList.remove('animating');
            windowEl.style.opacity = '';
            windowEl.style.transform = '';
            windowEl.style.clipPath = '';
        };

        animation.oncancel = () => {
            windowEl.classList.remove('animating');
            windowEl.style.opacity = '';
            windowEl.style.transform = '';
            windowEl.style.clipPath = '';
        };
    }
    
    toggleMaximize(windowEl) {
        windowEl.classList.toggle('maximized');
    }
    
    bringToFront(windowEl) {
        windowEl.style.zIndex = ++this.zIndex;
    }

    getDockTargetRect(appName) {
        const icon = document.querySelector(`[data-app="${appName}"]`);
        if (icon) {
            return icon.getBoundingClientRect();
        }
        const dock = document.querySelector('.dock');
        if (dock) {
            return dock.getBoundingClientRect();
        }
        return {
            left: window.innerWidth / 2,
            top: window.innerHeight - 40,
            width: 80,
            height: 40
        };
    }
    
    closeAllWindows() {
        this.windows.forEach((windowEl, appName) => {
            windowEl.remove();
            if (appName === 'wallpaper-settings') {
                this.wallpaperSettingsRender = null;
            }
            const dockIcon = document.querySelector(`[data-app="${appName}"]`);
            if (dockIcon) {
                dockIcon.classList.remove('active');
            }
        });
        this.windows.clear();
    }
    
    // App Implementations
    initUserManager(contentEl) {
        const addUserBtn = contentEl.querySelector('#add-user-btn');
        const usersTableBody = contentEl.querySelector('#users-table-body');
        
        addUserBtn.addEventListener('click', () => {
            document.getElementById('add-user-modal').classList.remove('hidden');
        });
        
        this.populateUsersTable(usersTableBody);
    }
    
    async populateUsersTable(tbody) {
        tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/users`);
            const data = await response.json();

            if (response.ok) {
                this.users = data.users;
                tbody.innerHTML = '';
                this.users.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.username}</td>
                        <td>${new Date(user.registered_at).toLocaleString()}</td>
                        <td>${user.hashed_password.substring(0, 20)}...</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="passwordManager.deleteUser('${user.username}')">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4">Failed to load users</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4">Connection error</td></tr>';
        }
    }
    
    async deleteUser(username) {
        if (username === this.currentUser) {
            alert('Cannot delete currently logged in user');
            return;
        }
        
        if (confirm(`Are you sure you want to delete user "${username}"?`)) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/users/${username}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    // Update all user manager windows
                    this.windows.forEach((windowEl, appName) => {
                        if (appName === 'user-manager') {
                            const tbody = windowEl.querySelector('#users-table-body');
                            this.populateUsersTable(tbody);
                        }
                    });
                } else {
                    alert('Failed to delete user');
                }
            } catch (error) {
                alert('Failed to connect to server');
            }
        }
    }
    
    async handleAddUser() {
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        if (password.length < this.settings.minPasswordLength) {
            alert(`Password must be at least ${this.settings.minPasswordLength} characters`);
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                // Update all user manager windows
                this.windows.forEach((windowEl, appName) => {
                    if (appName === 'user-manager') {
                        const tbody = windowEl.querySelector('#users-table-body');
                        this.populateUsersTable(tbody);
                    }
                });

                // Clear form and hide modal
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
                this.hideModal(document.getElementById('add-user-modal'));
            } else {
                const data = await response.json();
                alert(`Failed to add user: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to connect to server');
        }
    }
    
    initTerminal(contentEl) {
        const terminalInput = contentEl.querySelector('#terminal-input');
        const terminalOutput = contentEl.querySelector('#terminal-output');
        
        if (!terminalInput || !terminalOutput) {
            console.warn('Terminal template is missing expected elements.');
            return;
        }

        const focusTerminalInput = () => {
            requestAnimationFrame(() => terminalInput.focus());
        };

        focusTerminalInput();

        contentEl.addEventListener('click', () => {
            focusTerminalInput();
        });

        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim();
                if (command) {
                    this.executeTerminalCommand(command, terminalOutput);
                    this.terminalHistory.push(command);
                    this.terminalHistoryIndex = this.terminalHistory.length;
                }
                terminalInput.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.terminalHistoryIndex > 0) {
                    this.terminalHistoryIndex--;
                    terminalInput.value = this.terminalHistory[this.terminalHistoryIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.terminalHistoryIndex < this.terminalHistory.length - 1) {
                    this.terminalHistoryIndex++;
                    terminalInput.value = this.terminalHistory[this.terminalHistoryIndex];
                } else {
                    this.terminalHistoryIndex = this.terminalHistory.length;
                    terminalInput.value = '';
                }
            }
        });
    }

    executeTerminalCommand(command, outputEl) {
        if (!outputEl) return;

        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';

        const promptSpan = document.createElement('span');
        promptSpan.className = 'terminal-prompt';
        promptSpan.textContent = 'macOS-pwdmgr:~ user$';

        const commandSpan = document.createElement('span');
        commandSpan.className = 'terminal-text';
        commandSpan.textContent = command;

        commandLine.appendChild(promptSpan);
        commandLine.appendChild(commandSpan);
        outputEl.appendChild(commandLine);

        const result = this.processTerminalCommand(command, outputEl);

        if (result) {
            const resultLine = document.createElement('div');
            resultLine.className = 'terminal-line';

            const resultSpan = document.createElement('span');
            resultSpan.className = 'terminal-text';
            resultSpan.textContent = result;

            resultLine.appendChild(resultSpan);
            outputEl.appendChild(resultLine);
        }

        outputEl.scrollTop = outputEl.scrollHeight;
    }

    processTerminalCommand(command, outputEl) {
        const cmd = command.toLowerCase().trim();
        
        switch (cmd) {
            case 'help':
                return `Available commands:
  load users    - Display all registered users
  load history  - Show login/activity history
  manage users  - Open user management
  export data   - Export data to file
  adv settings  - Open advanced settings
  clear         - Clear terminal screen
  help          - Show this help message`;
                
            case 'load users':
                if (this.users.length === 0) {
                    return 'No registered users found.';
                }

                return this.users
                    .map(u => `${u.username} (registered: ${new Date(u.registeredAt).toLocaleDateString()})`)
                    .join('\n');
                
            case 'load history':
                if (this.loginHistory.length === 0) {
                    return 'No activity recorded yet.';
                }

                return this.loginHistory
                    .map(h => `${new Date(h.timestamp).toLocaleString()} - ${h.username} ${h.action}`)
                    .join('\n');
                
            case 'manage users':
                this.openApp('user-manager');
                return 'Opening User Manager...';
                
            case 'export data':
                this.openApp('export-data');
                return 'Opening Export Data...';
                
            case 'adv settings':
                this.openApp('advanced-settings');
                return 'Opening Advanced Settings...';
                
            case 'clear':
                if (outputEl) {
                    outputEl.innerHTML = `
                        <div class="terminal-line">
                            <span class="terminal-prompt">macOS-pwdmgr:~ user$</span>
                            <span class="terminal-text">Terminal cleared</span>
                        </div>
                    `;
                }
                return null;
                
            default:
                return `Command not found: ${command}. Type 'help' for available commands.`;
        }
    }
    
    initHistoryViewer(contentEl) {
        const historyTableBody = contentEl.querySelector('#history-table-body');
        const historyFilter = contentEl.querySelector('#history-filter');
        
        historyFilter.addEventListener('change', () => {
            this.populateHistoryTable(historyTableBody, historyFilter.value);
        });
        
        this.populateHistoryTable(historyTableBody, 'all');
    }
    
    async populateHistoryTable(tbody, filterUser) {
        tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/history`);
            const data = await response.json();

            if (response.ok) {
                this.loginHistory = data.history;

                // Populate filter dropdown
                const windowEl = tbody.closest('.window');
                const historyFilter = windowEl.querySelector('#history-filter');
                const users = [...new Set(this.loginHistory.map(h => h.username))];
                // remove all options except the first one
                while (historyFilter.options.length > 1) {
                    historyFilter.remove(1);
                }
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user;
                    option.textContent = user;
                    historyFilter.appendChild(option);
                });


                let filteredHistory = this.loginHistory;
                if (filterUser !== 'all') {
                    filteredHistory = this.loginHistory.filter(h => h.username === filterUser);
                }

                tbody.innerHTML = '';
                filteredHistory.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(entry.timestamp).toLocaleString()}</td>
                        <td>${entry.username}</td>
                        <td><span class="status status--${this.getActionStatus(entry.action)}">${entry.action}</span></td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="3">Failed to load history</td></tr>';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3">Connection error</td></tr>';
        }
    }
    
    getActionStatus(action) {
        switch (action) {
            case 'login': return 'success';
            case 'logout': return 'info';
            case 'register': return 'warning';
            default: return 'info';
        }
    }
    
    initReportGenerator(contentEl) {
        const generateUsersBtn = contentEl.querySelector('#generate-users-report');
        const generateActivityBtn = contentEl.querySelector('#generate-activity-report');
        const generateSecurityBtn = contentEl.querySelector('#generate-security-report');
        const reportContent = contentEl.querySelector('#report-content');
        const reportActions = contentEl.querySelector('#report-actions');
        const downloadBtn = contentEl.querySelector('#download-report');
        
        let currentReport = null;
        
        generateUsersBtn.addEventListener('click', () => {
            currentReport = this.generateUsersReport();
            reportContent.textContent = currentReport.content;
            reportActions.classList.remove('hidden');
        });
        
        generateActivityBtn.addEventListener('click', () => {
            currentReport = this.generateActivityReport();
            reportContent.textContent = currentReport.content;
            reportActions.classList.remove('hidden');
        });
        
        generateSecurityBtn.addEventListener('click', () => {
            currentReport = this.generateSecurityReport();
            reportContent.textContent = currentReport.content;
            reportActions.classList.remove('hidden');
        });
        
        downloadBtn.addEventListener('click', () => {
            if (currentReport) {
                this.downloadFile(currentReport.filename, currentReport.content);
            }
        });
    }
    
    generateUsersReport() {
        const content = `PASSWORD MANAGER - USERS REPORT
` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `Total Users: ${this.users.length}\n\n` +
            `USER DETAILS:\n` +
            this.users.map(user => 
                `Username: ${user.username}\n` +
                `Registered: ${new Date(user.registeredAt).toLocaleString()}\n` +
                `Salt: ${user.salt}\n` +
                `Hash: ${user.hashedPassword}\n`
            ).join('\n') + '\n';
            
        return {
            filename: 'users_report.txt',
            content: content
        };
    }
    
    generateActivityReport() {
        const content = `PASSWORD MANAGER - ACTIVITY REPORT
` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `Total Activities: ${this.loginHistory.length}\n\n` +
            `ACTIVITY LOG:\n` +
            this.loginHistory
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(entry => 
                    `${new Date(entry.timestamp).toLocaleString()} - ${entry.username} (${entry.action})`
                ).join('\n') + '\n';
            
        return {
            filename: 'activity_report.txt',
            content: content
        };
    }
    
    generateSecurityReport() {
        const loginCount = this.loginHistory.filter(h => h.action === 'login').length;
        const logoutCount = this.loginHistory.filter(h => h.action === 'logout').length;
        const registerCount = this.loginHistory.filter(h => h.action === 'register').length;
        
        const content = `PASSWORD MANAGER - SECURITY AUDIT REPORT
` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `SECURITY OVERVIEW:\n` +
            `Total Users: ${this.users.length}\n` +
            `Total Login Attempts: ${loginCount}\n` +
            `Total Logouts: ${logoutCount}\n` +
            `Total Registrations: ${registerCount}\n\n` +
            `PASSWORD POLICY:\n` +
            `Minimum Length: ${this.settings.minPasswordLength} characters\n` +
            `Session Timeout: ${this.settings.sessionTimeout} minutes\n` +
            `History Tracking: ${this.settings.trackHistory ? 'Enabled' : 'Disabled'}\n\n` +
            `RECENT ACTIVITY:\n` +
            this.loginHistory.slice(-10).map(entry => 
                `${new Date(entry.timestamp).toLocaleString()} - ${entry.username} (${entry.action})`
            ).join('\n') + '\n';
            
        return {
            filename: 'security_report.txt',
            content: content
        };
    }
    
    initExportData(contentEl) {
        const exportUsersBtn = contentEl.querySelector('#export-users-csv');
        const exportHistoryBtn = contentEl.querySelector('#export-history-csv');
        const exportFullBtn = contentEl.querySelector('#export-full-json');
        const exportStatus = contentEl.querySelector('#export-status');
        
        exportUsersBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${this.apiBaseUrl}/export/users`);
                const csv = await response.text();
                this.downloadFile('users.csv', csv);
                this.showExportStatus(exportStatus, 'Users exported successfully!', 'success');
            } catch (error) {
                this.showExportStatus(exportStatus, 'Failed to export users', 'error');
            }
        });

        exportHistoryBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${this.apiBaseUrl}/export/history`);
                const csv = await response.text();
                this.downloadFile('history.csv', csv);
                this.showExportStatus(exportStatus, 'History exported successfully!', 'success');
            } catch (error) {
                this.showExportStatus(exportStatus, 'Failed to export history', 'error');
            }
        });
        
        exportFullBtn.addEventListener('click', () => {
            const json = this.generateFullJSON();
            this.downloadFile('database.json', json);
            this.showExportStatus(exportStatus, 'Database exported successfully!', 'success');
        });
    }
    
    generateUsersCSV() {
        const headers = 'Username,Salt,Hashed Password,Registered At';
        const rows = this.users.map(user => 
            `"${user.username}","${user.salt}","${user.hashedPassword}","${user.registeredAt}"`
        );
        return headers + '\n' + rows.join('\n');
    }
    
    generateHistoryCSV() {
        const headers = 'Timestamp,Username,Action';
        const rows = this.loginHistory.map(entry => 
            `"${entry.timestamp}","${entry.username}","${entry.action}"`
        );
        return headers + '\n' + rows.join('\n');
    }
    
    generateFullJSON() {
        const data = {
            users: this.users,
            loginHistory: this.loginHistory,
            settings: this.settings,
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }
    
    showExportStatus(statusEl, message, type) {
        statusEl.textContent = message;
        statusEl.className = `export-status ${type}`;
        
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'export-status';
        }, 3000);
    }
    
    initAdvancedSettings(contentEl) {
        const minPasswordLength = contentEl.querySelector('#min-password-length');
        const sessionTimeout = contentEl.querySelector('#session-timeout');
        const trackHistory = contentEl.querySelector('#track-history');
        const clearAllDataBtn = contentEl.querySelector('#clear-all-data');
        const saveSettingsBtn = contentEl.querySelector('#save-settings');
        
        // Load current settings
        minPasswordLength.value = this.settings.minPasswordLength;
        sessionTimeout.value = this.settings.sessionTimeout;
        trackHistory.checked = this.settings.trackHistory;
        
        saveSettingsBtn.addEventListener('click', () => {
            this.settings.minPasswordLength = parseInt(minPasswordLength.value);
            this.settings.sessionTimeout = parseInt(sessionTimeout.value);
            this.settings.trackHistory = trackHistory.checked;
            
            alert('Settings saved successfully!');
        });
        
        clearAllDataBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear ALL data? This action cannot be undone!')) {
                if (confirm('This will delete all users and history. Continue?')) {
                    this.users = [];
                    this.loginHistory = [];
                    alert('All data cleared successfully!');
                    
                    // Close all windows and logout
                    this.handleLogout();
                }
            }
        });
    }
    
    initWallpaperSettings(contentEl) {
        const wallpaperGrid = contentEl.querySelector('#wallpaper-grid');
        const customInput = contentEl.querySelector('#custom-wallpaper-input');
        const customName = contentEl.querySelector('#custom-wallpaper-name');
        const applyBtn = contentEl.querySelector('#apply-custom-wallpaper');
        const dynamicToggle = contentEl.querySelector('#dynamic-wallpaper-toggle');
        const syncBtn = contentEl.querySelector('#sync-wallpapers');

        const renderGrid = () => {
            if (!wallpaperGrid) return;
            wallpaperGrid.innerHTML = '';

            const orderedWallpapers = [
                this.currentWallpaper,
                ...this.wallpapers.filter(w => w.id !== this.currentWallpaper.id)
            ].filter(Boolean);

            orderedWallpapers.forEach(wallpaper => {
                const option = this.createWallpaperOptionElement(wallpaper, wallpaper.id === this.currentWallpaper?.id, () => {
                    this.applyWallpaper(wallpaper);
                    if (dynamicToggle) {
                        dynamicToggle.checked = false;
                    }
                    this.dynamicWallpaperEnabled = false;
                });
                wallpaperGrid.appendChild(option);
            });
        };

        this.wallpaperSettingsRender = renderGrid;
        renderGrid();

        if (customInput && customName && applyBtn) {
            customInput.addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                    customName.textContent = 'No image selected';
                    applyBtn.disabled = true;
                    return;
                }

                customName.textContent = file.name;
                applyBtn.disabled = false;
                this.loadCustomWallpaper(file).then(wallpaper => {
                    this.customWallpaper = wallpaper;
                }).catch(() => {
                    customName.textContent = 'Failed to load image';
                    applyBtn.disabled = true;
                });
            });

            applyBtn.addEventListener('click', () => {
                if (this.customWallpaper) {
                    this.registerCustomWallpaper(this.customWallpaper);
                    this.applyWallpaper(this.customWallpaper);
                    renderGrid();
                    this.populateLoginWallpaperTray();
                    this.dynamicWallpaperEnabled = false;
                    if (dynamicToggle) {
                        dynamicToggle.checked = false;
                    }
                    this.updateStatus('Custom wallpaper applied');
                }
            });
        }

        if (dynamicToggle) {
            dynamicToggle.checked = this.dynamicWallpaperEnabled;
            dynamicToggle.addEventListener('change', () => {
                this.dynamicWallpaperEnabled = dynamicToggle.checked;
                if (this.dynamicWallpaperEnabled) {
                    this.startDynamicWallpaper();
                    this.updateStatus('Dynamic wallpaper enabled');
                } else {
                    this.stopDynamicWallpaper();
                    this.updateStatus('Dynamic wallpaper disabled');
                }
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                const previousId = this.currentWallpaper?.id;
                this.wallpapers = this.loadDefaultWallpapers();
                this.customWallpaper = null;
                this.dynamicWallpaperEnabled = false;
                if (dynamicToggle) {
                    dynamicToggle.checked = false;
                }
                this.currentWallpaper = this.wallpapers.find(w => w.id === previousId) || this.wallpapers[0];
                this.applyWallpaper(this.currentWallpaper, { immediate: true });
                renderGrid();
                this.populateLoginWallpaperTray();
                this.updateStatus('Wallpapers refreshed');
            });
        }
    }

    createWallpaperOptionElement(wallpaper, isActive, onSelect) {
        const option = document.createElement('div');
        option.className = 'wallpaper-option';
        option.dataset.wallpaper = wallpaper.id;
        option.setAttribute('role', 'listitem');
        option.tabIndex = 0;

        if (isActive) {
            option.classList.add('active');
        }

        if (wallpaper.type === 'gradient') {
            option.style.background = wallpaper.value;
        } else if (wallpaper.type === 'image') {
            option.classList.add('image');
            option.style.backgroundImage = `url(${wallpaper.thumbnail || wallpaper.value})`;
        }

        option.innerHTML = `<div class="wallpaper-name">${wallpaper.name}</div>`;

        option.addEventListener('click', onSelect);
        option.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
            }
        });

        return option;
    }

    registerCustomWallpaper(wallpaper) {
        if (!wallpaper?.isCustom) return;
        const nonCustom = this.wallpapers.filter(w => !w.isCustom);
        this.wallpapers = [...nonCustom, wallpaper];
        this.customWallpaper = wallpaper;
    }

    applyWallpaper(wallpaper, options = {}) {
        if (wallpaper?.isCustom) {
            this.registerCustomWallpaper(wallpaper);
        }

        this.currentWallpaper = wallpaper;
        const desktopBg = document.getElementById('desktop-bg');
        const loginScreen = document.getElementById('login-screen');
        const loginCard = document.querySelector('.login-card');

        if (desktopBg) {
            desktopBg.style.transitionProperty = 'opacity';
            if (!options.immediate) {
                desktopBg.classList.add('wallpaper-transition');
            }

            if (wallpaper.type === 'gradient') {
                desktopBg.style.backgroundImage = 'none';
                desktopBg.style.background = wallpaper.value;
            } else {
                desktopBg.style.background = '#000';
                desktopBg.style.backgroundImage = `url(${wallpaper.value})`;
                desktopBg.style.backgroundSize = 'cover';
                desktopBg.style.backgroundPosition = 'center';
            }

            if (!options.immediate) {
                setTimeout(() => desktopBg.classList.remove('wallpaper-transition'), 600);
            }
        }

        if (loginScreen) {
            if (wallpaper.type === 'gradient') {
                loginScreen.style.backgroundImage = 'none';
                loginScreen.style.background = wallpaper.value;
            } else {
                loginScreen.style.background = '#000';
                loginScreen.style.backgroundImage = `url(${wallpaper.value})`;
                loginScreen.style.backgroundSize = 'cover';
                loginScreen.style.backgroundPosition = 'center';
            }
        }

        if (loginCard && wallpaper.palette) {
            loginCard.style.setProperty('--login-glow', wallpaper.palette.glow);
            loginCard.style.setProperty('--login-blur', wallpaper.palette.blur);
        }

        const trayButton = document.querySelector(`.login-wallpaper-thumb[data-wallpaper="${wallpaper.id}"]`);
        if (!trayButton) {
            this.populateLoginWallpaperTray();
        } else {
            this.updateLoginWallpaperTrayActive(wallpaper.id);
        }

        if (this.wallpaperSettingsRender) {
            this.wallpaperSettingsRender();
        }
    }

    startDynamicWallpaper() {
        this.stopDynamicWallpaper();
        if (this.wallpapers.length <= 1) return;
        let index = this.wallpapers.findIndex(w => w.id === this.currentWallpaper?.id);
        if (index < 0) {
            index = 0;
        }
        this.dynamicWallpaperInterval = setInterval(() => {
            index = (index + 1) % this.wallpapers.length;
            const nextWallpaper = this.wallpapers[index];
            if (nextWallpaper.type !== 'image' || !nextWallpaper.isCustom) {
                this.applyWallpaper(nextWallpaper);
            }
        }, 15000);
    }

    stopDynamicWallpaper() {
        if (this.dynamicWallpaperInterval) {
            clearInterval(this.dynamicWallpaperInterval);
            this.dynamicWallpaperInterval = null;
        }
    }

    loadCustomWallpaper(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result;
                if (typeof base64 !== 'string') {
                    reject(new Error('Invalid image data'));
                    return;
                }
                resolve({
                    id: `custom-${Date.now()}`,
                    name: file.name,
                    type: 'image',
                    value: base64,
                    isCustom: true
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    loadDefaultWallpapers() {
        return [
            {
                id: 'ventura-sky',
                name: 'Ventura Sky',
                type: 'image',
                value: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1920&q=80',
                thumbnail: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=60',
                palette: {
                    glow: 'rgba(102, 126, 234, 0.35)',
                    blur: 'rgba(255, 255, 255, 0.18)'
                },
                isDefault: true
            },
            {
                id: 'monterey-waves',
                name: 'Monterey Waves',
                type: 'image',
                value: 'https://images.unsplash.com/photo-1529900748604-07564a03e1f0?auto=format&fit=crop&w=1920&q=80',
                thumbnail: 'https://images.unsplash.com/photo-1529900748604-07564a03e1f0?auto=format&fit=crop&w=600&q=60',
                palette: {
                    glow: 'rgba(88, 183, 255, 0.35)',
                    blur: 'rgba(255, 255, 255, 0.12)'
                }
            },
            {
                id: 'sonoma-dunes',
                name: 'Sonoma Dunes',
                type: 'image',
                value: 'https://images.unsplash.com/photo-1506765515384-028b60a970df?auto=format&fit=crop&w=1920&q=80',
                thumbnail: 'https://images.unsplash.com/photo-1506765515384-028b60a970df?auto=format&fit=crop&w=600&q=60',
                palette: {
                    glow: 'rgba(255, 147, 109, 0.33)',
                    blur: 'rgba(255, 255, 255, 0.15)'
                }
            },
            {
                id: 'night-nebula',
                name: 'Night Nebula',
                type: 'gradient',
                value: 'radial-gradient(circle at top, #4f6cf7, #182352 68%)',
                palette: {
                    glow: 'rgba(79, 108, 247, 0.4)',
                    blur: 'rgba(15, 20, 48, 0.6)'
                }
            },
            {
                id: 'aurora',
                name: 'Aurora',
                type: 'gradient',
                value: 'linear-gradient(125deg, #01a2ff 0%, #34f5c5 50%, #9b66ff 100%)',
                palette: {
                    glow: 'rgba(52, 245, 197, 0.25)',
                    blur: 'rgba(255, 255, 255, 0.18)'
                }
            }
        ];
    }

    populateLoginWallpaperTray() {
        const tray = document.getElementById('login-wallpaper-tray');
        if (!tray) return;

        tray.innerHTML = '';
        const seen = new Set();
        const candidates = [this.currentWallpaper, ...this.wallpapers];
        const selection = [];

        for (const wallpaper of candidates) {
            if (!wallpaper || seen.has(wallpaper.id)) continue;
            seen.add(wallpaper.id);
            selection.push(wallpaper);
            if (selection.length >= 5) break;
        }

        selection.forEach(wallpaper => {
            const button = document.createElement('button');
            button.className = 'login-wallpaper-thumb';
            button.type = 'button';
            button.dataset.wallpaper = wallpaper.id;
            button.title = `Apply ${wallpaper.name}`;

            if (wallpaper.id === this.currentWallpaper?.id) {
                button.classList.add('active');
            }

            if (wallpaper.type === 'gradient') {
                button.style.background = wallpaper.value;
            } else {
                button.style.backgroundImage = `url(${wallpaper.thumbnail || wallpaper.value})`;
                button.style.backgroundSize = 'cover';
                button.style.backgroundPosition = 'center';
            }

            button.addEventListener('click', () => this.applyWallpaper(wallpaper));
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.applyWallpaper(wallpaper);
                }
            });

            tray.appendChild(button);
        });
    }

    updateLoginWallpaperTrayActive(id) {
        const buttons = document.querySelectorAll('.login-wallpaper-thumb');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.wallpaper === id);
        });
    }
    showMessage(messageEl, message, type) {
        messageEl.textContent = message;
        messageEl.className = `login-message ${type}`;
    }
    
    showModal(modal) {
        modal.classList.remove('hidden');
    }
    
    hideModal(modal) {
        modal.classList.add('hidden');
    }
    
    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            timeEl.textContent = timeString;
        }
    }
    
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    addToHistory(username, action) {
        // No-op, handled by backend
    }

    updateStatus(message) {
        const statusEl = document.getElementById('desktop-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    updateMenuUser(name) {
        const userEl = document.getElementById('current-user');
        if (userEl) {
            userEl.textContent = name || 'Guest';
        }
    }

    updateLoginDisplayName(name) {
        const displayEl = document.getElementById('login-username-display');
        if (displayEl) {
            const cleanName = (name || '').trim();
            displayEl.textContent = cleanName || 'Guest';
        }
    }
    
}

// Initialize the application
const passwordManager = new PasswordManager();

// Make it globally accessible for event handlers
window.passwordManager = passwordManager;