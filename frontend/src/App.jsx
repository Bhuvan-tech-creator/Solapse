import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import axios from 'axios';
import Earth from './Earth';
import Satellite from './Satellite';

const HUD_STYLE = {
  position: 'absolute', top: 20, left: 20, zIndex: 10,
  padding: '25px', background: 'rgba(0, 5, 15, 0.9)', 
  color: '#00f2ff', border: '1px solid #00f2ff',
  fontFamily: "'Courier New', monospace", width: '350px',
  pointerEvents: 'auto'
};

function App() {
  const [params, setParams] = useState({ altitude: 500, f107: 150, kp: 2 });
  const [density, setDensity] = useState(0);
  const [satId, setSatId] = useState(0);

  const fetchPrediction = useCallback(async () => {
    try {
      const res = await axios.post('http://localhost:8000/predict', params);
      setDensity(res.data.density);
    } catch (e) { 
      console.warn("Backend Offline - Ensure main.py is running on port 8000"); 
    }
  }, [params]);

  useEffect(() => { fetchPrediction(); }, [fetchPrediction]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <div style={HUD_STYLE}>
        <h2 style={{margin: '0 0 10px 0'}}>SOLAPSE // PINN</h2>
        <p style={{fontSize: '0.7rem', marginBottom: '20px'}}>ORBITAL DECAY MONITOR</p>
        
        <label>ALTITUDE: {params.altitude} km</label>
        <input type="range" min="200" max="800" step="10" style={{width: '100%', marginBottom: '20px'}}
               value={params.altitude} onChange={e => setParams({...params, altitude: +e.target.value})} />

        <label>SOLAR FLUX: {params.f107}</label>
        <input type="range" min="70" max="300" style={{width: '100%', marginBottom: '20px'}}
               value={params.f107} onChange={e => setParams({...params, f107: +e.target.value})} />

        <label>GEOMAGNETIC (Kp): {params.kp}</label>
        <input type="range" min="0" max="9" style={{width: '100%', marginBottom: '20px'}}
               value={params.kp} onChange={e => setParams({...params, kp: +e.target.value})} />

        <div style={{borderTop: '1px solid #00f2ff', marginTop: '10px', paddingTop: '15px'}}>
          <p style={{fontSize: '0.8rem', opacity: 0.7}}>PREDICTED DRAG</p>
          <h2 style={{color: density > 0.01 ? '#ff4d4d' : '#00f2ff', margin: 0}}>
            {(density * 100).toFixed(4)}%
          </h2>
        </div>

        <button onClick={() => setSatId(s => s + 1)} 
                style={{marginTop: '20px', width: '100%', padding: '12px', background: '#00f2ff', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>
          DEPLOY NEW ASSET
        </button>
      </div>

      <Canvas shadow={true}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />
        
        {/* LIGHTING SETUP - This fixes the "Too Dark" issue */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={3} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#2233ff" />
        <spotLight position={[0, 5, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />

        <Earth drag={density} />
        <Satellite key={satId} drag={density} params={params} />
        
        <OrbitControls enablePan={false} maxDistance={15} minDistance={3} />
      </Canvas>
    </div>
  );
}

export default App;