from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch
import math
import numpy as np
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

BODIES = {
    "EARTH": {"r": 6371.0, "mu": 398600.44, "j2": 1.08263e-3},
    "MOON": {"r": 1737.4, "mu": 4902.8, "j2": 2.027e-4},
    "MARS": {"r": 3389.5, "mu": 42828.3, "j2": 1.960e-3},
    "VENUS": {"r": 6051.8, "mu": 324859.0, "j2": 4.406e-6}
}

@app.post("/predict")
async def predict(data: dict):
    h = data['altitude']
    if h <= 0: return {"density": 0.0}
    h_n = (h - 200) / 19800
    f_n = (data.get('f107', 150) - 70) / 230
    k_n = data.get('kp', 2) / 9.0
    input_t = torch.tensor([[h_n, f_n, k_n]], dtype=torch.float32)
    with torch.no_grad():
        density = math.exp(model(input_t).item())
    return {"density": density}

@app.post("/access")
async def check_access(data: dict):
    sat_pos = np.array(data['pos']) 
    planet_key = data.get('planet', 'EARTH').upper()
    R_p = BODIES[planet_key]['r']
    phi, lam = math.radians(45), math.radians(0)
    gs_pos = np.array([R_p * math.cos(phi), 0, R_p * math.sin(phi)])
    range_vec = sat_pos - gs_pos
    range_dist = np.linalg.norm(range_vec)
    elevation = math.asin(np.clip(np.dot(range_vec, gs_pos) / (range_dist * R_p), -1, 1))
    return {"PRIMARY": {"visible": elevation > math.radians(5), "elevation": math.degrees(elevation)}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)