import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Satellite = ({ drag, params }) => {
  const satRef = useRef();
  const [orbitRadius, setOrbitRadius] = useState(3.0); 
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    // Reset position based on altitude slider
    setOrbitRadius(2.0 + (params.altitude / 300)); 
    setAlive(true);
  }, [params, drag]);

  useFrame((state, delta) => {
    if (!alive || !satRef.current) return;

    const t = state.clock.getElapsedTime();
    
    // Decay logic
    const decaySpeed = drag * 2.0; 
    const nextRadius = orbitRadius - (decaySpeed * delta);
    
    if (nextRadius < 1.52) {
      setAlive(false);
    } else {
      setOrbitRadius(nextRadius);
    }

    const speed = 0.5;
    satRef.current.position.x = Math.cos(t * speed) * orbitRadius;
    satRef.current.position.z = Math.sin(t * speed) * orbitRadius;
    satRef.current.position.y = Math.sin(t * speed * 0.5) * 0.5;
    
    // Tumble rotation
    satRef.current.rotation.x += delta * 0.5;
    satRef.current.rotation.y += delta * 0.2;
  });

  if (!alive) return null;

  return (
    <group ref={satRef}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshPhongMaterial color="white" emissive="#00f2ff" emissiveIntensity={1} />
      </mesh>
      {/* Solar Panels */}
      <mesh position={[0.15, 0, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.01]} />
        <meshPhongMaterial color="#1a237e" />
      </mesh>
      <mesh position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.01]} />
        <meshPhongMaterial color="#1a237e" />
      </mesh>
      <pointLight distance={0.5} intensity={2} color="#00f2ff" />
    </group>
  );
};

export default Satellite;