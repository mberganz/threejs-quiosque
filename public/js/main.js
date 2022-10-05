import "../css/style.css";
import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let container, stats;
let camera, scene, renderer, geometry, material;
let controls, water, sun, barco, areia, container3D;
let r, x, y, z;
let axis, speed;

init();
animate();

function init() {
  container = document.getElementById("container");

  //

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  //

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.set(-750, 200, 500);

  //

  sun = new THREE.Vector3();

  // Water

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "../textures/waternormals.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffe87c,
    waterColor: 0x001e0f,
    distortionScale: 8,
    fog: scene.fog !== undefined,
  });

  water.rotation.x = -Math.PI / 2;

  scene.add(water);

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 130,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms["sunPosition"].value.copy(sun);
    water.material.uniforms["sunDirection"].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    renderTarget = pmremGenerator.fromScene(sky);

    scene.environment = renderTarget.texture;
  }

  updateSun();

  // Boat by DJMaesen (https://sketchfab.com/bumstrum)

  function createBoat() {
    const loader = new GLTFLoader();

    barco = loader.load(
      "../textures/boat/scene.gltf",
      function barco(gltf) {
        gltf.scene.position.set( 0, 0, 2000 );
        const model = gltf.scene;
        scene.add(gltf.scene);
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );
  }
  createBoat();

  // Beach
  function createBeach() {
    const sandTexture = new THREE.TextureLoader().load(
      "../textures/sand/sandtexture3.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        texture.repeat.set(250, 250);
      }
    );
    const sandNormal = new THREE.TextureLoader().load(
      "../textures/sand/sandnormals2.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        texture.repeat.set(250, 250);
      }
    );

    areia = new THREE.Mesh(
      new THREE.BoxGeometry(10000, 1, 3000),
      new THREE.MeshPhysicalMaterial({
        map: sandTexture,
        normalMap: sandNormal,
        // color: 0xc2b280,
        wireframe: false,
      })
    );
    scene.add(areia);
    areia.position.set(0, 0, 3500);
  }
  createBeach();

  // Container
  function createContainer() {
    const loader = new GLTFLoader();

    container3D = loader.load(
      "../textures/container/scene.gltf",
      function barco(gltf) {
        gltf.scene.scale.set( 400, 200, 200 );
        gltf.scene.position.set( 0, 230, 3500 );
        const model = gltf.scene;
        scene.add(gltf.scene);
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );
  }
  createContainer();

  // Orbit controls

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 4.0;
  controls.maxDistance = 5000.0;
  controls.update();

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI

  const gui = new GUI();

  const folderSky = gui.addFolder("Sky");
  folderSky.add(parameters, "elevation", 0, 90, 0.1).onChange(updateSun);
  folderSky.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSun);
  folderSky.open();

  const waterUniforms = water.material.uniforms;

  const folderWater = gui.addFolder("Water");
  folderWater
    .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
  folderWater.open();

  //
  axis = new THREE.Vector3(0, 1, 0).normalize();
  speed = 0.012;

  window.addEventListener("resize", onWindowResize);
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
}

function render() {
  const time = performance.now() * 0.001;

  // camera.position.x += Math.sin(1);
  // camera.rotation.y += Math.sin(0.001);
  // camera.position.z += Math.sin(1);
  // if (camera) {
  //   camera.rotateOnAxis(axis, speed);
  // }

  water.material.uniforms["time"].value += 1.0 / 60.0;

  renderer.render(scene, camera);
}
