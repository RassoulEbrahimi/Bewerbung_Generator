// Immediately invoked function to set initial theme
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    }
})();

// Define API_URL
const API_URL = 'https://xbewerbung.onrender.com';

// Main execution
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const uploadForm = document.getElementById('upload-form');
    const fileInputs = document.getElementById('file-inputs');
    const textInputs = document.getElementById('text-inputs');
    const toggleFileBtn = document.getElementById('toggle-file');
    const toggleTextBtn = document.getElementById('toggle-text');
    const lebenslaufInput = document.getElementById('lebenslauf');
    const jobbeschreibungInput = document.getElementById('jobbeschreibung');
    const resultSection = document.getElementById('result-section');
    const generatedContent = document.getElementById('generated-content');
    const costInfo = document.getElementById('cost-info');
    const resultButtons = document.querySelectorAll('.result-btn');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const downloadDocxBtn = document.getElementById('download-docx');
    const downloadTextBtn = document.getElementById('download-text');
    const copyTextBtn = document.getElementById('copy-text');
    const loadingIndicator = document.getElementById('loading-indicator');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const authSection = document.getElementById('auth-section');
    const contentSection = document.getElementById('content-section');
    const tabButtons = document.querySelectorAll('.auth-tab-btn');
    const authForms = document.querySelectorAll('.auth-form');

    console.log('DOM Elements loaded:', {
        loginForm,
        registerForm,
        logoutBtn,
        authSection,
        contentSection
    });

    // UI Update Functions
    function showAuthSection() {
        console.log('Showing auth section');
        if (authSection && contentSection) {
            authSection.style.display = 'block';
            contentSection.style.display = 'none';
        } else {
            console.error('Auth section or content section not found');
        }
    }

    function showContentSection() {
        console.log('Showing content section');
        if (authSection && contentSection && logoutBtn) {
            authSection.style.display = 'none';
            contentSection.style.display = 'block';
            logoutBtn.style.display = 'block';
        } else {
            console.error('Auth section, content section, or logout button not found');
        }
    }

    function switchTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
    
        authForms.forEach(form => { 
            if (form.id === `${tabId}-form`) {
                form.classList.add('fade-in', 'active');
                form.classList.remove('fade-out');
            } else {
                form.classList.add('fade-out');
                form.classList.remove('fade-in', 'active');
            }
        });
    }

    // API functions
    async function login(email, password) {
        console.log(`Attempting login for email: ${email}`);
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
    
            console.log('Login response status:', response.status);
            const responseData = await response.json();
            console.log('Login response data:', responseData);
    
            if (!response.ok) {
                throw new Error(responseData.error || 'Login failed');
            }
    
            console.log('Login successful');
            return responseData;
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    async function register(email, password, name) {
        console.log(`Attempting registration for email: ${email}`);
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name }),
                mode: 'cors',
                credentials: 'include'
            });
    
            console.log('Registration response status:', response.status);
            if (!response.ok) {
                const data = await response.json();
                console.error('Registration failed:', data.error);
                throw new Error(data.error || 'Registration failed');
            }
    
            const result = await response.json();
            console.log('Registration successful:', result);
            return result;
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        }
    }

    // Event handler functions
    async function handleLoginSubmit(e) {
        e.preventDefault();
        console.log('Login form submitted');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
    
        try {
            const result = await login(email, password);
            console.log('Login successful:', result);
            showContentSection();
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    async function handleRegisterSubmit(e) {
        e.preventDefault();
        console.log('Register form submitted');
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
    
        try {
            const result = await register(email, password, name);
            console.log('Registration successful:', result);
            alert('Registration successful. Please log in.');
            switchTab('login');
        } catch (error) {
            console.error('Registration failed:', error);
            alert(`Registration failed: ${error.message}`);
        }
    }

    async function handleLogout() {
        console.log('Logout initiated');
        try {
            const response = await fetch(`${API_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
    
            if (response.ok) {
                console.log('Logout successful');
                showAuthSection();
                logoutBtn.style.display = 'none';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('Fehler beim Abmelden. Bitte versuchen Sie es erneut.');
        }
    }

    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
        console.log('Login form event listener attached');
    } else {
        console.error('Login form not found in the DOM');
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
        console.log('Register form event listener attached');
    } else {
        console.error('Register form not found in the DOM');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button event listener attached');
    } else {
        console.error('Logout button not found in the DOM');
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Initial UI setup
    showAuthSection();

    // Initialize with login tab active
    switchTab('login');
});