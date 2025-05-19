export function initDigitalRain() {
  const canvas = document.getElementById('digital-rain');
  const ctx = canvas.getContext('2d');
  
  // Set canvas to full window size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  // Call once to set initial size
  resizeCanvas();
  
  // Update canvas size when window is resized
  window.addEventListener('resize', resizeCanvas);
  
  // Characters to display
  const chars = '01010101ZFLARE10101010SECURITY01101VERIFICATION010101ACCESS01010';
  const charArray = chars.split('');
  
  // Configure columns
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  
  // Drops - one per column, with random starting position
  const drops = [];
  for (let i = 0; i < columns; i++) {
    drops[i] = Math.floor(Math.random() * -canvas.height/fontSize);
  }
  
  // Main animation function
  function draw() {
    // Add semi-transparent black rectangle to create fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set text color and font
    ctx.fillStyle = 'rgba(0, 255, 170, 0.3)';
    ctx.font = `${fontSize}px monospace`;
    
    // For each column
    for (let i = 0; i < drops.length; i++) {
      // Pick a random character
      const char = charArray[Math.floor(Math.random() * charArray.length)];
      
      // Draw the character
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillText(char, x, y);
      
      // Randomly reset the drop back to top with some randomness
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      
      // Move the drop down
      drops[i]++;
    }
  }
  
  // Run the animation
  setInterval(draw, 33); // Approx 30fps
}