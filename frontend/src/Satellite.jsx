import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import axios from 'axios';
import * as THREE from 'three';

const Satellite = ({ satData, planet, env, timeScaleRef, onDeorbit, setTrackedRef }) => {
  const satRef = useRef();
  const [currentPerigee, setCurrentPerigee] = useState(satData.perigee);
  const [alive, setAlive] = useState(true);
  const accTime = useRef(0);
  const initialArgPer = useMemo(() => Math.random() * Math.PI * 2, []);
  const BC = satData.mass / (2.2 * satData.area);
  const UNIT_SCALE = 5.0 / 6371;

  useEffect(() => {
    if (setTrackedRef && alive) setTrackedRef(satRef.current);
  }, [setTrackedRef, alive, planet]);

  useFrame(async (state) => {
    if (!alive || state.clock.getElapsedTime() % 2 > 0.1) return;
    if (planet.name === 'Earth' && currentPerigee < 1500) {
        try {
            const res = await axios.post('http://localhost:8000/predict', { 
                altitude: currentPerigee, f107: env.f107, kp: env.kp 
            });
            const decay = (res.data.density / BC) * 30000 * timeScaleRef.current;
            setCurrentPerigee(p => p - decay);
        } catch (e) {}
    }
    if (currentPerigee <= 0) {
        setAlive(false);
        onDeorbit();
    }
  });

  useFrame((state, delta) => {
    if (!alive || !satRef.current) return;
    const ts = timeScaleRef.current;
    const a_km = planet.radius + currentPerigee;
    const n = Math.sqrt(planet.mu / Math.pow(a_km, 3));
    accTime.current += delta * ts * n * 50; 
    const M = accTime.current; 
    const e = satData.ecc;
    const r_inst_km = (a_km * (1 - e*e)) / (1 + e * Math.cos(M));
    if (r_inst_km <= planet.radius) {
        setAlive(false);
        onDeorbit();
        return;
    }
    const r_visual = r_inst_km * UNIT_SCALE;
    satRef.current.position.set(r_visual * Math.cos(M + initialArgPer), r_visual * Math.sin(M + initialArgPer) * 0.1, r_visual * Math.sin(M + initialArgPer)); 
    satRef.current.lookAt(0,0,0);
  });

  if (!alive) return null;

  return (
    <group ref={satRef}>
      <pointLight color={satData.color} intensity={2} distance={2} />
      <group scale={[0.08, 0.08, 0.08]}>
        <mesh>
            <boxGeometry args={[1, 1, 1.5]} />
            <meshBasicMaterial color={satData.color} />
        </mesh>
        <mesh position={[1.2, 0, 0]}>
            <boxGeometry args={[1.5, 0.6, 0.05]} />
            <meshBasicMaterial color="#55aaff" />
        </mesh>
        <mesh position={[-1.2, 0, 0]}>
            <boxGeometry args={[1.5, 0.6, 0.05]} />
            <meshBasicMaterial color="#55aaff" />
        </mesh>
      </group>
    </group>
  );
};

export default Satellite;