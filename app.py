from flask import Flask, render_template, request, jsonify, send_from_directory
from pathlib import Path
from gtts import gTTS
import google.generativeai as genai
import os
import uuid

app = Flask(__name__, template_folder="templates", static_folder="static")

ROOT_DIR = Path(__file__).resolve().parent
MEMORY_FILE = ROOT_DIR / "assistant_memory.txt"
AUDIO_DIR = ROOT_DIR / "audio_outputs"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def load_environment_variables():
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_environment_variables()

API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if API_KEY:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")
else:
    model = None


def load_memory():
    if MEMORY_FILE.exists():
        return [line.strip() for line in MEMORY_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]
    return []


def save_memory(memories):
    recent_memories = memories[-12:]
    MEMORY_FILE.write_text("\n".join(recent_memories), encoding="utf-8")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/audio/<path:filename>")
def serve_audio(filename):
    return send_from_directory(AUDIO_DIR, filename)


@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    user_prompt = (payload.get("message") or "").strip()

    if not user_prompt:
        return jsonify({"reply": "Please enter a message first."}), 400

    if model is None:
        return jsonify({"reply": "The assistant is not configured yet. Please set GEMINI_API_KEY in the hosting environment."}), 503

    memories = load_memory()
    memory_context = "No previous memories." if not memories else "\n".join(f"- {m}" for m in memories)

    full_prompt = (
        f"Conversation memory:\n{memory_context}\n\n"
        f"User: {user_prompt}\n"
        "Please respond warmly, briefly, and in a polished conversational tone."
    )

    try:
        response = model.generate_content(full_prompt)
        reply = response.text.strip() or "I’m here — send me another prompt."
    except Exception as exc:
        reply = f"Sorry, I hit an issue: {exc}"

    memories.extend([f"User: {user_prompt}", f"Assistant: {reply}"])
    save_memory(memories)

    audio_url = None
    try:
        audio_filename = f"response_{uuid.uuid4().hex}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        tts = gTTS(reply, lang="en")
        tts.save(str(audio_path))
        audio_url = f"/audio/{audio_filename}"
    except Exception:
        pass

    return jsonify({"reply": reply, "audio_url": audio_url})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
