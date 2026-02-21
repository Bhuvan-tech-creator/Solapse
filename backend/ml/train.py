import torch
import torch.nn as nn
import torch.optim as optim
import os
import sys

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pinn import SolapsePINN

def train():
    print("--- SOLAPSE PHYSICS ENGINE TRAINING ---")
    model = SolapsePINN()
    optimizer = optim.Adam(model.parameters(), lr=0.0005)
    
    for epoch in range(2001):
        # Generate Normalized Training Data [0, 1]
        alt = torch.rand(200, 1)   # Maps to 200-800km
        f107 = torch.rand(200, 1)  # Maps to 70-300 flux
        kp = torch.rand(200, 1)    # Maps to 0-9 Kp
        
        optimizer.zero_grad()
        
        # PINN Physical Target: Exponential Decay Logic
        # rho = rho0 * exp(-h/H)
        scale_height = 0.1 + (f107 * 0.2) 
        target_rho = 0.01 * torch.exp(-alt / scale_height) * (1 + 0.1 * kp)
        
        inputs = torch.cat([alt, f107, kp], dim=1)
        preds = model(inputs)
        
        # Log-space loss ensures accuracy at high altitudes (low density)
        loss = nn.MSELoss()(torch.log(preds + 1e-15), torch.log(target_rho + 1e-15))
        
        loss.backward()
        optimizer.step()
        
        if epoch % 500 == 0:
            print(f"Epoch {epoch} | Log-Loss: {loss.item():.6f}")

    # Robust Save Logic
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    weights_dir = os.path.join(backend_dir, "weights")
    
    if not os.path.exists(weights_dir):
        os.makedirs(weights_dir)
        
    save_path = os.path.join(weights_dir, "solapse_v1.pth")
    torch.save(model.state_dict(), save_path)
    print(f"--- SUCCESS: Brain stored at {save_path} ---")

if __name__ == "__main__":
    train()