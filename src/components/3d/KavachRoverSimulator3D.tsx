import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Camera, Radio, Cpu, Compass, ShieldAlert, Wifi, Eye, Activity, RotateCcw, ZoomIn, Box } from 'lucide-react';

interface ComponentInfo {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  specs: string[];
  icon: any;
  position: [number, number, number];
}

const COMPONENTS: ComponentInfo[] = [
  {
    id: 'lidar',
    name: 'LiDAR / Ultrasonic Sensor',
    subtitle: 'Obstacle Detection & Mapping',
    description: 'High-frequency rotating LiDAR unit scanning 360 degrees in real-time to generate precise 3D point clouds of hazardous mine shafts and tunnels.',
    specs: ['Range: 40 meters', 'Scan Rate: 15Hz', 'Accuracy: ±2cm'],
    icon: Compass,
    position: [0, 2.7, 0]
  },
  {
    id: 'camera',
    name: 'Dual Thermal & RGB Cameras',
    subtitle: 'Human Detection & Visual Navigation',
    description: 'Equipped with a radiometric thermal camera for detecting human heat signatures through dense smoke/dust and an ultra-low-light RGB navigation camera.',
    specs: ['Thermal Resolution: 640x512', 'RGB: 4K HDR', 'FOV: 120°'],
    icon: Camera,
    position: [0, 2.1, 0.9]
  },
  {
    id: 'antenna',
    name: 'LoRaWAN Antenna',
    subtitle: 'Long Range Mesh Communication',
    description: 'Ruggedized omnidirectional antenna providing robust long-range connectivity through kilometers of solid rock and subterranean barriers.',
    specs: ['Frequency: 868/915 MHz', 'Range: Up to 5km underground', 'Mesh Capable: Yes'],
    icon: Wifi,
    position: [0.6, 2.4, -0.3]
  },
  {
    id: 'sensors',
    name: 'Multi-Gas Sensors',
    subtitle: 'CH4, CO, Toxic Gas Detection',
    description: 'Electrochemical and NDIR sensor array continuously sampling ambient air quality for explosive methane pockets, carbon monoxide leaks, and oxygen depletion.',
    specs: ['Gases: CH4, CO, O2, H2S', 'Response Time: <5s', 'Auto-Calibration: Active'],
    icon: ShieldAlert,
    position: [-0.6, 1.4, 0.2]
  },
  {
    id: 'tracks',
    name: 'All-Terrain Rubber Tracks',
    subtitle: 'Rugged & Stable Mobility',
    description: 'High-torque tracked treads engineered with reinforced rubber and independent bogie suspension to effortlessly conquer rubble, steep inclines, and deep mud.',
    specs: ['Max Slope: 45°', 'Speed: 2.5 m/s', 'Ground Clearance: 80mm'],
    icon: Activity,
    position: [0.9, 0.5, 0]
  },
  {
    id: 'edgeai',
    name: 'ESP32 + Raspberry Pi Edge AI',
    subtitle: 'Onboard Neural Processing',
    description: 'Dual-tier edge computing architecture running quantized neural networks for real-time anomaly detection and autonomous hazard avoidance without cloud latency.',
    specs: ['Processor: Quad-Core ARM Cortex', 'AI Accelerator: NPU 2.5 TOPS', 'Power: 12V LiFePO4'],
    icon: Cpu,
    position: [-0.5, 1.3, -0.4]
  }
];

export default function KavachRoverSimulator3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo>(COMPONENTS[0]);
  const [activeView, setActiveView] = useState<'overview' | 'top' | 'side' | 'front'>('overview');
  const [isRotatingTrack, setIsRotatingTrack] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const lidarMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.025);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 4, 6);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controlsRef.current = controls;

    // Studio Lighting setup matching reference image
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.4);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xfff5e6, 4.0);
    mainKeyLight.position.set(6, 12, 8);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 2048;
    mainKeyLight.shadow.mapSize.height = 2048;
    mainKeyLight.shadow.bias = -0.0001;
    scene.add(mainKeyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00e5ff, 3.0);
    cyanRimLight.position.set(-8, 6, -6);
    scene.add(cyanRimLight);

    const floorGlow = new THREE.PointLight(0x00a8ff, 3, 12);
    floorGlow.position.set(0, 0.4, 0);
    scene.add(floorGlow);

    // Futuristic Workshop Conveyor / Testing Platform
    const tableGeo = new THREE.BoxGeometry(10, 0.4, 8);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f17,
      metalness: 0.9,
      roughness: 0.2,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // Glowing Grid
    const gridHelper = new THREE.GridHelper(12, 24, 0x00e5ff, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // BUILD ULTRA-HD NEW KAVACH ROVER MODEL (Matching Reference Photo)
    const roverGroup = new THREE.Group();
    scene.add(roverGroup);

    // Materials
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x8b93a5, metalness: 0.92, roughness: 0.22 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x212631, metalness: 0.88, roughness: 0.3 });
    const blackRubberMat = new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.2, roughness: 0.8 });
    const pcbGreenMat = new THREE.MeshStandardMaterial({ color: 0x0f5132, metalness: 0.6, roughness: 0.3 });
    const cyanLedMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0 });
    const lensGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, metalness: 0.2, roughness: 0.1, transmission: 0.85, thickness: 1.0 });

    // 1. Modular Chassis & Armored Wedge Front
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.85, 3.0);
    const chassis = new THREE.Mesh(chassisGeo, steelMat);
    chassis.position.y = 0.85;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    roverGroup.add(chassis);

    // Front Armored Wedge
    const wedgeGeo = new THREE.BoxGeometry(2.12, 0.6, 0.6);
    const wedge = new THREE.Mesh(wedgeGeo, darkSteelMat);
    wedge.position.set(0, 0.8, 1.35);
    wedge.castShadow = true;
    roverGroup.add(wedge);

    // Front Headlights
    const hlGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    hlGeo.rotateX(Math.PI / 2);
    const hlLeft = new THREE.Mesh(hlGeo, cyanLedMat);
    hlLeft.position.set(0.75, 0.85, 1.66);
    roverGroup.add(hlLeft);

    const hlRight = new THREE.Mesh(hlGeo, cyanLedMat);
    hlRight.position.set(-0.75, 0.85, 1.66);
    roverGroup.add(hlRight);

    // Side PCB Boards (Edge AI / ESP32)
    const pcbGeo = new THREE.BoxGeometry(0.08, 0.4, 0.8);
    const pcbLeft = new THREE.Mesh(pcbGeo, pcbGreenMat);
    pcbLeft.position.set(1.08, 1.0, 0.2);
    roverGroup.add(pcbLeft);

    const pcbRight = new THREE.Mesh(pcbGeo, pcbGreenMat);
    pcbRight.position.set(-1.08, 1.0, 0.2);
    roverGroup.add(pcbRight);

    // 2. All-Terrain Rubber Tracks (Left & Right)
    const createTracks = (xPos: number) => {
      const trackGroup = new THREE.Group();
      trackGroup.position.set(xPos, 0.55, 0);

      const trackBodyGeo = new THREE.BoxGeometry(0.55, 0.65, 3.2);
      const trackBody = new THREE.Mesh(trackBodyGeo, blackRubberMat);
      trackBody.castShadow = true;
      trackGroup.add(trackBody);

      // Bogie wheels
      for (let z = -1.1; z <= 1.1; z += 1.1) {
        const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.6, 24);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, steelMat);
        wheel.position.set(0, 0, z);
        wheel.castShadow = true;
        trackGroup.add(wheel);
      }

      roverGroup.add(trackGroup);
    };
    createTracks(1.35);
    createTracks(-1.35);

    // 3. Sensor Mast & Dual Thermal/RGB Camera Pod
    const mastGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.7, 16);
    const mast = new THREE.Mesh(mastGeo, darkSteelMat);
    mast.position.set(0, 1.6, 0.4);
    mast.castShadow = true;
    roverGroup.add(mast);

    const podGeo = new THREE.BoxGeometry(1.3, 0.48, 0.65);
    const cameraPod = new THREE.Mesh(podGeo, darkSteelMat);
    cameraPod.position.set(0, 2.05, 0.65);
    cameraPod.castShadow = true;
    roverGroup.add(cameraPod);

    // Lenses on Pod
    const lensGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 24);
    lensGeo.rotateX(Math.PI / 2);
    
    const thermalLens = new THREE.Mesh(lensGeo, lensGlassMat);
    thermalLens.position.set(0.35, 2.05, 0.99);
    roverGroup.add(thermalLens);

    const rgbLens = new THREE.Mesh(lensGeo, lensGlassMat);
    rgbLens.position.set(-0.35, 2.05, 0.99);
    roverGroup.add(rgbLens);

    // 4. LiDAR / Ultrasonic Sensor on Top
    const lidarBaseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.18, 32);
    const lidarBase = new THREE.Mesh(lidarBaseGeo, steelMat);
    lidarBase.position.set(0, 2.25, 0);
    roverGroup.add(lidarBase);

    const lidarCylGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.4, 32);
    const lidarCyl = new THREE.Mesh(lidarCylGeo, new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.2 }));
    lidarCyl.position.set(0, 2.54, 0);
    roverGroup.add(lidarCyl);
    lidarMeshRef.current = lidarCyl;

    // 5. LoRaWAN Antenna
    const antGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.7, 16);
    const antenna = new THREE.Mesh(antGeo, blackRubberMat);
    antenna.position.set(0.65, 2.2, -0.7);
    antenna.castShadow = true;
    roverGroup.add(antenna);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotatingTrack && lidarMeshRef.current) {
        lidarMeshRef.current.rotation.y += 0.04;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const snapCamera = (view: 'overview' | 'top' | 'side' | 'front') => {
    setActiveView(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const targetPos = new THREE.Vector3(0, 1.5, 0);
    controls.target.copy(targetPos);

    switch (view) {
      case 'top':
        camera.position.set(0, 9, 0.01);
        break;
      case 'side':
        camera.position.set(8, 2, 0);
        break;
      case 'front':
        camera.position.set(0, 2, 7);
        break;
      case 'overview':
      default:
        camera.position.set(5, 4, 6);
        break;
    }
    controls.update();
  };

  return (
    <div className="relative w-full py-24 bg-[#030712] overflow-hidden text-slate-100" id="kavach-simulator">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-widest shadow-xl">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>New Kavach Autonomous Rescue Rover 3D Model</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            KAVACH Interactive 3D Simulator
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Inspect the newly updated ultra-HD Kavach rescue rover on the futuristic workshop conveyor table. Click any component below to explore its specifications.
          </p>
        </div>

        {/* 3D Canvas & UI Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* 3D Canvas Viewport (8 cols) */}
          <div className="lg:col-span-8 relative h-[550px] sm:h-[620px] rounded-3xl bg-slate-950/80 border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* On-Screen Camera Snap Controls */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 backdrop-blur-md shadow-xl">
              <button
                onClick={() => snapCamera('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'overview' ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => snapCamera('top')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'top' ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Top View</span>
              </button>
              <button
                onClick={() => snapCamera('side')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'side' ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Side View</span>
              </button>
              <button
                onClick={() => snapCamera('front')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'front' ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Front View</span>
              </button>
            </div>

            {/* Status overlay */}
            <div className="absolute bottom-4 left-4 z-20 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-cyan-400 backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>NEW KAVACH MODEL · 360° INSPECTION</span>
            </div>
          </div>

          {/* Component Inspection Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black shadow-lg">
                  <selectedComponent.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedComponent.name}</h3>
                  <p className="text-xs font-mono text-cyan-400">{selectedComponent.subtitle}</p>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                {selectedComponent.description}
              </p>

              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Specifications</span>
                <div className="grid grid-cols-1 gap-2">
                  {selectedComponent.specs.map((spec, idx) => (
                    <div key={idx} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center justify-between">
                      <span>{spec.split(':')[0]}</span>
                      <span className="font-bold text-white">{spec.split(':')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Component selector buttons */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Select Component Hotspot</span>
                <div className="grid grid-cols-2 gap-2">
                  {COMPONENTS.map((comp) => {
                    const IconComp = comp.icon;
                    const isSelected = selectedComponent.id === comp.id;
                    return (
                      <button
                        key={comp.id}
                        onClick={() => setSelectedComponent(comp)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-medium truncate">{comp.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
