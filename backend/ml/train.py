import torch
import torch.nn as nn
import torch.optim as optim
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pinn import SolapsePINN

def compute_scale_height(h, f107):
    """ Empirical approximation of atmospheric scale height (km) """
    T = 600 + 3.0 * (f107 - 70) 
    m = torch.clamp(28.96 - 0.01 * h, min=16.0) 
    g = 9.81 * (6371 / (6371 + h))**2
    H = (8.314 * T) / (m * g)
    return H

def train():
    model = SolapsePINN()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    print("Initializing PINN Training: Physics-Informed Hydrostatic Equilibrium...")
    for epoch in range(5001):
        h_norm = torch.rand(2000, 1, requires_grad=True) 
        f107_norm = torch.rand(2000, 1)
        kp_norm = torch.rand(2000, 1)

        h_km = h_norm * 19800 + 200
        f107 = f107_norm * 230 + 70
        
        inputs = torch.cat([h_norm, f107_norm, kp_norm], dim=1)
        log_rho_pred = model(inputs)
        
        # 1. DATA LOSS (Boundary Condition Anchor at 200km)
        base_mask = (h_norm < 0.05).float()
        empirical_log_rho = -28.9 - (h_km - 200) / compute_scale_height(h_km, f107) + (kp_norm * 0.5)
        data_loss = nn.MSELoss()(log_rho_pred * base_mask, empirical_log_rho * base_mask)

        # 2. PHYSICS LOSS (Hydrostatic PDE: d(ln_rho)/dh + 1/H = 0)
        d_log_rho_dh_norm = torch.autograd.grad(
            log_rho_pred, h_norm, 
            grad_outputs=torch.ones_like(log_rho_pred), 
            create_graph=True
        )[0]
        d_log_rho_dh = d_log_rho_dh_norm / 19800.0
        
        H = compute_scale_height(h_km, f107)
        physics_residual = d_log_rho_dh + (1.0 / H)
        
        physics_mask = (h_km < 2500).float()
        physics_loss = torch.mean((physics_residual * physics_mask)**2)

        total_loss = data_loss + 1500.0 * physics_loss

        optimizer.zero_grad()
        total_loss.backward()
        optimizer.step()
        
        if epoch % 1000 == 0:
            print(f"Epoch {epoch} | Total Loss: {total_loss.item():.6f}")

    save_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "solapse_v1.pth")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    torch.save(model.state_dict(), save_path)
    print("PINN Brain Synchronized.")

if __name__ == "__main__":
    train()