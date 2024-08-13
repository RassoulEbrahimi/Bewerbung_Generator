import re
import os
import logging
import time
from datetime import datetime
from functools import wraps

import tiktoken
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def calculate_cost(input_tokens, output_tokens, model="gpt-3.5-turbo-0125", is_batch=False):
    input_price = 0.50
    output_price = 1.50
    
    input_millions = input_tokens / 1_000_000
    output_millions = output_tokens / 1_000_000
    
    total_cost = (input_millions * input_price) + (output_millions * output_price)
    
    if is_batch:
        total_cost *= 0.5
    
    return total_cost

def rate_limit(max_per_minute):
    min_interval = 60.0 / max_per_minute
    last_called = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            left_to_wait = min_interval - elapsed
            if left_to_wait > 0:
                time.sleep(left_to_wait)
            ret = func(*args, **kwargs)
            last_called[0] = time.time()
            return ret
        return wrapper
    return decorator

def num_tokens_from_string(string: str, encoding_name: str = "cl100k_base") -> int:
    encoding = tiktoken.get_encoding(encoding_name)
    return len(encoding.encode(string))

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

def extract_key_information(lebenslauf, stellenanzeige):
    info = {
        "applicant_name": "",
        "applicant_address": "",
        "job_position": "",
        "company_name": "",
        "company_address": "",
        "requirements": [],
        "responsibilities": []
    }

    lebenslauf_lines = lebenslauf.split('\n')
    info["applicant_name"] = lebenslauf_lines[0].strip()
    info["applicant_address"] = "\n".join(lebenslauf_lines[1:4]).strip()

    position_match = re.search(r'Stellenanzeige:\s*([\w\s]+)\s*\(m/w/d\)', stellenanzeige)
    if position_match:
        info["job_position"] = position_match.group(1).strip()

    company_match = re.search(r'Unternehmen:\s*([\w\s]+)', stellenanzeige)
    if company_match:
        info["company_name"] = company_match.group(1).strip()

    address_match = re.search(r'([\w\s]+\n\d{5}\s*[\w\s]+)', stellenanzeige)
    if address_match:
        info["company_address"] = address_match.group(1).strip()

    req_section = re.search(r'Ihr Profil:(.*?)(?=Wir bieten:|$)', stellenanzeige, re.DOTALL)
    if req_section:
        info["requirements"] = [req.strip() for req in req_section.group(1).split('\n') if req.strip()]

    resp_section = re.search(r'Aufgaben:(.*?)(?=Ihr Profil:|$)', stellenanzeige, re.DOTALL)
    if resp_section:
        info["responsibilities"] = [resp.strip() for resp in resp_section.group(1).split('\n') if resp.strip()]

    return info

def generate_bewerbung(lebenslauf, stellenanzeige):
    info = extract_key_information(lebenslauf, stellenanzeige)
    
    prompt = f"""
    Erstellen Sie ein professionelles Bewerbungsanschreiben auf Deutsch basierend auf folgendem Lebenslauf und der Stellenanzeige:

    Bewerber: {info['applicant_name']}
    Position: {info['job_position']}
    Unternehmen: {info['company_name']}
    Adresse: {info['company_address']}

    Lebenslauf:
    {lebenslauf}

    Stellenanzeige:
    {stellenanzeige}

    Anforderungen:
    {', '.join(info['requirements'])}

    Aufgaben:
    {', '.join(info['responsibilities'])}

    Das Anschreiben sollte folgende Punkte enthalten:
    1. Anrede (falls ein Ansprechpartner bekannt ist, ansonsten "Sehr geehrte Damen und Herren,")
    2. Einleitung mit Bezug auf die Stelle
    3. 2-3 Absätze zu relevanten Qualifikationen und Erfahrungen, die auf die Anforderungen und Aufgaben eingehen
    4. Abschluss mit Gesprächswunsch
    5. Grußformel

    Bitte verwenden Sie durchgehend die "Ich"-Form und vermeiden Sie Platzhaltertexte.
    Das Anschreiben sollte nicht länger als 500 Wörter sein.
    Beginnen Sie direkt mit der Anrede, ohne vorherige Adressinformationen oder Überschriften.
    """

    prompt_tokens = num_tokens_from_string(prompt)
    
    try:
        bewerbung = call_openai_api(prompt)
        
        completion_tokens = num_tokens_from_string(bewerbung)
        total_tokens = prompt_tokens + completion_tokens
        
        cost = calculate_cost(prompt_tokens, completion_tokens)
        
        logger.info(f"Tokens used: {total_tokens} (Prompt: {prompt_tokens}, Completion: {completion_tokens})")
        logger.info(f"Estimated cost: ${cost:.6f}")
        
        formatted_bewerbung = format_bewerbung(bewerbung, info)
        formatted_bewerbung += f"\n\nGeschätzte Kosten für diese Bewerbung: ${cost:.6f}"
        
        return formatted_bewerbung, None, cost
    except Exception as e:
        error_message = f"Es ist ein Fehler bei der Generierung des Anschreibens aufgetreten: {str(e)}"
        logger.error(error_message)
        return None, error_message, None

def format_bewerbung(bewerbung, info):
    current_date = datetime.now().strftime('%d.%m.%Y')
    header = f"""{info['applicant_name']}
{info['applicant_address']}

{info['company_name']}
{info['company_address']}

{current_date}

Bewerbung als {info['job_position']}

"""
    full_bewerbung = header + bewerbung

    if full_bewerbung.count("Mit freundlichen Grüßen") > 1:
        full_bewerbung = full_bewerbung.rsplit("Mit freundlichen Grüßen", 1)[0] + "Mit freundlichen Grüßen\n\n" + info['applicant_name']
    
    return full_bewerbung.strip()

@app.route('/generate_bewerbung', methods=['POST'])
@rate_limit(max_per_minute=10)
def api_generate_bewerbung():
    data = request.json
    lebenslauf = data.get('lebenslauf', '')
    stellenanzeige = data.get('stellenanzeige', '')

    if not lebenslauf or not stellenanzeige:
        return jsonify({"error": "Lebenslauf und Stellenanzeige sind erforderlich."}), 400

    bewerbung, error, cost = generate_bewerbung(lebenslauf, stellenanzeige)
    if error:
        return jsonify({"error": error}), 500
    return jsonify({"bewerbung": bewerbung, "estimated_cost": f"${cost:.6f}"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)