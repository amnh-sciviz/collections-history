'use strict';

var App = (function() {

  var camera, scene, renderer, controls, opt, $container;
  var geometry, uniforms;
  var groupSize;

  function App(config) {
    var defaults = {
      // for displaying zoomed-in group
      "spritesheet": "img/specimen_spritesheet.jpg",
      "spriteW": 8,
      "spriteH": 128,
      "tileW": 128,
      "tileH": 128,
      "groupW": 32,
      "groupH": 32,
      "groupMargin": 0,

      "containerEl": "#canvas",
      "viewAngle": 45,
      "cameraNear": 0.1,
      "cameraFar": 20000,
      "cameraPos": [0,0,1000]
    };
    opt = _.extend({}, defaults, config);
    init();
  }

  function init() {
    groupSize = opt.groupW * opt.groupH;

    loadScene();
    loadListeners();
    render();
  }

  function loadListeners(){
    $(window).on('resize', onResize);
  }

  function loadScene(){
    $container = $(opt.containerEl);
    var width = $container.width();
    var height = $container.height();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(opt.viewAngle, width/height, opt.cameraNear, opt.cameraFar);
    scene.add(camera);
    camera.position.fromArray(opt.cameraPos);
    camera.lookAt(scene.position);
    renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(width, height);
    $container.append(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    scene.add(new THREE.AxesHelper(10000));

    var vertices = [];
    var sizes = [];
    var cellW = opt.tileW + opt.groupMargin * 2;
    var cellH = opt.tileH + opt.groupMargin * 2;
    var halfGroupW = opt.groupW/2;
    var halfGroupH = opt.groupH/2;
    for (var row=0; row<opt.groupH; row++) {
      for (var col=0; col<opt.groupW; col++) {
        var x = cellW * col - halfGroupW * cellW + opt.groupMargin;
        var y = cellH * row - halfGroupH * cellH + opt.groupMargin;
        var z = 0;
        vertices.push(x, y, z);
        sizes.push(opt.tileW);

      }
    }
    var cellOffsets = [];
    for (var row=0; row<opt.spriteH; row++) {
      for (var col=0; col<opt.spriteW; col++) {
        cellOffsets.push(col, row);
      }
    }
    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3).setDynamic(true));
    geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.addAttribute('cellOffset', new THREE.Float32BufferAttribute(cellOffsets, 2));

    uniforms = {
      texture: { value: new THREE.TextureLoader().load(opt.spritesheet) },
      cameraZ: { type: 'f', value: camera.position.z },
      cellSize: { value: new THREE.Vector2(1.0/opt.spriteW, 1.0/opt.spriteH) }
    };

    uniforms.texture.value.flipY = false;

    var shaderMaterial = new THREE.ShaderMaterial( {
      uniforms: uniforms,
      vertexShader: document.getElementById('vertexshader').textContent,
      fragmentShader: document.getElementById('fragmentshader').textContent,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      transparent: true,
      vertexColors: true
    });
    var particles = new THREE.Points(geometry, shaderMaterial);
    scene.add(particles);
  }

  function onResize(){
    var w = $container.width();
    var h = $container.height();

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(){
    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(render);
  }

  return App;

})();

$(function() {
  var app = new App({});
});
