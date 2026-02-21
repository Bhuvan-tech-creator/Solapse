from pydantic import BaseModel

class SpaceWeatherInput(BaseModel):
    altitude: float
    f107: float
    kp: float

class DensityOutput(BaseModel):
    density: float