import * as THREE from 'three';

const OFFICIAL_ICONS = {
  'management-groups': 'management-groups.svg',
  'azure-policy': 'azure-policy.svg',
  'azure-rbac': 'entra-id.svg',
  'github': 'github-invertocat.svg',
  'azure-devops': 'azure-devops.svg'
};

const DRAWERS = {
  hierarchy(ctx) {
    ctx.beginPath();
    ctx.arc(64, 28, 10, 0, Math.PI * 2);
    ctx.moveTo(34, 96); ctx.arc(34, 96, 10, 0, Math.PI * 2);
    ctx.moveTo(94, 96); ctx.arc(94, 96, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 38); ctx.lineTo(64, 60);
    ctx.moveTo(64, 60); ctx.lineTo(34, 86);
    ctx.moveTo(64, 60); ctx.lineTo(94, 86);
    ctx.stroke();
  },
  shield(ctx) {
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.lineTo(96, 34);
    ctx.lineTo(96, 66);
    ctx.bezierCurveTo(96, 92, 80, 104, 64, 112);
    ctx.bezierCurveTo(48, 104, 32, 92, 32, 66);
    ctx.lineTo(32, 34);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48, 64); ctx.lineTo(60, 76); ctx.lineTo(82, 50);
    ctx.stroke();
  },
  key(ctx) {
    ctx.beginPath();
    ctx.arc(44, 48, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, 62); ctx.lineTo(102, 104);
    ctx.moveTo(88, 90); ctx.lineTo(88, 104);
    ctx.moveTo(76, 90); ctx.lineTo(76, 98);
    ctx.stroke();
  },
  hub(ctx) {
    ctx.beginPath();
    ctx.arc(64, 64, 14, 0, Math.PI * 2);
    ctx.stroke();
    const spokes = [[64, 20], [104, 44], [104, 84], [64, 108], [24, 84], [24, 44]];
    spokes.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      const dx = x - 64, dy = y - 64, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      ctx.moveTo(64 + ux * 14, 64 + uy * 14);
      ctx.lineTo(x - ux * 8, y - uy * 8);
      ctx.stroke();
    });
  },
  monitor(ctx) {
    ctx.strokeRect(28, 32, 72, 50);
    ctx.beginPath();
    ctx.moveTo(64, 82); ctx.lineTo(64, 96);
    ctx.moveTo(44, 104); ctx.lineTo(84, 104);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(38, 66); ctx.lineTo(52, 48); ctx.lineTo(62, 60); ctx.lineTo(90, 40);
    ctx.stroke();
  },
  id(ctx) {
    ctx.strokeRect(24, 36, 80, 56);
    ctx.beginPath();
    ctx.arc(48, 60, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(34, 82); ctx.bezierCurveTo(34, 70, 62, 70, 62, 82);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(76, 52); ctx.lineTo(96, 52);
    ctx.moveTo(76, 64); ctx.lineTo(96, 64);
    ctx.moveTo(76, 76); ctx.lineTo(88, 76);
    ctx.stroke();
  },
  vending(ctx) {
    ctx.strokeRect(30, 26, 68, 76);
    ctx.beginPath();
    ctx.moveTo(30, 48); ctx.lineTo(98, 48);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(44, 62); ctx.lineTo(56, 62);
    ctx.moveTo(44, 76); ctx.lineTo(70, 76);
    ctx.moveTo(44, 90); ctx.lineTo(62, 90);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(78, 68); ctx.lineTo(90, 80); ctx.lineTo(78, 92);
    ctx.stroke();
  },
  network(ctx) {
    const nodes = [[64, 24], [24, 60], [104, 60], [40, 104], [88, 104]];
    ctx.beginPath();
    ctx.moveTo(64, 24); ctx.lineTo(24, 60);
    ctx.moveTo(64, 24); ctx.lineTo(104, 60);
    ctx.moveTo(24, 60); ctx.lineTo(40, 104);
    ctx.moveTo(104, 60); ctx.lineTo(88, 104);
    ctx.moveTo(24, 60); ctx.lineTo(104, 60);
    ctx.stroke();
    nodes.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
};

export function buildCircuitTexture(hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  const red = (hexColor >> 16) & 0xff;
  const green = (hexColor >> 8) & 0xff;
  const blue = hexColor & 0xff;
  const traceColor = `rgba(${Math.min(255, red + 80)}, ${Math.min(255, green + 80)}, ${Math.min(255, blue + 55)}, 0.16)`;
  const padColor = `rgba(${Math.min(255, red + 95)}, ${Math.min(255, green + 95)}, ${Math.min(255, blue + 65)}, 0.22)`;
  const paths = [
    [[0, 52], [58, 52], [58, 84], [134, 84]],
    [[0, 162], [35, 162], [35, 132], [104, 132]],
    [[0, 352], [72, 352], [72, 316], [164, 316]],
    [[700, 60], [642, 60], [642, 92], [566, 92]],
    [[700, 174], [664, 174], [664, 142], [596, 142]],
    [[700, 346], [626, 346], [626, 310], [536, 310]],
    [[128, 0], [128, 34], [172, 34], [172, 76]],
    [[348, 0], [348, 28], [316, 28], [316, 64]],
    [[570, 0], [570, 42], [532, 42], [532, 78]],
    [[112, 420], [112, 386], [154, 386], [154, 346]],
    [[354, 420], [354, 388], [326, 388], [326, 350]],
    [[586, 420], [586, 382], [548, 382], [548, 344]],
  ];

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = traceColor;
  paths.forEach(points => {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();
  });

  paths.forEach(points => {
    const [x, y] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = padColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#18212d';
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildTileTexture(component, hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const color = `#${hexColor.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = '#18212d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#edf2f7';
  ctx.font = '600 48px "Segoe UI", sans-serif';
  const lines = [];
  if (component.id === 'azure-policy') {
    lines.push('Azure', 'Policy');
  } else {
    const words = component.name.split(' ');
    let line = '';
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > canvas.width - 36 && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
  }
  const iconSize = 160;
  const iconLeft = (canvas.width - iconSize) / 2;
  const textLineHeight = 56;
  const contentGap = 20;
  const contentHeight = iconSize + contentGap + lines.length * textLineHeight;
  const iconTop = (canvas.height - contentHeight) / 2;
  ctx.save();
  ctx.translate(canvas.width / 2, iconTop + iconSize / 2);
  ctx.scale(iconSize / 128, iconSize / 128);
  ctx.translate(-64, -64);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  (DRAWERS[component.icon] || DRAWERS.hub)(ctx);
  ctx.restore();
  const firstLineY = iconTop + iconSize + contentGap + textLineHeight / 2;
  lines.forEach((text, index) => ctx.fillText(text, canvas.width / 2, firstLineY + index * textLineHeight));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const officialIcon = OFFICIAL_ICONS[component.id];
  if (officialIcon) {
    const image = new Image();
    image.onload = () => {
      const scale = iconSize / Math.max(image.naturalWidth, image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.fillStyle = '#18212d';
      ctx.fillRect(iconLeft, iconTop, iconSize, iconSize);
      ctx.drawImage(image, iconLeft + (iconSize - width) / 2, iconTop + (iconSize - height) / 2, width, height);
      texture.needsUpdate = true;
    };
    image.src = new URL(`./assets/${officialIcon}`, import.meta.url).href;
  }
  return texture;
}

export function buildLayerTexture(layer, number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 36px "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${String(number).padStart(2, '0')}  |  ${layer.name.toUpperCase()}`, 24, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildIconTexture(iconKey, hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const colorStr = `#${hexColor.toString(16).padStart(6, '0')}`;

  // soft glow disc backdrop
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, `${colorStr}55`);
  gradient.addColorStop(1, `${colorStr}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  // solid ring
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const draw = DRAWERS[iconKey] || DRAWERS.hub;
  draw(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Crate-lid label used on top of the stack when layers are collapsed into a single box.
export function buildLabelTexture(title, subtitle) {
  const width = 1024, height = 614; // matches the ~7 x 4.2 slab aspect ratio
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const border = 3;
  ctx.strokeStyle = '#ff4fc8';
  ctx.lineWidth = border;
  ctx.strokeRect(border / 2, border / 2, width - border, height - border);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 88px Inter, -apple-system, sans-serif';
  ctx.fillText(title, width / 2, height / 2 - 22);

  ctx.fillStyle = '#ff4fc8';
  ctx.font = '600 34px Inter, -apple-system, sans-serif';
  ctx.font = '600 34px Inter, -apple-system, sans-serif';
  ctx.fillText(subtitle.toUpperCase(), width / 2, height / 2 + 56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Small dash texture used to animate "data flow" along connection tubes.
export function buildFlowTexture(hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  const colorStr = `#${hexColor.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 64, 8);
  ctx.fillStyle = colorStr;
  for (let x = 0; x < 64; x += 16) {
    ctx.fillRect(x, 0, 8, 8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
