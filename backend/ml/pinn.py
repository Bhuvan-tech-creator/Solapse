import torch
import torch.nn as nn

class SolapsePINN(nn.Module):
    def __init__(self):
        super(SolapsePINN, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(3, 128),
            nn.SiLU(), 
            nn.Linear(128, 128),
            nn.SiLU(),
            nn.Linear(128, 64),
            nn.SiLU(),
            nn.Linear(64, 1) 
        )

    def forward(self, x):
        return self.net(x)