// Immediately invoked function to set initial theme (Keep this as is)
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    }
})();

// Define API_URL (Keep this as is)
const API_URL = 'https://xbewerbung.onrender.com';

// Main execution
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements (Keep this section as is)
    // ... (all your existing DOM element selections)

    // UI Update Functions (Keep these as is)
    function showAuthSection() {
        // ... (existing code)
    }

    function showContentSection() {
        // ... (existing code)
    }
    
    // Theme Management (Keep these functions as is)
    // ... (all your existing theme management functions)

    // NEW: Form Validation Function
    function validateForm(formId) {
        const form = document.getElementById(formId);
        const emailInput = form.querySelector('input[type="email"]');
        const passwordInput = form.querySelector('input[type="password"]');
        const nameInput = form.querySelector('input[type="text"]');

        let isValid = true;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value)) {
            showError(emailInput, 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
            isValid = false;
        } else {
            clearError(emailInput);
        }

        // Password validation (at least 8 characters, including a number and a special character)
        const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        if (!passwordRegex.test(passwordInput.value)) {
            showError(passwordInput, 'Das Passwort muss mindestens 8 Zeichen lang sein und eine Zahl, ein Sonderzeichen sowie Groß- und Kleinbuchstaben enthalten');
            isValid = false;
        } else {
            clearError(passwordInput);
        }

        // Name validation (only for registration form)
        if (nameInput && nameInput.value.trim() === '') {
            showError(nameInput, 'Bitte geben Sie Ihren Namen ein');
            isValid = false;
        } else if (nameInput) {
            clearError(nameInput);
        }

        return isValid;
    }

    // NEW: Error display functions
    function showError(input, message) {
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.textContent = message;
        } else {
            const error = document.createElement('div');
            error.className = 'error-message';
            error.textContent = message;
            input.parentNode.insertBefore(error, input.nextSibling);
        }
        input.classList.add('error');
    }

    function clearError(input) {
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
        input.classList.remove('error');
    }

    // NEW: Loading indicator functions
    function showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('show'), 10);
    }

    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // MODIFIED: API functions
    async function login(email, password) {
        console.log(`Attempting login for email: ${email}`);
        showLoading();
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
    
            if (!response.ok) {
                throw new Error(responseData.error || 'Login failed');
            }
    
            console.log('Login successful');
            return responseData;
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // MODIFIED: Register function
    async function register(email, password, name) {
        console.log(`Attempting registration for email: ${email}`);
        showLoading();
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name }),
                credentials: 'include'
            });
    
            console.log('Registration response status:', response.status);
    
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed');
            }
    
            const result = await response.json();
            console.log('Registration successful:', result);
            return result;
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // MODIFIED: Event handler functions
    async function handleLoginSubmit(e) {
        e.preventDefault();
        if (!validateForm('login-form')) return;
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
    
        try {
            const result = await login(email, password);
            console.log('Login successful:', result);
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }
            showContentSection();
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    // MODIFIED: Register submit handler
    async function handleRegisterSubmit(e) {
        e.preventDefault();
        if (!validateForm('register-form')) return;
        
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

    // Logout handler (Keep this as is)
    async function handleLogout() {
        // ... (existing code)
    }

    // Form Submission Handler (Keep this as is)
    async function handleFormSubmit(e) {
        // ... (existing code)
    }

    // Result Handling Functions (Keep these as is)
    function handleCopyText() {
        // ... (existing code)
    }

    function handleDownloadText() {
        // ... (existing code)
    }

    // Event Listeners (Keep these as is, but ensure 'remember-me' checkbox exists in HTML)
    // ... (all your existing event listeners)

    // NEW: Check for remembered login
    if (localStorage.getItem('rememberMe') === 'true') {
        showContentSection();
    } else {
        // Initial UI setup
        showAuthSection();
    }

    // Initialize with login tab active (Keep this as is)
    switchTab('login');
});