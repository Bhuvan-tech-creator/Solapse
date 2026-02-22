import requests
import pandas as pd
import torch
import random

def get_space_weather_data():
    """
    Fetches real-time solar flux and simulates Flare detection.
    """
    try:
        url = "https://services.swpc.noaa.gov/json/indices.json"
        response = requests.get(url)
        data = response.json()
        df = pd.DataFrame(data)
        latest_f107 = float(df.iloc[-1]['flux']) if 'flux' in df.columns else 150.0
        
        # Real-world engineering: Flare detection logic
        is_flare = latest_f107 > 200 or random.random() > 0.98 # Simulated for testing
        return {"f107": latest_f107, "flare": is_flare}
    except Exception as e:
        return {"f107": 150.0, "flare": False}

def generate_synthetic_targets(altitudes, f107, ap):
    base_density = 1e-12 
    scale_height = 50.0 + (f107 / 10.0) 
    density = base_density * torch.exp(-(altitudes - 200) / scale_height)
    return density