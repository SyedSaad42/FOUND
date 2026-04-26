"""
main.py — Couple Dare Cam API
Uses Gemma 4 (gemma-4-27b-it) via Google Gemini API (AI Studio key)
"""
import uvicorn
import os
import base64
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import google.generativeai as genai

import dotenv
dotenv.load_dotenv()
# ─── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Gemma 4 via Gemini API ───────────────────────────────────────────
# Get your free key at: https://aistudio.google.com/apikey
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is not set.\n"
        "Export it before starting: export GOOGLE_API_KEY=your_key_here"
    )

# genai.configure(api_key=GOOGLE_API_KEY)
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


# Model: Use gemini-1.5-pro for best vision + reasoning
# Available models: gemini-pro, gemini-1.5-pro, gemini-1.5-flash
  
GEMMA_MODEL = "gemini-2.5-flash"

# ─── FastAPI App ──────────────────────────────────────────────────────
app = FastAPI(title="Couple Dare Cam — Gemma 4")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response Models ────────────────────────────────────────

class FrameRequest(BaseModel):
    frames: list[str]   # list of base64-encoded JPEG strings (max 4)
    context: str = ""   # optional free-text hint from the couple

class HealthResponse(BaseModel):
    status: str
    model: str

# ─── Routes ───────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "ok", "model": GEMMA_MODEL}


@app.post("/analyze-frames")
async def analyze_frames(req: FrameRequest):
    if not req.frames:
        raise HTTPException(status_code=400, detail="No frames provided.")

    logger.info(f"Received {len(req.frames)} frame(s). Context: '{req.context}'")

    # ── Validate and decode frames ────────────────────────────────────
    image_parts = []
    for i, frame_b64 in enumerate(req.frames[:8]):
        # Fix base64 padding if needed
        missing = len(frame_b64) % 4
        if missing:
            frame_b64 += "=" * (4 - missing)

        try:
            raw_bytes = base64.b64decode(frame_b64, validate=True)
        except Exception:
            raise HTTPException(
                status_code=422, detail=f"Frame {i} is not valid base64."
            )

        # Append as tuple: (MIME type, base64 data)
        image_parts.append(
            genai.protos.Part(
                inline_data=genai.protos.Blob(
                    mime_type="image/jpeg",
                    data=raw_bytes
                )
            )
        )

    # ── Build prompt ──────────────────────────────────────────────────
    context_line = (
        f"Extra context from the couple: {req.context.strip()}\n"
        if req.context.strip()
        else ""
    )

    system_instruction = (
        "You are a fun, playful, creative,fun and icebraking activity generator for couples. "
        "You read the scene , understand the environment and craft personalised, cheeky but appropriate activity for the couple to do."
    )

    user_prompt = (
    f"{context_line}"
    "Look at these frames and quickly notice:\n"
    "  • Where are they? (café, park, mall, street, etc.)\n"
    "  • What objects or environment details are visible?\n\n"
    "You are a witty wingman generating a fun, spontaneous activity for two people "
    "who just met and are clearly into each other but still a little awkward. "
    "The activity must:\n"
    "  • Use the actual setting or something visible in the frames\n"
    "  • Be completable RIGHT NOW in under 5 minutes\n"
    "  • Create a funny or slightly embarrassing shared moment\n"
    "  • Feel like something a bold friend dared them to do\n"
    "  • Build a tiny bit of intimacy without being weird\n\n"
    "Examples of the TONE (do not copy these, make your own based on the scene):\n"
    "  • 'Ask the person nearest to you to judge whose smile is better. Loser buys the next round.'\n"
    "  • 'You have 60 seconds to find something in this room that describes how you felt when you first saw each other. Go.'\n"
    "  • 'Take turns doing your worst impression of each other ordering coffee. The barista votes on the winner.'\n\n"
    "Output ONE activity in 2-2.5 sentences MAX. Be punchy, funny, and specific to what you see. "
    "No intro, no label, no 'here is your dare'. Just the activity itself."
)

    # ── Stream response from Gemma 4 ──────────────────────────────────
    async def stream_dare():
        try:
            model = genai.GenerativeModel(
                model_name=GEMMA_MODEL,
                system_instruction=system_instruction,
            )

            # Build content: list of image dicts + prompt text
            # The API expects [{"mime_type": "...", "data": ...}, ..., "text prompt"]
            content_list = image_parts + [user_prompt]

            # stream=True returns a streaming GenerateContentResponse
            response_stream = model.generate_content(
                content_list,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.9,
                    max_output_tokens=1000,
                ),
                stream=True,
            )

            for chunk in response_stream:
                token = chunk.text if hasattr(chunk, "text") else ""
                if token:
                    yield f"data: {json.dumps({'text': token})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Gemma 4 error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_dare(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
