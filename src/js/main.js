import { initParticles } from './particles.js';
import { initDigitalRain } from './digitalRain.js';
import { initCube } from './cube.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Generate random session ID immediately
  const sessionId = Math.random().toString(36).substring(2, 15);
  document.getElementById('session-id').textContent = sessionId;
  
  // Start verification process immediately
  startVerification();
  
  // Initialize visual effects in parallel
  Promise.all([
    initParticles(),
    Promise.resolve(initDigitalRain()),
    Promise.resolve(initCube(document.getElementById('3d-cube')))
  ]).catch(console.error);
});

function startVerification() {
  const steps = [
    { title: 'Initializing Protocol', message: 'Establishing secure connection', duration: 1000 },
    { title: 'Verifying Identity', message: 'Analyzing digital fingerprint', duration: 1500 },
    { title: 'Securing Channel', message: 'Encrypting data pathway', duration: 1000 },
    { title: 'Granting Access', message: 'Forwarding to destination', duration: 500 }
  ];

  let currentStep = 0;
  let progress = 0;
  
  const statusText = document.querySelector('.status-text');
  const progressFill = document.querySelector('.progress-fill');
  const progressPercentage = document.querySelector('.progress-percentage');
  
  function updateProgress() {
    progressFill.style.width = `${progress}%`;
    progressPercentage.textContent = `${Math.round(progress)}%`;
  }
  
  function updateStep(index) {
    document.querySelectorAll('.step').forEach((step, i) => {
      if (i < index) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else if (i === index) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
  }
  
  function simulateProgress() {
    if (currentStep >= steps.length) {
      window.location.href = 'https://zane-anime.infinityfreeapp.com';
      return;
    }
    
    const step = steps[currentStep];
    const stepProgress = 100 / steps.length;
    const startProgress = currentStep * stepProgress;
    const endProgress = startProgress + stepProgress;
    
    statusText.textContent = step.message;
    updateStep(currentStep);
    
    const interval = 25; // Update more frequently
    const updates = step.duration / interval;
    const increment = (endProgress - progress) / updates;
    
    const progressInterval = setInterval(() => {
      progress += increment;
      if (progress >= endProgress) {
        progress = endProgress;
        clearInterval(progressInterval);
        currentStep++;
        simulateProgress();
      }
      updateProgress();
    }, interval);
  }
  
  simulateProgress();
}