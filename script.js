// Immediately invoked function to set initial theme
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
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

    // Function to set the theme
    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleBtn.textContent = '🌙';
        }
        localStorage.setItem('theme', theme);
    }

    // Function to get current theme
    function getCurrentTheme() {
        return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    }

    // Function to check system preference
    function getSystemPreference() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Function to apply the correct theme
    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme(getSystemPreference());
        }
    }

    // Apply theme on load
    applyTheme();

    // Toggle theme
    themeToggleBtn.addEventListener('click', function() {
        const newTheme = getCurrentTheme() === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    // Listen for system preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addListener(function(e) {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // Rest of your existing code...
    toggleFileBtn.addEventListener('click', function() {
        fileInputs.style.display = 'block';
        textInputs.style.display = 'none';
        toggleFileBtn.classList.add('active');
        toggleTextBtn.classList.remove('active');
    });

    toggleTextBtn.addEventListener('click', function() {
        fileInputs.style.display = 'none';
        textInputs.style.display = 'block';
        toggleFileBtn.classList.remove('active');
        toggleTextBtn.classList.add('active');
    });

    // Set "Text eingeben" as default
    toggleTextBtn.click();

    // Function to validate file type
    function validateFileType(file, allowedTypes) {
        return allowedTypes.includes(file.type);
    }

    // Function to display file name
    function displayFileName(input) {
        const fileName = input.files[0].name;
        const fileNameDisplay = input.nextElementSibling || document.createElement('span');
        fileNameDisplay.textContent = `Selected file: ${fileName}`;
        fileNameDisplay.className = 'file-name-display';
        if (!input.nextElementSibling) {
            input.parentNode.insertBefore(fileNameDisplay, input.nextSibling);
        }
    }

    // Event listeners for file inputs
    lebenslaufInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (validateFileType(file, ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])) {
            displayFileName(this);
        } else {
            alert('Bitte wählen Sie eine PDF-, DOCX- oder TXT-Datei für Ihren Lebenslauf aus.');
            this.value = ''; // Clear the input
        }
    });

    jobbeschreibungInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (validateFileType(file, ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])) {
            displayFileName(this);
        } else {
            alert('Bitte wählen Sie eine PDF-, DOCX- oder TXT-Datei für Ihre Jobbeschreibung aus.');
            this.value = ''; // Clear the input
        }
    });

    // Function to generate Bewerbung with improved error handling and timeout
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
                credentials: 'omit',  // Ensure only one credentials setting is used
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
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

    // Form submission event listener
    uploadForm.addEventListener('submit', async function(e) {
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
        }
    });

    // Download button event listeners
    downloadPdfBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('PDF-Download-Funktion wird implementiert.');
    });

    downloadDocxBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('DOCX-Download-Funktion wird implementiert.');
    });

    copyTextBtn.addEventListener('click', function() {
        const textToCopy = generatedContent.textContent;
        navigator.clipboard.writeText(textToCopy).then(function() {
            alert('Text wurde in die Zwischenablage kopiert!');
        }, function(err) {
            console.error('Fehler beim Kopieren des Textes: ', err);
        });
    });

    downloadTextBtn.addEventListener('click', function() {
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
    });
});