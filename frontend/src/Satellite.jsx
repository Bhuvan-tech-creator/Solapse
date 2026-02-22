import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import axios from 'axios';
import * as THREE from 'three';

const Satellite = ({ satData, planet, env, timeScaleRef, setTrackedRef, onDeorbit }) => {
  const satRef = useRef();
  const hasDied = useRef(false);
  const [currentPerigee, setCurrentPerigee] = useState(satData.perigee);
  const [alive, setAlive] = useState(true);
  const [localDrag, setLocalDrag] = useState(0);
  const accTime = useRef(0);

  useEffect(() => {
    if (setTrackedRef && alive) setTrackedRef(satRef.current);
  }, [setTrackedRef, alive]);

  // Ballistic Coefficient (m/CdA) - Higher mass means less drag effect
  const BC = useMemo(() => satData.mass / (2.2 * satData.area), [satData]);
  
  const orbitParams = useMemo(() => ({
    inc: (Math.random() - 0.5) * 1.8,
    raan: Math.random() * Math.PI * 2,
    argPer: Math.random() * Math.PI * 2,
    // n = sqrt(mu / a^3)
    nBase: Math.sqrt(planet.mu / Math.pow((planet.radius + satData.perigee), 3))
  }), [planet, satData]);

  // Update Atmospheric Density via PINN (only if below 1500km)
  useFrame(async (state) => {
    if (!alive || state.clock.getElapsedTime() % 2 > 0.1) return;
    if (currentPerigee < 1500 && planet.name === 'Earth') {
      try {
        const res = await axios.post('http://localhost:8000/predict', {
          altitude: currentPerigee, f107: env.f107, kp: env.kp
        });
        setLocalDrag(res.data.density);
      } catch (e) {}
    } else if (currentPerigee < 500) {
      // Simple atmospheric model for non-Earth bodies
      setLocalDrag(Math.exp(-currentPerigee / 80) * 0.0001);
    }
  });

  useFrame((state, delta) => {
    if (!alive || !satRef.current) return;

    const ts = timeScaleRef.current;
    accTime.current += delta * ts * orbitParams.nBase * 50; // Visual scaling factor
    const M = accTime.current; 

    // J2 Perturbation: Nodal Regression
    const a_km = planet.radius + currentPerigee;
    const j2Rate = -1.5 * orbitParams.nBase * planet.j2 * Math.pow(planet.radius / a_km, 2) * Math.cos(orbitParams.inc);
    const currentRAAN = orbitParams.raan + (j2Rate * accTime.current * 0.1);

    // Orbit Position (1 unit = 1000km)
    const r_vis = a_km / 1000;
    const r = (r_vis * (1 - satData.ecc**2)) / (1 + satData.ecc * Math.cos(M));

    // Mass-Based Drag Decay
    if (currentPerigee < 1200) {
      const decay = (localDrag / BC) * 150 * delta * ts;
      setCurrentPerigee(prev => prev - decay);
    }

    // Impact Check
    if (currentPerigee < 165 && !hasDied.current) {
      hasDied.current = true;
      const finalPos = new THREE.Vector3();
      satRef.current.getWorldPosition(finalPos);
      onDeorbit(finalPos);
      setAlive(false);
    }

    // Coordinate Transformation
    const x = r * Math.cos(M + orbitParams.argPer);
    const z = r * Math.sin(M + orbitParams.argPer);
    
    // Rotate into inclination plane and apply RAAN
    const pos = new THREE.Vector3(x, z * Math.sin(orbitParams.inc), z * Math.cos(orbitParams.inc));
    pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRAAN);
    
    satRef.current.position.copy(pos);
    satRef.current.lookAt(0, 0, 0);
  });

  if (!alive) return null;

  return (
    <group ref={satRef}>
      {/* Detailed Satellite Mesh with custom color */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.5, 0.7]} />
        <meshStandardMaterial color={satData.color} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Solar Array Left */}
      <mesh position={[0.8, 0, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.05]} />
        <meshStandardMaterial color="#002244" emissive="#001122" />
      </mesh>
      {/* Solar Array Right */}
      <mesh position={[-0.8, 0, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.05]} />
        <meshStandardMaterial color="#002244" emissive="#001122" />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.3, 16]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <pointLight distance={3} intensity={1} color={satData.color} />
    </group>
  );
};

export default Satellite;