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
    
    // Theme Management
    function updateThemeColor() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const themeColorMeta = document.querySelector("#theme-color-meta");
        
        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", isDarkMode ? "#081b29" : "#00abf0");
        }
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
        }
        localStorage.setItem('theme', theme);
        updateThemeColor();
    }

    function getCurrentTheme() {
        return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    }

    function getSystemPreference() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        setTheme(savedTheme || getSystemPreference());
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

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Apply theme on load
    applyTheme();

    // Event Listeners
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const newTheme = getCurrentTheme() === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addListener(function(e) {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }


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

    // NEW: Show Error MSG
    function showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000); // Remove after 5 seconds
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

    // Input Toggle Functionality
    function showFileInputs() {
        fileInputs.style.display = 'block';
        textInputs.style.display = 'none';
        toggleFileBtn.classList.add('active');
        toggleTextBtn.classList.remove('active');
    }

    function showTextInputs() {
        fileInputs.style.display = 'none';
        textInputs.style.display = 'block';
        toggleFileBtn.classList.remove('active');
        toggleTextBtn.classList.add('active');
    }

    toggleFileBtn.addEventListener('click', showFileInputs);
    toggleTextBtn.addEventListener('click', showTextInputs);

    // Set "Text eingeben" as default
    showTextInputs();

    // File Handling Functions
    function validateFileType(file, allowedTypes) {
        return allowedTypes.includes(file.type);
    }

    function displayFileName(input) {
        const fileName = input.files[0].name;
        const fileNameDisplay = input.nextElementSibling || document.createElement('span');
        fileNameDisplay.textContent = `Selected file: ${fileName}`;
        fileNameDisplay.className = 'file-name-display';
        if (!input.nextElementSibling) {
            input.parentNode.insertBefore(fileNameDisplay, input.nextSibling);
        }
    }

    function handleFileInputChange(input, fileType) {
        const file = input.files[0];
        if (validateFileType(file, ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])) {
            displayFileName(input);
        } else {
            alert(`Bitte wählen Sie eine PDF-, DOCX- oder TXT-Datei für Ihren ${fileType} aus.`);
            input.value = ''; // Clear the input
        }
    }

    // MODIFIED: API functions
    // API functions
    // Modified login function with more logging 
    async function login(email, password) {
        console.log(`Attempting login for email: ${email}`);
        showLoading();
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
    
            console.log('Login response status:', response.status);
            const responseData = await response.json();
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Anmeldung fehlgeschlagen');
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

    // API Interaction
    async function generateBewerbung(lebenslauf, stellenanzeige) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 240000); // 240 seconds timeout

            const response = await fetch('https://xbewerbung.onrender.com/generate_bewerbung', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lebenslauf, stellenanzeige }),
                mode: 'cors',
                credentials: 'include',  // Changed to 'include' to send cookies
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Sie müssen sich anmelden, um eine Bewerbung zu generieren.');
                }
                if (response.status === 0) {
                    throw new Error('Network error. This might be a CORS issue. Please check the server configuration.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in generateBewerbung:', error);
            if (error.name === 'AbortError') {
                throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.');
            }
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Netzwerkfehler. Dies könnte ein CORS-Problem sein. Bitte überprüfen Sie die Serverkonfiguration.');
            }
            throw error;
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
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registrierung fehlgeschlagen');
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
            showLoading();
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
            showErrorMessage(error.message || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        } finally {
            hideLoading();
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
            showLoading();
            const result = await register(email, password, name);
            console.log('Registration successful:', result);
            showErrorMessage('Registrierung erfolgreich. Bitte melden Sie sich an.');
            switchTab('login');
        } catch (error) {
            console.error('Registration failed:', error);
            showErrorMessage(error.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        } finally {
            hideLoading();
        }
    }
    

    // Logout handler (Keep this as is)
    async function handleLogout() {
        console.log('Logout initiated');
        try {
            const csrfToken = await getCsrfToken(); // Make sure this function is implemented
            const response = await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({}), // Send an empty object
                credentials: 'include'
            });
    
            if (response.ok) {
                console.log('Logout successful');
                showAuthSection();
                logoutBtn.style.display = 'none';
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Abmeldung fehlgeschlagen');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('Fehler beim Abmelden. Bitte versuchen Sie es erneut.');
        }
    }

    // Form Submission Handler (Keep this as is)
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        let lebenslauf, stellenanzeige;
        let isFileUpload = fileInputs.style.display !== 'none';

        if (isFileUpload) {
            const lebenslaufFile = document.getElementById('lebenslauf').files[0];
            const jobbeschreibungFile = document.getElementById('jobbeschreibung').files[0];

            if (!lebenslaufFile || !jobbeschreibungFile) {
                alert('Bitte wählen Sie sowohl eine Lebenslauf- als auch eine Jobbeschreibungsdatei aus.');
                return;
            }

            lebenslauf = await lebenslaufFile.text();
            stellenanzeige = await jobbeschreibungFile.text();
        } else {
            lebenslauf = document.getElementById('lebenslauf-text').value;
            stellenanzeige = document.getElementById('jobbeschreibung-text').value;

            if (!lebenslauf || !stellenanzeige) {
                alert('Bitte geben Sie sowohl den Lebenslauf als auch die Jobbeschreibung ein.');
                return;
            }
        }

        loadingIndicator.style.display = 'block';
        resultSection.style.display = 'none';

        try {
            const data = await generateBewerbung(lebenslauf, stellenanzeige);
            if (data.error) {
                throw new Error(data.error);
            }
            generatedContent.innerHTML = `<pre>${data.bewerbung}</pre>`;
            costInfo.textContent = `Geschätzte Kosten: ${data.estimated_cost}`;
            resultButtons.forEach(btn => btn.style.display = 'block');
            resultSection.style.display = 'block';
            loadingIndicator.style.display = 'none';
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Fehler beim Generieren der Bewerbung:', error.message);
            alert(`Ein Fehler ist aufgetreten: ${error.message}`);
            loadingIndicator.style.display = 'none';
            if (error.message.includes('Sie müssen sich anmelden')) {
                showAuthSection();
            }
        }
    }

    // Result Handling Functions
    function handleCopyText() {
        const textToCopy = generatedContent.textContent;
        navigator.clipboard.writeText(textToCopy).then(function() {
            alert('Text wurde in die Zwischenablage kopiert!');
        }, function(err) {
            console.error('Fehler beim Kopieren des Textes: ', err);
        });
    }

    function handleDownloadText() {
        const text = generatedContent.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Bewerbung.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    // Additional Event Listeners
    lebenslaufInput.addEventListener('change', function(e) {
        handleFileInputChange(this, 'Lebenslauf');
    });

    jobbeschreibungInput.addEventListener('change', function(e) {
        handleFileInputChange(this, 'Jobbeschreibung');
    });

    uploadForm.addEventListener('submit', handleFormSubmit);

    downloadPdfBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('PDF-Download-Funktion wird implementiert.');
    });

    downloadDocxBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('DOCX-Download-Funktion wird implementiert.');
    });

    copyTextBtn.addEventListener('click', handleCopyText);

    downloadTextBtn.addEventListener('click', handleDownloadText);
    // New Event Listeners
    loginForm.addEventListener('submit', handleLoginSubmit);
    registerForm.addEventListener('submit', handleRegisterSubmit);
    logoutBtn.addEventListener('click', handleLogout);

    // NEW: Check for remembered login
    if (localStorage.getItem('rememberMe') === 'true') {
        showContentSection();
    } else {
        // Initial UI setup
        showAuthSection();
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

    // Initial UI setup
    showAuthSection();

    // Initialize with login tab active
    switchTab('login');
});