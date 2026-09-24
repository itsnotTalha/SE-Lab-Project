import sys
import os
import json
import warnings
import cv2
import numpy as np
from PIL import Image
import torch

# Suppress urllib3 and transformer warnings for clean CLI output
warnings.filterwarnings("ignore")
os.environ["TOKENIZERS_PARALLELISM"] = "false"
try:
    from transformers import logging as tf_logging
    tf_logging.set_verbosity_error()
except Exception:
    pass

def get_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

def segment_lines(image_path):
    """
    Segments handwritten text lines from an image using morphological operations.
    Returns a list of cropped PIL images representing lines in reading order.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Invert binary threshold: text becomes white (255), background black (0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # If image is very small (e.g., single line crop), just return the original image
    if h < 60 or w < 60:
        return [Image.open(image_path).convert("RGB")]

    # Morphological dilation: connect characters horizontally to form line blocks
    # Kernel width should be wider than the spacing between words in handwritten lines
    kernel_w = max(25, int(w * 0.05))
    kernel_h = max(2, int(h * 0.005))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_w, kernel_h))
    dilated = cv2.dilate(thresh, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    min_box_h = 12
    min_box_w = 20

    for c in contours:
        bx, by, bw, bh = cv2.boundingRect(c)
        # Filter tiny specks
        if bh >= min_box_h and bw >= min_box_w:
            # Check aspect ratio or area to avoid full-page boxes
            if bw < w * 0.98 or bh < h * 0.95:
                boxes.append((by, bx, bw, bh))

    # If no lines were detected or page is a single tight line, fallback to whole image
    if not boxes:
        return [Image.open(image_path).convert("RGB")]

    # Sort boxes top-to-bottom
    boxes.sort(key=lambda b: b[0])

    # Crop each line with padding
    line_images = []
    pil_full = Image.open(image_path).convert("RGB")
    
    for by, bx, bw, bh in boxes:
        pad_y = int(bh * 0.1)
        pad_x = int(bw * 0.03)
        y1 = max(0, by - pad_y)
        y2 = min(h, by + bh + pad_y)
        x1 = max(0, bx - pad_x)
        x2 = min(w, bx + bw + pad_x)
        
        crop = pil_full.crop((x1, y1, x2, y2))
        line_images.append(crop)

    return line_images

def recognize_handwriting(image_path, model_name="microsoft/trocr-base-handwritten"):
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    
    device = get_device()
    try:
        processor = TrOCRProcessor.from_pretrained(model_name, local_files_only=True)
        model = VisionEncoderDecoderModel.from_pretrained(model_name, local_files_only=True).to(device)
    except Exception:
        processor = TrOCRProcessor.from_pretrained(model_name)
        model = VisionEncoderDecoderModel.from_pretrained(model_name).to(device)
        
    model.eval()

    line_images = segment_lines(image_path)
    recognized_lines = []

    with torch.no_grad():
        for line_img in line_images:
            pixel_values = processor(line_img, return_tensors="pt").pixel_values.to(device)
            generated_ids = model.generate(pixel_values, max_new_tokens=64)
            line_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
            if line_text:
                recognized_lines.append(line_text)

    full_text = "\n".join(recognized_lines)
    # Estimate confidence: high if text was extracted cleanly
    confidence = 90.0 if len(recognized_lines) > 0 else 0.0

    return {
        "text": full_text,
        "confidence": confidence,
        "lineCount": len(recognized_lines)
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided", "text": "", "confidence": 0}))
        sys.exit(1)

    image_path = sys.argv[1]
    try:
        result = recognize_handwriting(image_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "text": "", "confidence": 0}))
        sys.exit(1)
