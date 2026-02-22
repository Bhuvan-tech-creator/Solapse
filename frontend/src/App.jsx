import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import axios from 'axios';
import Earth from './Earth';
import Satellite from './Satellite';

const HUD_STYLE = { 
  position: 'absolute', top: 20, left: 20, zIndex: 10, 
  padding: '20px', background: 'rgba(0, 5, 15, 0.9)', 
  color: '#00f2ff', border: '1px solid #00f2ff', 
  fontFamily: "'Courier New', monospace", width: '300px', fontSize: '0.85rem' 
};

const PANEL_STYLE = { 
  position: 'absolute', top: 20, right: 20, zIndex: 10, 
  padding: '20px', background: 'rgba(0, 5, 15, 0.9)', 
  color: '#00f2ff', border: '1px solid #00f2ff', 
  fontFamily: "'Courier New', monospace", width: '320px', 
  maxHeight: '85vh', overflowY: 'auto' 
};

const SPEED_STYLE = { 
  position: 'absolute', bottom: 20, left: 20, zIndex: 10, 
  display: 'flex', gap: '10px' 
};

const POPUP_STYLE = {
  position: 'absolute', top: '50%', left: '50%', 
  transform: 'translate(-50%, -50%)',
  backgroundColor: 'rgba(20, 0, 0, 0.95)', color: '#ff4444', 
  padding: '40px', border: '2px solid #ff4444', 
  zIndex: 100, textAlign: 'center', fontFamily: "'Courier New', monospace",
  boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)'
};

const PLANETS = {
  Earth: { name: 'Earth', radius: 6371, mu: 398600, j2: 0.001082 },
  Mars: { name: 'Mars', radius: 3389, mu: 42828, j2: 0.001960 },
  Moon: { name: 'Moon', radius: 1737, mu: 4902, j2: 0.000202 }
};

const FollowCamera = ({ targetRef, isDeadlocked, deathCoord }) => {
  useFrame((state) => {
    const lookTarget = new THREE.Vector3();
    if (isDeadlocked) {
      lookTarget.copy(deathCoord);
    } else if (targetRef.current) {
      targetRef.current.getWorldPosition(lookTarget);
    } else {
      return;
    }
    
    state.camera.lookAt(lookTarget);
    const offset = new THREE.Vector3(15, 15, 15);
    state.camera.position.lerp(lookTarget.clone().add(offset), 0.05);
  });
  return null;
};

function App() {
  const [planet, setPlanet] = useState(PLANETS.Earth);
  const [env, setEnv] = useState({ f107: 150, kp: 2 });
  const [config, setConfig] = useState({ alt: 500, ecc: 0.0, mass: 500, area: 2.0 });
  const [satellites, setSatellites] = useState([]);
  const [trackedId, setTrackedId] = useState(null);
  const [deorbitMessage, setDeorbitMessage] = useState(null);
  const [isDeadlocked, setIsDeadlocked] = useState(false);
  
  const timeScaleRef = useRef(1);
  const [displaySpeed, setDisplaySpeed] = useState(1);
  const trackedRef = useRef(null);
  const deathCoord = useRef(new THREE.Vector3());

  const updateSatStatus = useCallback((id, status, finalPos) => {
    setSatellites(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    
    if (trackedId === id && status === 'DE-ORBITED' && finalPos) {
      deathCoord.current.copy(finalPos);
      setIsDeadlocked(true);
      setDeorbitMessage(`CRITICAL: ${id} IMPACT DETECTED ON ${planet.name.toUpperCase()}`);
    }
  }, [trackedId, planet.name]);

  const addSatellite = () => {
    const newSat = {
      id: "ASSET-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      perigee: config.alt,
      ecc: config.ecc,
      mass: config.mass,
      area: config.area,
      status: 'STABLE'
    };
    setSatellites(prev => [...prev, newSat].slice(-15));
  };

  const closePopup = () => {
    setDeorbitMessage(null);
    setIsDeadlocked(false);
    setTrackedId(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      
      {deorbitMessage && (
        <div style={POPUP_STYLE}>
          <h1 style={{margin: '0 0 20px 0'}}>TELEMETRY LOST</h1>
          <p>{deorbitMessage}</p>
          <button 
            onClick={closePopup} 
            style={{marginTop: '20px', padding: '10px 20px', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
          >
            ACKNOWLEDGE LOSS
          </button>
        </div>
      )}

      <div style={HUD_STYLE}>
        <h3 style={{margin: '0 0 10px 0'}}>ORBITAL COMMAND</h3>
        <label>TARGET BODY</label>
        <select 
          onChange={(e) => setPlanet(PLANETS[e.target.value])} 
          style={{width: '100%', background: '#000', color: '#00f2ff', marginBottom: '15px', padding: '5px'}}
        >
          {Object.keys(PLANETS).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <label>ALTITUDE (km): {config.alt}</label>
        <input type="range" min="200" max="20000" step="100" style={{width: '100%'}} value={config.alt} onChange={e => setConfig({...config, alt: +e.target.value})} />
        
        <label>ECCENTRICITY: {config.ecc}</label>
        <input type="range" min="0" max="0.9" step="0.01" style={{width: '100%'}} value={config.ecc} onChange={e => setConfig({...config, ecc: +e.target.value})} />

        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
          <div style={{flex: 1}}>
            <label>MASS (kg)</label>
            <input type="number" style={{width: '100%', background: '#000', color: '#00f2ff', border: '1px solid #333', padding: '5px'}} value={config.mass} onChange={e => setConfig({...config, mass: +e.target.value})} />
          </div>
          <div style={{flex: 1}}>
            <label>AREA (m²)</label>
            <input type="number" style={{width: '100%', background: '#000', color: '#00f2ff', border: '1px solid #333', padding: '5px'}} value={config.area} onChange={e => setConfig({...config, area: +e.target.value})} />
          </div>
        </div>

        <button 
          onClick={addSatellite} 
          style={{marginTop: '25px', width: '100%', padding: '12px', background: '#00f2ff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}
        >
          DEPLOY ASSET
        </button>
      </div>

      <div style={SPEED_STYLE}>
        {[1, 5, 10, 50, 100].map(s => (
          <button 
            key={s} 
            onClick={() => {timeScaleRef.current = s; setDisplaySpeed(s);}} 
            style={{ background: displaySpeed === s ? '#00f2ff' : '#111', color: displaySpeed === s ? '#000' : '#00f2ff', border: '1px solid #00f2ff', padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {s}X
          </button>
        ))}
      </div>

      <div style={PANEL_STYLE}>
        <h3 style={{margin: '0 0 15px 0'}}>FLEET TELEMETRY</h3>
        {satellites.map(sat => (
          <div key={sat.id} style={{marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{color: sat.status === 'DE-ORBITED' ? '#ff4444' : sat.color, fontWeight: 'bold'}}>{sat.id}</span>
              {sat.status !== 'DE-ORBITED' && (
                <button 
                  onClick={() => setTrackedId(sat.id === trackedId ? null : sat.id)} 
                  style={{background: trackedId === sat.id ? '#00f2ff' : 'transparent', color: trackedId === sat.id ? '#000' : '#00f2ff', border: '1px solid #00f2ff', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px'}}
                >
                  {trackedId === sat.id ? 'FOLLOWING' : 'TRACK'}
                </button>
              )}
            </div>
            <p style={{fontSize: '0.7rem', margin: '5px 0', color: sat.status === 'DE-ORBITED' ? '#ff4444' : '#888'}}>
              STATUS: {sat.status}
            </p>
          </div>
        ))}
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 60, 200]} far={2000000} />
        <Stars radius={1000} depth={100} count={10000} factor={6} />
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={2.5} />
        
        <Earth planet={planet} />
        
        {satellites.map(sat => (
          <Satellite 
            key={sat.id} 
            satData={sat} 
            planet={planet}
            env={env}
            timeScaleRef={timeScaleRef} 
            setTrackedRef={trackedId === sat.id ? (ref) => {trackedRef.current = ref} : null}
            onDeorbit={(pos) => updateSatStatus(sat.id, 'DE-ORBITED', pos)}
          />
        ))}

        {trackedId ? (
          <FollowCamera targetRef={trackedRef} isDeadlocked={isDeadlocked} deathCoord={deathCoord.current} />
        ) : (
          <OrbitControls />
        )}
      </Canvas>
    </div>
  );
}

export default App;