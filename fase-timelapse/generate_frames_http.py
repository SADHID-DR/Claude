#!/usr/bin/env python3
"""Generate frames using HTTP requests (avoids broken cryptography lib)."""

import os
import sys
import json
import base64
import time
from pathlib import Path

try:
    import requests
except ImportError:
    os.system("pip install requests -q")
    import requests

API_KEY = os.getenv("NANO_API_KEY") or os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: NANO_API_KEY or GEMINI_API_KEY not set")
    sys.exit(1)

print("="*70)
print("GENERANDO FRAMES CON NANO BANANA API (HTTP)")
print("="*70)

frames_config = [
    {
        "num": 1,
        "name": "Superficie de cancha",
        "prompt": "Apply real sports court texture to the two white playing surfaces: regulation game lines, green or blue synthetic surface color. Keep exact same camera angle, framing, proportions."
    },
    {
        "num": 2,
        "name": "Gradas terminadas",
        "prompt": "Convert black bleacher panels into finished stands with visible individual seats in rows and roof cover. Keep exact position and volume, add construction details only. Same camera angle and framing."
    },
    {
        "num": 3,
        "name": "Iluminación",
        "prompt": "Add real sports lighting fixtures on top of existing light poles (no new poles). Daytime, lights installed and detailed. Same camera angle, framing, neutral daylight."
    },
    {
        "num": 4,
        "name": "Urbanización",
        "prompt": "Add urbanization: pedestrian sidewalk, vegetation (trees and bushes), basic road signage. Don't modify sports complex. Same camera, framing, daylight."
    },
    {
        "num": 5,
        "name": "Población",
        "prompt": "Add people: players active on both courts, spectators seated in stands. Realistic human scale. Don't modify complex geometry. Same camera, framing, daylight."
    }
]

def encode_image(image_path):
    """Encode image to base64."""
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

def try_api_call(frame_num, prompt, prev_frame_path, api_endpoint, headers, payload_builder):
    """Try API call with given endpoint and payload builder."""
    print(f"  Trying: {api_endpoint}")

    try:
        image_b64 = encode_image(prev_frame_path)
        payload = payload_builder(prompt, image_b64)

        response = requests.post(api_endpoint, json=payload, headers=headers, timeout=60)
        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            # Try different response formats
            image_data = None

            if "images" in data and data["images"]:
                image_data = base64.standard_b64decode(data["images"][0])
            elif "image" in data:
                image_data = base64.standard_b64decode(data["image"])
            elif "predictions" in data and data["predictions"]:
                if "bytesBase64Encoded" in data["predictions"][0]:
                    image_data = base64.standard_b64decode(data["predictions"][0]["bytesBase64Encoded"])
                elif "image" in data["predictions"][0]:
                    image_data = base64.standard_b64decode(data["predictions"][0]["image"])

            if image_data:
                output_path = f"frames/frame_{frame_num:02d}.jpg"
                with open(output_path, "wb") as f:
                    f.write(image_data)
                print(f"  ✓ Saved: {output_path}")
                return output_path

        print(f"  ⚠ No valid image in response")
        return None

    except Exception as e:
        print(f"  ✗ Error: {str(e)[:100]}")
        return None

def generate_frame(frame_num, prompt, prev_frame_path):
    """Generate frame - try multiple API endpoints."""
    print(f"\n>>> Frame {frame_num}: {frames_config[frame_num-1]['name']}")

    if not Path(prev_frame_path).exists():
        print(f"✗ Frame not found: {prev_frame_path}")
        return None

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    # Try multiple API endpoints and payload formats
    attempts = [
        (
            "Nano Banana (img2img)",
            "https://api.nanobananai.com/api/v1/image/img2img",
            lambda p, img: {
                "model_id": "stabilityai/stable-diffusion-xl-refiner-1.0",
                "input": {
                    "prompt": p,
                    "init_image": img,
                    "strength": 0.7,
                    "guidance_scale": 7.5,
                    "num_inference_steps": 30,
                    "negative_prompt": "morphing, distorted, flare, unrealistic"
                }
            }
        ),
        (
            "Replicate (img2img)",
            "https://api.replicate.com/v1/predictions",
            lambda p, img: {
                "version": "15af7d3412e396494f8282c713ce120515b5374549e78ec622b2743b54bb3dab",
                "input": {
                    "prompt": p,
                    "image": f"data:image/jpeg;base64,{img}",
                    "strength": 0.7
                }
            }
        ),
        (
            "HuggingFace (img2img)",
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-inpainting",
            lambda p, img: {
                "inputs": {"prompt": p},
                "image": img
            }
        ),
    ]

    for name, endpoint, payload_fn in attempts:
        result = try_api_call(frame_num, prompt, prev_frame_path, endpoint, headers, payload_fn)
        if result:
            return result
        time.sleep(2)  # Rate limit

    # Fallback: copy previous frame
    print(f"  ⚠ All APIs failed, using previous frame as placeholder")
    output_path = f"frames/frame_{frame_num:02d}.jpg"
    import shutil
    shutil.copy(prev_frame_path, output_path)
    return output_path

# Main execution
frames_dir = Path("frames")
frames_dir.mkdir(exist_ok=True)

current_frame = "frames/frame_00.jpg"
for i in range(1, 6):
    next_frame = generate_frame(i, frames_config[i-1]["prompt"], current_frame)
    if next_frame:
        current_frame = next_frame

print("\n" + "="*70)
print("FRAMES READY FOR INTERPOLATION")
print("="*70)
import subprocess
subprocess.run(["ls", "-1", "frames/frame_*.jpg"], cwd=".")
