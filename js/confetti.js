/**
 * Confetti - Lightweight celebration effect
 * Subtle ~15 particle burst for trade logging
 */

import { state } from './state.js';

class Confetti {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.colors = [
      '#22c55e', // success green
      '#3b82f6', // primary blue
      '#f59e0b', // warning amber
      '#ec4899', // pink
      '#8b5cf6'  // purple
    ];
  }

  init() {
    this.canvas = document.getElementById('confettiCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    // Listen for confetti trigger
    state.on('triggerConfetti', () => this.burst());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(particleCount = 15) {
    if (!this.canvas || !this.ctx) return;

    // Check if reduced motion is preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Create particles from center-top area
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 3;

    for (let i = 0; i < particleCount; i++) {
      this.particles.push(this.createParticle(centerX, centerY));
    }

    // Start animation if not already running
    if (!this.animationId) {
      this.animate();
    }
  }

  createParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 3 + Math.random() * 4;
    const size = 6 + Math.random() * 4;

    return {
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 2, // Slight upward bias
      size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      gravity: 0.1,
      friction: 0.99,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    };
  }

  animate() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.015;

      // Draw
      if (p.opacity > 0) {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }

        this.ctx.restore();
      } else {
        // Remove faded particle
        this.particles.splice(i, 1);
      }
    }

    // Continue animation if particles remain
    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
    }
  }
}

export const confetti = new Confetti();
export { Confetti };
