import os, base64, io, requests, time, hashlib
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=os.getenv("OPENAI_KEY"))

# ===============================
# SETTINGS
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSE_REF_PATH = os.path.join(BASE_DIR, "pose_reference.jpeg")

MAX_PER_MINUTE = 5
COOLDOWN_SECONDS = 2

RATE_LIMIT = {}
COOLDOWN = {}
CACHE = {}
TOTAL_GENERATED = 0
TOTAL_GENERATED = 0

STYLE_PROMPTS = {
    "cartoon": "cartoon style, pixar lighting",
    "anime": "anime style",
    "fantasy": "fantasy illustration",
    "custom": ""
}

# ===============================
# HELPERS
# ===============================

def rate_limit_ok(ip):
    now = time.time()
    timestamps = RATE_LIMIT.get(ip, [])
    timestamps = [t for t in timestamps if now - t < 60]
    RATE_LIMIT[ip] = timestamps

    if len(timestamps) >= MAX_PER_MINUTE:
        return False

    timestamps.append(now)
    RATE_LIMIT[ip] = timestamps
    return True


def cooldown_ok(ip):
    now = time.time()
    last = COOLDOWN.get(ip, 0)

    if now - last < COOLDOWN_SECONDS:
        return False

    COOLDOWN[ip] = now
    return True


def convert_to_png(b64):
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def make_cache_key(img_bytes, style, extra_prompt):
    h = hashlib.sha256()
    h.update(img_bytes)
    h.update(style.encode())
    h.update(extra_prompt.encode())
    return h.hexdigest()

# ===============================
# ROUTE
# ===============================
@app.route("/api/generate-pfp", methods=["POST"])
def generate():
    global TOTAL_GENERATED

    ip = request.remote_addr

    if not rate_limit_ok(ip):
        return jsonify({"error": "Rate limit reached"}), 429

    if not cooldown_ok(ip):
        return jsonify({"error": "Slow down"}), 429

    data = request.json
    user_b64 = data.get("image")
    style = data.get("style", "cartoon")
    extra_prompt = data.get("extra_prompt", "")

    if not user_b64:
        return jsonify({"error": "No image"}), 400

    try:
        # ---------------- PNG convert ----------------
        user_png = convert_to_png(user_b64)

        # ---------------- cache check ----------------
        key = make_cache_key(user_png, style, extra_prompt)
        if key in CACHE:
            print("CACHE HIT")
            return jsonify({"image": CACHE[key], "cached": True})

        # ---------------- load pose reference ----------------
        if not os.path.exists(POSE_REF_PATH):
            return jsonify({"error": "pose_reference.jpeg missing"}), 500

        with open(POSE_REF_PATH, "rb") as f:
            pose_bytes = f.read()

        # ---------------- style ----------------
        style_text = STYLE_PROMPTS.get(style, STYLE_PROMPTS["cartoon"])
        style_text = f"{style_text}, {extra_prompt}, cinematic lighting, golden hour, shallow depth of field"

        # ===============================
        # 🔥 MAIN PROMPT (UPGRADED)
        # ===============================
        prompt = f"""
Use the second image strictly as a pose and composition reference.

Transform the subject from the first image into a cinematic, highly detailed profile picture inspired by a golden retriever dog in a dramatic outdoor field.

CORE RULES:
- Preserve the identity, facial structure, and key features of the original subject
- Match the pose, framing, and composition of the reference image exactly
- Keep the subject centered and optimized for a profile picture (1:1)

DOG TRANSFORMATION STYLE:
- Reimagine the subject as:
  (a) a dog-like version of the subject, OR
  (b) the subject alongside or fused with a golden retriever (hybrid style)
- Maintain recognizability while blending subtle dog features (fur texture, ears, expression)

CINEMATIC LOOK:
- Golden hour lighting (warm sunlight, soft glow)
- Shallow depth of field (blurred background, sharp subject)
- Natural outdoor environment (grass field, sunset tones, light mist)

FIRE / VIRAL EFFECTS:
- Add subtle glowing embers, sparks, and floating particles
- Light rays and soft atmospheric haze
- Slight dramatic shadows for intensity
- Do NOT overdo effects — keep it clean and aesthetic

STYLE:
{style_text}

QUALITY:
- ultra detailed
- realistic textures
- cinematic color grading
- soft contrast, not harsh

FINAL RESULT:
A viral-quality, emotional, cinematic profile picture that feels like a movie still.
"""

        # =================================================
        # TRY NEW MODEL FIRST
        # =================================================
        try:
            print("Trying gpt-image-1...")

            result = client.images.edit(
                model="gpt-image-1",
                image=[
                    ("char.png", user_png, "image/png"),
                    ("pose.png", pose_bytes, "image/png")
                ],
                prompt=prompt,
                size="1024x1024"
            )

            image_base64 = result.data[0].b64_json
            model_used = "gpt-image-1"

        except Exception as e:
            print("Fallback to dall-e-2", e)

            result = client.images.edit(
                model="dall-e-2",
                image=("char.png", user_png, "image/png"),
                prompt=prompt,
                size="1024x1024"
            )

            url = result.data[0].url
            img_bytes = requests.get(url).content
            image_base64 = base64.b64encode(img_bytes).decode()
            model_used = "dall-e-2"

        CACHE[key] = image_base64
        TOTAL_GENERATED += 1

        print("Generated:", TOTAL_GENERATED)

        return jsonify({
            "image": image_base64,
            "model": model_used,
            "cached": False
        })

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

    
@app.route("/stats")
def stats():
    return jsonify({
        "generated": TOTAL_GENERATED,
        "cache": len(CACHE)
    })


@app.route("/health")
def health():
    return jsonify({"status": "ok"})

