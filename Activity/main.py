import os
import cv2
import textwrap
import google.generativeai as genai
from google.cloud import vision

# Environment Setup
GEMMA_API_KEY = os.getenv("GEMMA_API_KEY")
VISION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if not all([GEMMA_API_KEY, VISION_CREDENTIALS]):
    raise RuntimeError("Ensure GEMMA_API_KEY and GOOGLE_APPLICATION_CREDENTIALS are set.")

# Configure Clients
genai.configure(api_key=GEMMA_API_KEY)
gemma_model = genai.GenerativeModel("gemini-1.5-flash")
vision_client = vision.ImageAnnotatorClient()

PERSONA_PROMPT = (
    "You are 'Found', a witty AI lens. I will give you raw data from a vision sensor. "
    "Your job: Interpret the scene, ignore the confidence scores, and tell the user "
    "something interesting or funny about what they are looking at in 2 sentences."
)

def analyze_frame_optimized(frame):
    """One request to Cloud Vision for Labels, Objects, and Text."""
    success, encoded_image = cv2.imencode(".jpg", frame)
    if not success: return None

    image = vision.Image(content=encoded_image.tobytes())
    
    # Batch request for efficiency
    features = [
        {"type_": vision.Feature.Type.LABEL_DETECTION},
        {"type_": vision.Feature.Type.OBJECT_LOCALIZATION},
        {"type_": vision.Feature.Type.TEXT_DETECTION},
    ]
    
    response = vision_client.annotate_image({'image': image, 'features': features})
    
    return {
        "labels": [l.description for l in response.label_annotations[:5]],
        "objects": [obj.name for obj in response.localized_object_annotations[:5]],
        "text": response.full_text_annotation.text.replace("\n", " ") if response.full_text_annotation else ""
    }

def generate_response(vision_data):
    """Synthesize raw data into a persona-driven response."""
    raw_info = (
        f"Labels: {', '.join(vision_data['labels'])}\n"
        f"Objects: {', '.join(vision_data['objects'])}\n"
        f"Text Found: {vision_data['text']}"
    )
    
    prompt = f"{PERSONA_PROMPT}\n\nRaw Sensor Data:\n{raw_info}"
    
    try:
        response = gemma_model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Gemma Error: {str(e)}"

def draw_ui(frame, text):
    """Improved UI overlay with better readability."""
    h, w, _ = frame.shape
    overlay = frame.copy()
    
    # Semi-transparent footer
    cv2.rectangle(overlay, (0, h-150), (w, h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    
    wrapped = textwrap.wrap(text, width=55)
    y = h - 120
    for line in wrapped[:4]:
        cv2.putText(frame, line, (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
        y += 28
    return frame

def main():
    cap = cv2.VideoCapture(0)
    current_text = "Target locked. Press 'G' to scan."
    
    while True:
        ret, frame = cap.read()
        if not ret: break

        display = draw_ui(frame.copy(), current_text)
        cv2.imshow("Found Lens (Vision + Gemma)", display)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'): break
        if key == ord('g'):
            current_text = "Scanning reality..."
            cv2.imshow("Found Lens (Vision + Gemma)", draw_ui(frame.copy(), current_text))
            cv2.waitKey(1)
            
            data = analyze_frame_optimized(frame)
            if data:
                current_text = generate_response(data)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()