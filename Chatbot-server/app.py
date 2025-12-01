import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai  # Gemini SDK

# Load environment variables from .env (GEMINI_API_KEY)
load_dotenv()

# Client will read GEMINI_API_KEY from environment
client = genai.Client()

app = Flask(__name__)
CORS(app)  # allow frontend on different origin

SYSTEM_PROMPT = """
You are Krishi Mitra, a friendly agricultural assistant for Indian farmers.
- Answer briefly and clearly.
- Focus on crops, pests, irrigation, soil, and Indian government schemes.
- If you are not sure, say so and suggest contacting a local agriculture officer.
- Always end with: "Kripya local krishi visheshagya se bhi salaah lein."
"""

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)

    # New: read lang from JSON body
    lang = (data.get("lang") or "").strip().lower()
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({"reply": "Kripya koi prashn likhiye."}), 400

    # Build language-specific instruction
    if lang == "hindi":
        language_instruction = (
            "Respond ONLY in Hindi (Devanagari script). "
            "Do not write sentences in English."
        )
    elif lang == "en":
        language_instruction = (
            "Respond ONLY in English. "
            "Do not mix Hindi words except for proper names."
        )
    else:
        # fallback / auto mode
        language_instruction = (
            "You may respond in Hindi or English depending on what is most "
            "comfortable for the user (Hinglish allowed)."
        )

    try:
        # Combine system prompt + language instruction + user question
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"Language instruction: {language_instruction}\n\n"
            f"User question:\n{user_message}\n\n"
            f"Answer:"
        )

        # Call Gemini 2.5 Flash (free-tier-friendly model)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        bot_reply = response.text.strip() if response.text else \
            "Maaf kijiye, main jawaab generate nahi kar paaya."

        return jsonify({"reply": bot_reply})

    except Exception as e:
        print("Error talking to Gemini:", e)
        return jsonify({
            "reply": (
                "Maaf kijiye, abhi system mein kuch samasya aa rahi hai. "
                "Thodi der baad dobara koshish karein."
            )
        }), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
