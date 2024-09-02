// Immediately invoked function to set initial theme
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    }
})();

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

    // Authentication Functions
    async function register(email, password, name) {
        const response = await fetch('https://xbewerbung.onrender.com/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name }),
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Registration failed');
        }

        return response.json();
    }

    async function login(email, password) {
        const response = await fetch('https://xbewerbung.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Login failed');
        }

        return response.json();
    }

    async function logout() {
        const response = await fetch('https://xbewerbung.onrender.com/logout', {
            method: 'POST',
            mode: 'cors',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Logout failed');
        }

        return response.json();
    }

    // UI Update Functions
    function showAuthSection() {
        authSection.style.display = 'block';
        contentSection.style.display = 'none';
    }

    function showContentSection() {
        authSection.style.display = 'none';
        contentSection.style.display = 'block';
    }

    // Form Submission Handlers
    async function handleRegisterSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const name = document.getElementById('register-name').value;

        try {
            await register(email, password, name);
            alert('Registration successful. Please log in.');
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await login(email, password);
            showContentSection();
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleLogout() {
        try {
            await logout();
            showAuthSection();
        } catch (error) {
            alert(error.message);
        }
    }

    // Form Submission Handler
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
    registerForm.addEventListener('submit', handleRegisterSubmit);
    loginForm.addEventListener('submit', handleLoginSubmit);
    logoutBtn.addEventListener('click', handleLogout);

    // Initial UI setup
    showAuthSection();
});