import torch
import torch.nn as nn

class SolapsePINN(nn.Module):
    def __init__(self):
        super(SolapsePINN, self).__init__()
        # Input: Normalized [Altitude, Solar Flux, Kp Index]
        self.input_layer = nn.Linear(3, 128)
        
        # Hidden Layers with Tanh activation (smooth for physics)
        self.hidden1 = nn.Linear(128, 128)
        self.hidden2 = nn.Linear(128, 64)
        
        # Output: Single density value
        self.output_layer = nn.Linear(64, 1)
        
        self.activation = nn.Tanh()
        self.ensure_positive = nn.Softplus()

    def forward(self, x):
        # Layer 1
        x1 = self.activation(self.input_layer(x))
        
        # Layer 2 with a Residual/Skip Connection
        # This helps the model maintain the 'base' physics while learning nuances
        x2 = self.activation(self.hidden1(x1)) + x1 
        
        # Layer 3
        x3 = self.activation(self.hidden2(x2))
        
        # Final Output (Softplus ensures we never get negative density)
        return self.ensure_positive(self.output_layer(x3))