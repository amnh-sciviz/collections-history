'use strict';

function lerp(a, b, percent) {
  return (1.0*b - a) * percent + a;
}

function loadData(url){
  var deferred = $.Deferred();
  $.getJSON(url, function(data) {
    console.log("Loaded data.");
    deferred.resolve(data);
  });
  return deferred.promise();
}

function norm(value, a, b) {
  var denom = (b - a);
  if (denom > 0 || denom < 0) {
    return (1.0 * value - a) / denom;
  } else {
    return 0;
  }
}

function radiansBetween(x1, y1, x2, y2) {
  var deltaX = x2 - x1;
  var deltaY = y2 - y1;
  return Math.atan2(deltaY, deltaX);
}

function random3dPointInSphere(radius) {
  var u = Math.random();
  var v = Math.random();
  var theta = u * 2.0 * Math.PI;
  var phi = Math.acos(2.0 * v - 1.0);
  var r = Math.cbrt(Math.random());
  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);
  var sinPhi = Math.sin(phi);
  var cosPhi = Math.cos(phi);
  var x = r * sinPhi * cosTheta;
  var y = r * sinPhi * sinTheta;
  var z = r * cosPhi;
  return [x*radius, y*radius, z*radius];
}

function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

function toRadial(x, y, cellW, cellH) {
  if (x===0 && y===0) return [0, 0];

  var col = parseInt(x / cellW);
  var row = parseInt(y / cellH);
  var ring = Math.max(Math.abs(col), Math.abs(row));

  var ringW = ring*2+1;
  var pointsInRing = ringW*2 + (ringW-2)*2;
  var radInterval = 2 * Math.PI / pointsInRing;

  var indexInRing = 0; // start at 3-o'clock
  var maxDim = (ringW-1)/2;
  if (col >= maxDim && row <= 0) indexInRing = row; // bottom right side
  else if (row >= maxDim) indexInRing = maxDim-col+maxDim; // bottom side
  else if (col <= -maxDim) indexInRing = maxDim-row+maxDim+ringW-1; // left side
  else if (row <= -maxDim) indexInRing = maxDim+col+maxDim+(ringW-1)*2; // top side
  else indexInRing = pointsInRing + row; // top right side

  // var radians = radiansBetween(0, 0, col, row);
  var radians = indexInRing * radInterval;
  var distance = ring * Math.max(cellW, cellH);

  return translatePoint(0, 0, radians, distance);
}

function translatePoint(x, y, radians, distance) {
  var x2 = x + distance * Math.cos(radians);
  var y2 = y + distance * Math.sin(radians);
  return [x2, y2];
}

var App = (function() {

  var camera, scene, renderer, controls, opt, $container;

  var collectionData, currentData, startYear, endYear, totalYears, totalDots;
  var dotPositionsFrom, dotPositionsTo;
  var dotGeometry, dotUniforms;

  var isSpriteTweening, spriteTweenDirection, spriteTweenStart;
  var spritePositionsFrom, spritePositionsTo;
  var spriteGeometry, spriteUniforms;

  var step, zoomStartZ, zoomEndZ, isZooming, zoomStart, zoomEnd;
  var isRotating, rotationStart, rotationEnd, rotatePositionStart, rotateRadiansFrom, rotateRadiansTo;

  var $debug, $cameraPos;

  function App(config) {
    var defaults = {
      "dataUrl": "data/collections.json",

      // for displaying zoomed-in group
      "spritesheet": "img/specimen_spritesheet.jpg",
      "spriteW": 8,
      "spriteH": 128,
      "spriteGroupW": 32,
      "spriteGroupH": 32,
      "spriteCellW": 1,
      "spriteCellH": 1,
      "spriteCellSize": 8.0,
      "spriteTweenDuration": 2000,
      "spriteTweenZThreshold": 54,

      // for displaying dots
      "dotTexture": "img/particle.png",
      "dotCellSize": 256,
      "dotCloudRadius": 10000,

      "containerEl": "#canvas",
      "viewAngle": 45,
      "cameraNear": 1,
      "cameraFar": 100000,
      "cameraPos": [0,0,5.6],

      "zoomDuration": 5000,
      "rotationDuration": 5000,
      "rotationDegrees": 90,

      "debug": true
    };
    opt = _.extend({}, defaults, config);
    init();
  }

  function init() {
    var dataPromise = loadData(opt.dataUrl);

    if (opt.debug) {
      loadDebug();
    }

    spriteTweenDirection = 1;
    step = 0;

    $.when(dataPromise).done(function(results){
      collectionData = results.slice(0);
      loadScene();
      loadSprites();
      loadItems();
      loadListeners();
      render();
    });

  }

  function go(direction){
    step += direction
    if (step < 1) step = 1;

    switch(step) {
      case 1:
        queueZoom(56, opt.zoomDuration);
        break;
      case 2:
        queueZoom(31258, opt.zoomDuration);
        break;
      case 3:
        queueRotation(direction, opt.rotationDuration);
        break;
      default:
        break;
    }
  }

  function loadDebug(){
    $debug = $("#debug");
    $cameraPos = $("#camera-position");
    $debug.addClass("active");
  }

  function loadItems(){
    _.each(collectionData, function(d, i){
      collectionData[i].dotCount = Math.round(d.cumulative/1000);
    });
    totalYears = collectionData.length;
    currentData = collectionData[totalYears-1];
    startYear = collectionData[0].year;
    endYear = currentData.year;
    totalDots = currentData.dotCount;

    dotPositionsFrom = [];
    dotPositionsTo = [];
    var sizes = [];

    for (var i=0; i<totalDots; i++) {
      sizes.push(opt.dotCellSize);
      if (i <= 0) dotPositionsFrom.push(-opt.spriteCellW/2, -opt.spriteCellW/2, 0);
      else {
        var xyz = random3dPointInSphere(opt.dotCloudRadius)
        dotPositionsFrom.push(xyz[0], xyz[1], xyz[2]);
      }
    }

    dotGeometry = new THREE.BufferGeometry();
    dotGeometry.addAttribute('position', new THREE.Float32BufferAttribute(dotPositionsFrom.slice(0), 3).setDynamic(true));
    dotGeometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    dotUniforms = {
      texture: { value: new THREE.TextureLoader().load(opt.dotTexture) },
      groupAlpha: { value: 0.0, type: "f" }
    };
    dotUniforms.texture.value.flipY = false;

    var shaderMaterial = new THREE.ShaderMaterial( {
      uniforms: dotUniforms,
      vertexShader: document.getElementById('vertexshader').textContent,
      fragmentShader: document.getElementById('fragmentshader').textContent,
      // blending: THREE.AdditiveBlending,
      depthTest: true,
      transparent: true,
      vertexColors: true
    });
    var dots = new THREE.Points(dotGeometry, shaderMaterial);
    scene.add(dots);
  }

  function loadListeners(){
    $(window).on('resize', onResize);

    $container.on('click', function(e){
      if (e.shiftKey) go(-1);
      else go(1);
    });
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
    // renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setPixelRatio( 2 );
    $container.append(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // scene.add(new THREE.AxesHelper(10000));
  }

  function loadSprites(){
    spritePositionsFrom = [];
    spritePositionsTo = [];
    var sizes = [];
    var cellW = opt.spriteCellW;
    var cellH = opt.spriteCellH;
    var halfGroupW = opt.spriteGroupW/2;
    var halfGroupH = opt.spriteGroupH/2;
    for (var row=0; row<opt.spriteGroupH; row++) {
      for (var col=0; col<opt.spriteGroupW; col++) {
        var x = cellW * col - halfGroupW * cellW;
        var y = cellH * row - halfGroupH * cellH;
        var z = 0;
        spritePositionsFrom.push(x, y, z);
        var txy = toRadial(x, y, cellW, cellH);
        spritePositionsTo.push(txy[0], txy[1], z);
        sizes.push(opt.spriteCellSize);
      }
    }
    var cellOffsets = [];
    for (var row=0; row<opt.spriteH; row++) {
      for (var col=0; col<opt.spriteW; col++) {
        cellOffsets.push(col, row);
      }
    }
    spriteGeometry = new THREE.BufferGeometry();
    spriteGeometry.addAttribute('position', new THREE.Float32BufferAttribute(spritePositionsFrom.slice(0), 3).setDynamic(true));
    spriteGeometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    spriteGeometry.addAttribute('cellOffset', new THREE.Float32BufferAttribute(cellOffsets, 2));

    spriteUniforms = {
      texture: { value: new THREE.TextureLoader().load(opt.spritesheet) },
      cellSize: { value: new THREE.Vector2(1.0/opt.spriteW, 1.0/opt.spriteH) },
      groupAlpha: { value: 1.0, type: "f" }
    };
    spriteUniforms.texture.value.flipY = false;

    var shaderMaterial = new THREE.ShaderMaterial( {
      uniforms: spriteUniforms,
      vertexShader: document.getElementById('vertexshader-sprite').textContent,
      fragmentShader: document.getElementById('fragmentshader-sprite').textContent,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      transparent: true,
      vertexColors: true
    });
    var sprites = new THREE.Points(spriteGeometry, shaderMaterial);
    scene.add(sprites);
  }

  function onResize(){
    var w = $container.width();
    var h = $container.height();

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function queueRotation(direction, duration){
    if (isRotating) return false;

    isRotating = true;
    rotationStart = new Date().getTime();
    rotationEnd = rotationStart + duration;
    rotatePositionStart = camera.position.clone();
    rotateRadiansFrom = 0;
    rotateRadiansTo = (-direction) * opt.rotationDegrees * (Math.PI / 180.0);
  }

  function queueTweenSprites() {
    if (!isSpriteTweening) {
      isSpriteTweening = true;
      spriteTweenStart = new Date().getTime();
    }
  }

  function queueZoom(z, duration){
    if (isZooming) return false;

    isZooming = true;
    zoomStartZ = camera.position.z;
    zoomEndZ = z;
    zoomStart = new Date().getTime();
    zoomEnd = zoomStart + duration;
  }

  function renderDebug(){
    var pos = camera.position
    $cameraPos.text(pos.x + ", " + pos.y + ", " + pos.z);
  }

  function render(){
    var now = new Date().getTime();

    if (step <= 2) {
      if (isSpriteTweening) {
        tweenSprites(spriteTweenDirection, spriteTweenStart, now);
      } else if (spriteTweenDirection > 0 && camera.position.z > opt.spriteTweenZThreshold) {
        queueTweenSprites();
      } else if (spriteTweenDirection < 0 && camera.position.z < opt.spriteTweenZThreshold) {
        queueTweenSprites();
      }
    }

    if (isZooming) {
      zoom(now);
    } else if (isRotating) {
      rotateCamera(now);
    }

    if (opt.debug) renderDebug();

    renderer.render(scene, camera);
    controls.update();
    requestAnimationFrame(render);
  }

  function rotateCamera(t){
    var nprogress = norm(t, rotationStart, rotationEnd);
    if (nprogress >= 1) {
      isRotating = false;
      nprogress = 1;
    }

    nprogress = EasingFunctions.easeInOutCubic(nprogress);
    var radians = lerp(rotateRadiansFrom, rotateRadiansTo, nprogress);

    var x = rotatePositionStart.x;
    var z = rotatePositionStart.z;

    camera.position.x = x * Math.cos(radians) + z * Math.sin(radians);
    camera.position.z = z * Math.cos(radians) - x * Math.sin(radians);
    camera.lookAt(scene.position);
  }

  function tweenSprites(direction, startTime, currentTime) {
    var nprogress = norm(currentTime, startTime, startTime+opt.spriteTweenDuration);
    if (direction < 0) nprogress = 1.0-nprogress;

    // end states
    if (nprogress >= 1 && direction > 0) {
      nprogress = 1;
      isSpriteTweening = false;
      spriteTweenDirection = -1;
    } else if (nprogress <= 0 && direction < 0) {
      nprogress = 0;
      isSpriteTweening = false;
      spriteTweenDirection = 1;
    }

    // ease between grid and radial positions
    nprogress = EasingFunctions.easeInOutCubic(nprogress);
    var vertices = spriteGeometry.attributes.position.array;
    for (var i=0; i<vertices.length; i++) {
      vertices[i] = lerp(spritePositionsFrom[i], spritePositionsTo[i], nprogress);
    }

    // adjust alpha
    spriteUniforms.groupAlpha.value = 1.0-nprogress;
    dotUniforms.groupAlpha.value = nprogress;
    spriteGeometry.attributes.position.needsUpdate = true;
  }

  function zoom(t){
    var nprogress = norm(t, zoomStart, zoomEnd);
    if (nprogress >= 1) {
      isZooming = false;
      nprogress = 1;
    }

    nprogress = EasingFunctions.easeInOutQuart(nprogress);
    var newZ = lerp(zoomStartZ, zoomEndZ, nprogress);

    camera.position.z = newZ;

  }

  return App;

})();

$(function() {
  var app = new App({});
});
