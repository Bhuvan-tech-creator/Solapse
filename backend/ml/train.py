import torch
import torch.nn as nn
import torch.optim as optim
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pinn import SolapsePINN

def train():
    model = SolapsePINN()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    for epoch in range(3001):
        alt = torch.rand(1000, 1) # 0 to 1 (200km to 20,000km)
        f107 = torch.rand(1000, 1)
        kp = torch.rand(1000, 1)
        
        # Physics: Drag is zero above 1500km. 
        # Inside atmosphere, it follows exponential decay.
        # We simulate this "Piecewise" logic for the PINN to learn.
        mask = (alt < 0.15).float() # Only the bottom 15% of our scale is "Atmosphere"
        target_rho = mask * torch.exp(-alt / (0.05 + f107 * 0.1)) * (1 + 0.1 * kp)
        
        optimizer.zero_grad()
        preds = model(torch.cat([alt, f107, kp], dim=1))
        
        # Huber Loss is better than MSE for these sharp transitions
        loss = nn.SmoothL1Loss()(preds, target_rho)
        loss.backward()
        optimizer.step()
        
        if epoch % 500 == 0:
            print(f"Epoch {epoch} | Loss: {loss.item():.8f}")

    save_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "solapse_v1.pth")
    torch.save(model.state_dict(), save_path)
    print("Backend Physics Re-Calibrated.")

if __name__ == "__main__":
    train()