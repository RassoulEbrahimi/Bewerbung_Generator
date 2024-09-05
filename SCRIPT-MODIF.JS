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

    // ... (keep all the existing functions like updateThemeColor, setTheme, etc.)

    // Modified login function with more logging
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
            console.log('Login response headers:', [...response.headers.entries()]);
    
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

    // Modified register function with more logging
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
            console.log('Registration response headers:', [...response.headers.entries()]);
    
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

    // Modified handleLoginSubmit function
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

    // Modified handleRegisterSubmit function
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

    // ... (keep all other existing functions)

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

    // ... (keep all other existing event listeners)

    // Initial UI setup
    showAuthSection();

    // Initialize with login tab active
    switchTab('login');
});