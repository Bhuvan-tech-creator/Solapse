import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import CentralBody from './CentralBody';
import Satellite from './Satellite';

const HUD_STYLE = { 
  position: 'absolute', top: 20, left: 20, zIndex: 10, 
  padding: '20px', background: 'rgba(0, 5, 15, 0.95)', 
  color: '#00f2ff', border: '1px solid #00f2ff', 
  fontFamily: "'Courier New', monospace", width: '320px', fontSize: '0.8rem' 
};

const PANEL_STYLE = { 
  position: 'absolute', top: 20, right: 20, zIndex: 10, 
  padding: '20px', background: 'rgba(0, 5, 15, 0.95)', 
  color: '#00f2ff', border: '1px solid #00f2ff', 
  fontFamily: "'Courier New', monospace", width: '360px', 
  maxHeight: '85vh', overflowY: 'auto' 
};

const SPEED_STYLE = { 
  position: 'absolute', bottom: 20, left: 20, zIndex: 10, 
  display: 'flex', gap: '8px' 
};

const PLANETS = {
  Earth: { name: 'Earth', radius: 6371, mu: 398600.44, j2: 0.00108263, color: '#00f2ff' },
  Moon: { name: 'Moon', radius: 1737.4, mu: 4902.8, j2: 0.0002027, color: '#ffffff' },
  Mars: { name: 'Mars', radius: 3389.5, mu: 42828.3, j2: 0.001960, color: '#ff4400' },
  Venus: { name: 'Venus', radius: 6051.8, mu: 324859, j2: 0.0000044, color: '#ffcc00' }
};

const FollowCamera = ({ targetRef }) => {
  useFrame((state) => {
    if (!targetRef.current) return;
    const lookTarget = new THREE.Vector3();
    targetRef.current.getWorldPosition(lookTarget);
    state.camera.lookAt(lookTarget);
    const offset = new THREE.Vector3(2, 2, 2);
    state.camera.position.lerp(lookTarget.clone().add(offset), 0.05);
  });
  return null;
};

function App() {
  const [planet, setPlanet] = useState(PLANETS.Earth);
  const [env] = useState({ f107: 150, kp: 2 });
  const [config, setConfig] = useState({ alt: 500, ecc: 0.0, mass: 500, area: 2.0 });
  const [satellites, setSatellites] = useState([]);
  const [trackedId, setTrackedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [displaySpeed, setDisplaySpeed] = useState(1);
  
  const timeScaleRef = useRef(1);
  const trackedRef = useRef(null);

  const addSatellite = () => {
    const newSat = {
      id: "SAT-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6).getStyle(),
      perigee: config.alt,
      ecc: config.ecc,
      mass: config.mass,
      area: config.area,
      status: 'IN_ORBIT',
      deployedAt: new Date().toLocaleTimeString()
    };
    setSatellites(prev => [...prev, newSat]);
  };

  const handleDeorbit = (id) => {
    setSatellites(prev => prev.map(s => s.id === id ? {...s, status: 'DEORBITED'} : s));
    if (trackedId === id) setTrackedId(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <div style={HUD_STYLE}>
        <h2 style={{margin: '0 0 15px 0', borderBottom: '2px solid #00f2ff'}}>SOLAPSE ENGINE</h2>
        
        <label>TARGET BODY</label>
        <select 
            onChange={(e) => {setPlanet(PLANETS[e.target.value]); setTrackedId(null);}} 
            style={{width: '100%', background: '#000', color: '#00f2ff', marginBottom: '15px', padding: '8px', border: '1px solid #00f2ff'}}
        >
            {Object.keys(PLANETS).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <label>ALTITUDE: {config.alt} km</label>
        <input type="range" min="150" max="15000" step="50" style={{width: '100%'}} value={config.alt} onChange={e => setConfig({...config, alt: +e.target.value})} />
        
        <label>ECCENTRICITY: {config.ecc}</label>
        <input type="range" min="0" max="0.9" step="0.01" style={{width: '100%'}} value={config.ecc} onChange={e => setConfig({...config, ecc: +e.target.value})} />

        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
            <div style={{flex:1}}>
                <label>MASS (kg)</label>
                <input type="number" style={{width: '100%', background: '#000', color: '#00f2ff', border: '1px solid #333'}} value={config.mass} onChange={e => setConfig({...config, mass: +e.target.value})} />
            </div>
            <div style={{flex:1}}>
                <label>AREA ($m^2$)</label>
                <input type="number" style={{width: '100%', background: '#000', color: '#00f2ff', border: '1px solid #333'}} value={config.area} onChange={e => setConfig({...config, area: +e.target.value})} />
            </div>
        </div>

        <button onClick={addSatellite} style={{marginTop: '20px', width: '100%', padding: '12px', background: '#00f2ff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>INJECT ASSET</button>
      </div>

      <div style={SPEED_STYLE}>
        {[1, 5, 10, 20, 100].map(s => (
          <button key={s} onClick={() => {timeScaleRef.current = s; setDisplaySpeed(s);}} style={{ background: displaySpeed === s ? '#00f2ff' : '#111', color: displaySpeed === s ? '#000' : '#00f2ff', border: '1px solid #00f2ff', padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold' }}>{s}X</button>
        ))}
      </div>

      <div style={PANEL_STYLE}>
        <h3 style={{borderBottom: '1px solid #333', paddingBottom: '10px'}}>FLEET LOG</h3>
        {satellites.map(sat => (
          <div key={sat.id} style={{marginBottom: '5px', background: 'rgba(255,255,255,0.02)', border: '1px solid #222'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', cursor: 'pointer'}} onClick={() => setExpandedId(expandedId === sat.id ? null : sat.id)}>
                <span style={{color: sat.color, fontWeight: 'bold'}}>{sat.id}</span>
                <span style={{color: sat.status === 'DEORBITED' ? '#ff0000' : '#00ff00'}}>{sat.status}</span>
            </div>
            {expandedId === sat.id && (
                <div style={{padding: '0 10px 10px 10px', fontSize: '0.7rem', color: '#aaa', borderTop: '1px solid #222'}}>
                    <p>ECCENTRICITY: {sat.ecc}</p>
                    <p>MASS: {sat.mass} kg | AREA: {sat.area} $m^2$</p>
                    {sat.status !== 'DEORBITED' && (
                        <button onClick={(e) => { e.stopPropagation(); setTrackedId(trackedId === sat.id ? null : sat.id); }} style={{width: '100%', marginTop: '10px', padding: '5px', background: trackedId === sat.id ? '#00f2ff' : 'transparent', color: trackedId === sat.id ? '#000' : '#00f2ff', border: '1px solid #00f2ff', cursor: 'pointer'}}>
                            {trackedId === sat.id ? 'UNTRACK' : 'TRACK ASSET'}
                        </button>
                    )}
                </div>
            )}
          </div>
        ))}
      </div>

      <Canvas camera={{ position: [0, 10, 25], far: 1000000 }}>
        <Stars radius={1000} depth={50} count={20000} factor={4} />
        <ambientLight intensity={0.5} />
        <pointLight position={[100, 100, 100]} intensity={2} />
        
        <CentralBody planet={planet} />
        
        {satellites.map(sat => sat.status !== 'DEORBITED' && (
          <Satellite 
            key={sat.id} 
            satData={sat} 
            planet={planet} 
            env={env} 
            timeScaleRef={timeScaleRef} 
            onDeorbit={() => handleDeorbit(sat.id)}
            setTrackedRef={trackedId === sat.id ? (ref) => {trackedRef.current = ref} : null} 
          />
        ))}
        {trackedId ? <FollowCamera targetRef={trackedRef} /> : <OrbitControls />}
      </Canvas>
    </div>
  );
}

export default App;