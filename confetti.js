/**
 * confetti.js
 * Module d'animation de confettis sur canvas.
 * Expose une fonction globale : launchConfetti()
 */

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = [
    '#f4a7c0', '#e07fa0', '#d9c9f5',
    '#c8ead6', '#e8c97e', '#f7e0ed'
  ];

  const PARTICLE_COUNT = 90;

  // Crée les particules
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x:      Math.random() * canvas.width,
    y:      -10,
    r:      3 + Math.random() * 5,
    dx:     (Math.random() - 0.5) * 3,
    dy:     2 + Math.random() * 4,
    color:  COLORS[Math.floor(Math.random() * COLORS.length)],
    rot:    Math.random() * Math.PI * 2,
    rspeed: (Math.random() - 0.5) * 0.2,
  }));

  let frame = 0;
  const MAX_FRAMES = 180;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();

      // Mise à jour physique
      p.x   += p.dx;
      p.y   += p.dy;
      p.rot += p.rspeed;
      p.dy  += 0.04; // gravité légère
    });

    frame++;
    if (frame < MAX_FRAMES) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw();
}
