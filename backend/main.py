from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "ml"))
from pinn import SolapsePINN

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

model = SolapsePINN()
weights_path = os.path.join(os.path.dirname(__file__), "weights", "solapse_v1.pth")

if os.path.exists(weights_path):
    model.load_state_dict(torch.load(weights_path))
    model.eval()
    print("PINN Brain Active.")

@app.post("/predict")
async def predict(data: dict):
    # CRITICAL: Normalize inputs to [0, 1] range to match training
    # Alt: 200 to 800 -> 0 to 1
    h = (data['altitude'] - 200) / 600
    # Flux: 70 to 300 -> 0 to 1
    f = (data['f107'] - 70) / 230
    # Kp: 0 to 9 -> 0 to 1
    k = data['kp'] / 9.0
    
    # Clamp values to prevent out-of-bounds errors
    h = max(0, min(1, h))
    f = max(0, min(1, f))
    k = max(0, min(1, k))

    input_t = torch.tensor([[h, f, k]], dtype=torch.float32)
    
    with torch.no_grad():
        density = model(input_t).item()
        
    return {"density": density}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)