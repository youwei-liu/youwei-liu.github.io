(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const header = document.querySelector('#page-header.full_page');
  if (!header || header.querySelector('#ocean-background')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'ocean-background';
  canvas.setAttribute('aria-hidden', 'true');
  header.prepend(canvas);

  const context = canvas.getContext('2d', { alpha: true });
  const fishColors = ['#7fd8d2', '#a5e3d9', '#e3b879', '#89c9d2', '#d7e8cf'];
  const fish = [];
  const bubbles = [];
  let width = 0;
  let height = 0;
  let scale = 1;
  let pointerActive = false;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;

  const random = (min, max) => min + Math.random() * (max - min);

  const resize = () => {
    const rect = header.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);

    if (!fish.length) {
      const count = width < 700 ? 7 : 12;
      for (let index = 0; index < count; index += 1) {
        fish.push({
          x: random(0, width),
          y: random(height * .2, height * .86),
          vx: random(.55, 1.35),
          vy: random(-.25, .25),
          size: random(7, 15),
          phase: random(0, Math.PI * 2),
          color: fishColors[index % fishColors.length],
          offsetX: random(-150, 150),
          offsetY: random(-95, 95)
        });
      }

      for (let index = 0; index < 24; index += 1) {
        bubbles.push({
          x: random(0, width), y: random(0, height), radius: random(1, 3.4),
          speed: random(.15, .5), drift: random(-.2, .2), alpha: random(.12, .42)
        });
      }
    }
  };

  const drawWater = time => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(88, 190, 194, .15)');
    gradient.addColorStop(.45, 'rgba(20, 105, 116, .07)');
    gradient.addColorStop(1, 'rgba(2, 24, 35, .18)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalCompositeOperation = 'screen';
    for (let ray = 0; ray < 5; ray += 1) {
      const sway = Math.sin(time * .00025 + ray * 1.7) * 70;
      const x = width * (.08 + ray * .22) + sway;
      const rayGradient = context.createLinearGradient(x, 0, x + 150, height * .8);
      rayGradient.addColorStop(0, 'rgba(190, 245, 233, .1)');
      rayGradient.addColorStop(1, 'rgba(190, 245, 233, 0)');
      context.fillStyle = rayGradient;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 45, 0);
      context.lineTo(x + 200, height * .86);
      context.lineTo(x + 90, height * .86);
      context.closePath();
      context.fill();
    }
    context.restore();
  };

  const drawBubble = bubble => {
    bubble.y -= bubble.speed;
    bubble.x += bubble.drift;
    if (bubble.y < -8) { bubble.y = height + 8; bubble.x = random(0, width); }
    if (bubble.x < -8) bubble.x = width + 8;
    if (bubble.x > width + 8) bubble.x = -8;
    context.beginPath();
    context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    context.strokeStyle = `rgba(198, 244, 238, ${bubble.alpha})`;
    context.lineWidth = .8;
    context.stroke();
  };

  const drawFish = (item, index, time) => {
    const targetX = pointerActive ? pointerX + item.offsetX : width * .5 + Math.sin(time * .00032 + index) * width * .42;
    const targetY = pointerActive ? pointerY + item.offsetY : height * (.48 + Math.sin(time * .00045 + item.phase) * .28);
    const dx = targetX - item.x;
    const dy = targetY - item.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const acceleration = pointerActive ? .026 : .012;
    item.vx += dx / distance * acceleration;
    item.vy += dy / distance * acceleration;

    const separation = fish.reduce((force, other) => {
      if (other === item) return force;
      const fx = item.x - other.x;
      const fy = item.y - other.y;
      const gap = Math.hypot(fx, fy);
      if (gap > 0 && gap < 42) { force.x += fx / gap * .025; force.y += fy / gap * .025; }
      return force;
    }, { x: 0, y: 0 });
    item.vx += separation.x;
    item.vy += separation.y;

    const maxSpeed = pointerActive ? 3.15 : 1.75;
    const speed = Math.max(.01, Math.hypot(item.vx, item.vy));
    if (speed > maxSpeed) { item.vx = item.vx / speed * maxSpeed; item.vy = item.vy / speed * maxSpeed; }
    item.vx *= .992;
    item.vy *= .992;
    item.x += item.vx;
    item.y += item.vy;

    const angle = Math.atan2(item.vy, item.vx);
    const tailWave = Math.sin(time * .012 + item.phase) * .35;
    context.save();
    context.translate(item.x, item.y);
    context.rotate(angle);
    context.globalAlpha = .46 + index % 3 * .12;
    context.fillStyle = item.color;
    context.shadowColor = item.color;
    context.shadowBlur = 8;
    context.beginPath();
    context.ellipse(0, 0, item.size * 1.35, item.size * .54, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-item.size * 1.05, 0);
    context.lineTo(-item.size * 2, item.size * (.72 + tailWave));
    context.lineTo(-item.size * 1.8, 0);
    context.lineTo(-item.size * 2, -item.size * (.72 - tailWave));
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(5, 35, 43, .78)';
    context.beginPath();
    context.arc(item.size * .7, -item.size * .12, Math.max(1, item.size * .09), 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const animate = time => {
    context.clearRect(0, 0, width, height);
    drawWater(time);
    bubbles.forEach(drawBubble);
    fish.forEach((item, index) => drawFish(item, index, time));
    frame = requestAnimationFrame(animate);
  };

  header.addEventListener('pointermove', event => {
    const rect = header.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
    pointerActive = true;
  }, { passive: true });
  header.addEventListener('pointerleave', () => { pointerActive = false; });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else frame = requestAnimationFrame(animate);
  });

  resize();
  frame = requestAnimationFrame(animate);
})();
