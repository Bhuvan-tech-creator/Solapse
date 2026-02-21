import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Earth = ({ drag }) => {
  const earthRef = useRef();
  const atmosphereRef = useRef();
  
  // Scale the visual atmosphere based on the PINN drag output
  const atmosphereScale = 1.02 + (drag * 5.0); 

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (earthRef.current) earthRef.current.rotation.y = t * 0.05;
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = -t * 0.02;
      // Smoothly transition the atmosphere size
      atmosphereRef.current.scale.lerp(new THREE.Vector3(atmosphereScale, atmosphereScale, atmosphereScale), 0.1);
    }
  });

  return (
    <group>
      {/* Main Earth Body */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshPhongMaterial 
          color="#2233ff" 
          emissive="#050515" 
          specular="#ffffff" 
          shininess={100} 
          wireframe={false} 
        />
      </mesh>

      {/* Grid Overlay for "High-Tech" look */}
      <mesh>
        <sphereGeometry args={[1.51, 32, 32]} />
        <meshBasicMaterial color="#00f2ff" wireframe transparent opacity={0.1} />
      </mesh>

      {/* Atmospheric Shell - Driven by PINN */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.55, 64, 64]} />
        <meshPhongMaterial 
          color={drag > 0.01 ? "#ff4444" : "#00f2ff"} 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export default Earth;