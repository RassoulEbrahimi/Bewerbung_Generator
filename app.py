import os
import logging
import time
from datetime import datetime
import re
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from tenacity import retry, stop_after_attempt, wait_exponential
import threading

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://xbewerbung.com", "https://www.xbewerbung.com"]}})

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Store results of background tasks
results = {}

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def call_openai_api(prompt):
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Sie sind ein professioneller Bewerbungsschreiber."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {str(e)}")
        raise

def generate_bewerbung(lebenslauf, stellenanzeige):
    prompt = f"""
    Erstellen Sie ein professionelles Bewerbungsanschreiben auf Deutsch basierend auf folgendem Lebenslauf und der Stellenanzeige:

    Lebenslauf:
    {lebenslauf}

    Stellenanzeige:
    {stellenanzeige}

    Das Anschreiben sollte folgende Punkte enthalten:
    1. Anrede (falls ein Ansprechpartner bekannt ist, ansonsten "Sehr geehrte Damen und Herren,")
    2. Einleitung mit Bezug auf die Stelle
    3. 2-3 Absätze zu relevanten Qualifikationen und Erfahrungen
    4. Abschluss mit Gesprächswunsch
    5. Grußformel

    Bitte verwenden Sie die "Ich"-Form und vermeiden Sie Platzhaltertexte.
    Das Anschreiben sollte nicht länger als 500 Wörter sein.
    """

    try:
        return call_openai_api(prompt), None
    except Exception as e:
        error_message = f"Es ist ein Fehler bei der Generierung des Anschreibens aufgetreten: {str(e)}"
        logger.error(error_message)
        return None, error_message

def background_task(task_id, lebenslauf, stellenanzeige):
    bewerbung, error = generate_bewerbung(lebenslauf, stellenanzeige)
    results[task_id] = {"bewerbung": bewerbung, "error": error}

@app.route('/generate_bewerbung', methods=['POST'])
def api_generate_bewerbung():
    try:
        data = request.json
        lebenslauf = data.get('lebenslauf', '')
        stellenanzeige = data.get('stellenanzeige', '')

        if not lebenslauf or not stellenanzeige:
            return jsonify({"error": "Lebenslauf und Stellenanzeige sind erforderlich."}), 400

        task_id = str(uuid.uuid4())
        threading.Thread(target=background_task, args=(task_id, lebenslauf, stellenanzeige)).start()

        return jsonify({"task_id": task_id}), 202

    except Exception as e:
        logger.exception("Unexpected error in api_generate_bewerbung")
        return jsonify({"error": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."}), 500

@app.route('/check_status/<task_id>', methods=['GET'])
def check_status(task_id):
    if task_id in results:
        result = results[task_id]
        del results[task_id]  # Clean up
        return jsonify(result)
    return jsonify({"status": "processing"}), 202

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/cors-test', methods=['GET', 'OPTIONS'])
def cors_test():
    return jsonify({"message": "CORS test successful"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))