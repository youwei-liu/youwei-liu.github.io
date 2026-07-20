(() => {
  const canUseCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canUseCursor) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);

  let pointerX = -100;
  let pointerY = -100;
  let ringX = -100;
  let ringY = -100;
  let lastRippleX = -100;
  let lastRippleY = -100;
  let lastRippleAt = 0;

  const place = (element, x, y) => {
    element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };

  const animate = () => {
    ringX += (pointerX - ringX) * 0.16;
    ringY += (pointerY - ringY) * 0.16;
    place(ring, ringX, ringY);
    requestAnimationFrame(animate);
  };

  const makeRipple = (x, y) => {
    const ripple = document.createElement('span');
    ripple.className = 'cursor-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });

    const ripples = document.querySelectorAll('.cursor-ripple');
    if (ripples.length > 12) ripples[0].remove();
  };

  document.addEventListener('pointermove', event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    place(dot, pointerX, pointerY);
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');

    const now = performance.now();
    const distance = Math.hypot(pointerX - lastRippleX, pointerY - lastRippleY);
    if (distance > 52 && now - lastRippleAt > 70) {
      makeRipple(pointerX, pointerY);
      lastRippleX = pointerX;
      lastRippleY = pointerY;
      lastRippleAt = now;
    }
  }, { passive: true });

  document.addEventListener('pointerover', event => {
    if (event.target.closest('a, button, input, textarea, select, [role=\"button\"]')) {
      ring.classList.add('is-hovering');
    }
  });

  document.addEventListener('pointerout', event => {
    if (event.target.closest('a, button, input, textarea, select, [role=\"button\"]')) {
      ring.classList.remove('is-hovering');
    }
  });

  document.documentElement.addEventListener('mouseleave', () => {
    dot.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  });

  document.documentElement.addEventListener('mouseenter', () => {
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');
  });

  requestAnimationFrame(animate);
})();
