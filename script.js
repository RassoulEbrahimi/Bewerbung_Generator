document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
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

    // Toggle between file and text inputs
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



    async function testCORS() {
        try {
            const response = await fetch('https://bewerbung-generator.onrender.com/cors-test', {
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
            });
            const data = await response.json();
            console.log('CORS test response:', data);
        } catch (error) {
            console.error('CORS test error:', error);
        }
    }
    
    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', testCORS);



    // Function to generate Bewerbung with improved error handling and timeout
    async function generateBewerbung(lebenslauf, stellenanzeige) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 240000); // 240 seconds timeout


            const response = await fetch('https://bewerbung-generator.onrender.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lebenslauf, stellenanzeige }),
                mode: 'cors',
                credentials: 'same-origin',
                credentials: 'omit',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in generateBewerbung:', error);
            if (error.name === 'AbortError') {
                throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.');
            }
            throw error;
        }
    }

    async function testBackend() {
        try {
            const response = await fetch('https://bewerbung-generator.onrender.com/test', {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });
            const data = await response.json();
            console.log('Test response:', data);
        } catch (error) {
            console.error('Test error:', error);
        }
    }
    
    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', testBackend);

    // Form submission event listener
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        let lebenslauf, stellenanzeige;
        let isFileUpload = fileInputs.style.display !== 'none';

        if (isFileUpload) {
            // File upload logic
            const lebenslaufFile = document.getElementById('lebenslauf').files[0];
            const jobbeschreibungFile = document.getElementById('jobbeschreibung').files[0];

            if (!lebenslaufFile || !jobbeschreibungFile) {
                alert('Bitte wählen Sie sowohl eine Lebenslauf- als auch eine Jobbeschreibungsdatei aus.');
                return;
            }

            lebenslauf = await lebenslaufFile.text();
            stellenanzeige = await jobbeschreibungFile.text();
        } else {
            // Text input logic
            lebenslauf = document.getElementById('lebenslauf-text').value;
            stellenanzeige = document.getElementById('jobbeschreibung-text').value;

            if (!lebenslauf || !stellenanzeige) {
                alert('Bitte geben Sie sowohl den Lebenslauf als auch die Jobbeschreibung ein.');
                return;
            }
        }

        // Show loading indicator
        loadingIndicator.style.display = 'block';
        resultSection.style.display = 'none';

        try {
            const data = await generateBewerbung(lebenslauf, stellenanzeige);
            
            // Handle the response
            generatedContent.innerHTML = `<pre>${data.bewerbung}</pre>`;
            costInfo.textContent = `Geschätzte Kosten: ${data.estimated_cost}`;
            
            // Enable download buttons
            downloadPdfBtn.style.display = 'inline-block';
            downloadDocxBtn.style.display = 'inline-block';

            // Show result buttons
            resultButtons.forEach(btn => btn.style.display = 'block');

            // Show result section and hide loading indicator
            resultSection.style.display = 'block';
            loadingIndicator.style.display = 'none';

            // Scroll to the result section
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error:', error);
            generatedContent.innerHTML = `<p>Es ist ein Fehler aufgetreten: ${error.message}</p>`;
            resultSection.style.display = 'block';
            loadingIndicator.style.display = 'none';
        }
    });

    // Download button event listeners (placeholders for now)
    downloadPdfBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('PDF-Download-Funktion wird implementiert.');
    });

    downloadDocxBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('DOCX-Download-Funktion wird implementiert.');
    });

    // Copy to clipboard functionality
    copyTextBtn.addEventListener('click', function() {
        const textToCopy = generatedContent.textContent;
        navigator.clipboard.writeText(textToCopy).then(function() {
            alert('Text wurde in die Zwischenablage kopiert!');
        }, function(err) {
            console.error('Fehler beim Kopieren des Textes: ', err);
        });
    });

    // Download as text file functionality
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