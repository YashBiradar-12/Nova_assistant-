# Nova Assistant

![Nova Assistant UI](docs/Screenshot%20(104).png)
![Nova Assistant UI](docs/Screenshot%20(105).png)

Nova is a voice-first AI assistant...


# Nova Assistant

Nova is a voice-first AI assistant web app built with Flask, Gemini, and browser speech features. It offers a modern chat experience with voice input, AI responses, and spoken replies in a polished assistant-style interface.

## Tech Stack

- Python
- Flask
- Google Gemini API
- HTML
- CSS
- JavaScript

## Features

- 🎤 Voice input
- 🤖 Gemini AI responses
- 🔊 Text-to-speech replies
- 💬 Modern chat interface
- 🧠 Conversation memory
- ✨ Responsive UI
 

## Required software

- Python 3.10+
- Git
- A Google AI Studio Gemini API key

## Installation

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Create your environment file

Create a file named `.env` in the project root with the following content:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

You can copy the example file instead:

```bash
copy .env.example .env
```

## How to get a Google API key

1. Go to Google AI Studio.
2. Create or sign in to your Google account.
3. Create a new API key.
4. Paste it into your `.env` file as `GEMINI_API_KEY`.

## Run locally

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

## Deploy for free

Recommended free platforms:
- Render
- Railway
- Hugging Face Spaces
- PythonAnywhere

### Deployment steps
1. Push this project to GitHub.
2. Create a new web service on Render or Railway.
3. Set the environment variable `GEMINI_API_KEY` in the hosting dashboard.
4. Start the app with `python app.py` or let the platform detect Flask automatically.

## Notes
- The app reads secrets from environment variables and a local `.env` file.
- The `.env` file is ignored by Git and should never be committed.
- Voice features rely on browser microphone permissions.
