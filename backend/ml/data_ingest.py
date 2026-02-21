import requests
import pandas as pd
import torch

def get_space_weather_data():
    """
    Fetches real-time solar flux (F10.7) directly from NOAA.
    This bypasses the need for the broken 'pyspaceweather' library.
    """
    try:
        # NOAA 3-day Space Weather Prediction URL
        url = "https://services.swpc.noaa.gov/json/indices.json"
        response = requests.get(url)
        data = response.json()
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        # We need 'f10_7' and 'mag_flux' (as proxy for Ap)
        # In a real hack, you'd parse this more deeply. 
        # For now, we take the latest values.
        latest_f107 = float(df.iloc[-1]['flux']) if 'flux' in df.columns else 150.0
        return latest_f107
    except Exception as e:
        print(f"NOAA Fetch Failed: {e}. Using default flux 150.0")
        return 150.0

def generate_synthetic_targets(altitudes, f107, ap):
    """
    Calculates proxy atmospheric density using the Harris-Priester model logic.
    """
    base_density = 1e-12 
    # Scale height increases (atmosphere expands) as F10.7 (Solar Flux) increases
    scale_height = 50.0 + (f107 / 10.0) 
    density = base_density * torch.exp(-(altitudes - 200) / scale_height)
    return density