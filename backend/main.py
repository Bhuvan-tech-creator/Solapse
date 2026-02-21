from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch
import os
import sys

# Add ml folder to path so we can find pinn.py
sys.path.append(os.path.join(os.path.dirname(__file__), "ml"))
from pinn import SolapsePINN

app = FastAPI()

# Hackathon-grade CORS (Allow everything)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the Brain
model = SolapsePINN()
current_dir = os.path.dirname(os.path.abspath(__file__))
weights_path = os.path.join(current_dir, "weights", "solapse_v1.pth")

if os.path.exists(weights_path):
    model.load_state_dict(torch.load(weights_path, map_location=torch.device('cpu')))
    model.eval()
    print(f"Successfully loaded PINN weights from {weights_path}")
else:
    print(f"CRITICAL ERROR: Weights not found at {weights_path}. Run train.py first!")

@app.post("/predict")
async def predict(data: dict):
    # Normalize inputs to 0-1 range to match PINN training
    h = (data['altitude'] - 200) / 600
    f = (data['f107'] - 70) / 230
    k = data['kp'] / 9.0
    
    input_tensor = torch.tensor([[h, f, k]], dtype=torch.float32)
    
    with torch.no_grad():
        prediction = model(input_tensor).item()
        
    return {"density": prediction}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)