import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CentralBody = ({ planet }) => {
  const groupRef = useRef();
  const gridRef = useRef();
  const visualScale = (planet.radius / 6371) * 5.0;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = t * 0.005;
    if (gridRef.current) gridRef.current.rotation.y = t * 0.002;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[visualScale, 64, 64]} />
        <meshPhongMaterial color="#010103" emissive="#000205" shininess={5} />
      </mesh>

      <mesh ref={gridRef}>
        <sphereGeometry args={[visualScale + 0.01, 48, 48]} />
        <meshBasicMaterial color={planet.color} wireframe transparent opacity={0.15} />
      </mesh>

      <mesh>
        <sphereGeometry args={[visualScale * 1.02, 64, 64]} />
        <meshPhongMaterial 
          color={planet.color} 
          transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export default CentralBody;