import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface GameState {
  mood: number;
  timeLeft: number;
  heroX: number;
  drinkCooldown: number;
  gameStatus: 'attract' | 'playing' | 'victory' | 'defeat';
  attractTimer: number;
  coffeeCups: CoffeeCup[];
  score: number;
}

interface CoffeeCup {
  id: number;
  x: number;
  y: number;
  speed: number;
  collected: boolean;
}

const GAME_CONFIG = {
  CANVAS_WIDTH: 1080,
  CANVAS_HEIGHT: 1920,
  HERO_SPEED: 8,
  HERO_SIZE: 60,
  CUP_SIZE: 40,
  CUP_SPAWN_RATE: 0.8, // seconds between cups
  CUP_SPEED: 300, // pixels per second
  SPOUT_X: 270,
  SPOUT_TOLERANCE: 80,
  DRINK_COOLDOWN: 0.5,
  MOOD_INCREASE: 10,
  GAME_DURATION: 60,
  ATTRACT_TIMEOUT: 5,
  RESULT_DISPLAY: 3
};

const COLORS = {
  COFFEE_DARK: '#50311E',
  COFFEE_MID: '#7A5234', 
  COFFEE_LIGHT: '#CDA27F',
  TEAL: '#00A7A5',
  CREAM: '#F5E6D3',
  SKY: '#87CEEB',
  STREET: '#696969',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GOLD: '#FFD700',
  SHADOW: 'rgba(0, 0, 0, 0.3)'
};

const CoffeeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const cupSpawnTimerRef = useRef<number>(0);
  const cupIdCounterRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    mood: 0,
    timeLeft: GAME_CONFIG.GAME_DURATION,
    heroX: GAME_CONFIG.CANVAS_WIDTH / 2,
    drinkCooldown: 0,
    gameStatus: 'attract',
    attractTimer: 0,
    coffeeCups: [],
    score: 0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [heroStartX, setHeroStartX] = useState(0);

  // Load background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      backgroundImageRef.current = img;
    };
    img.src = '/lovable-uploads/651e5604-70a3-494d-9990-6a4c17414faa.png';
  }, []);

  // Draw functions
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Draw the uploaded background image if loaded
    if (backgroundImageRef.current) {
      ctx.save();
      // Scale and position the background to fit the canvas
      const aspectRatio = backgroundImageRef.current.width / backgroundImageRef.current.height;
      const canvasAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT;
      
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      if (aspectRatio > canvasAspectRatio) {
        // Image is wider than canvas ratio
        drawHeight = GAME_CONFIG.CANVAS_HEIGHT;
        drawWidth = drawHeight * aspectRatio;
        offsetX = (GAME_CONFIG.CANVAS_WIDTH - drawWidth) / 2;
      } else {
        // Image is taller than canvas ratio
        drawWidth = GAME_CONFIG.CANVAS_WIDTH;
        drawHeight = drawWidth / aspectRatio;
        offsetY = (GAME_CONFIG.CANVAS_HEIGHT - drawHeight) / 2;
      }
      
      ctx.drawImage(backgroundImageRef.current, offsetX, offsetY, drawWidth, drawHeight);
      
      // Add a slight overlay to make game elements more visible
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      ctx.restore();
    } else {
      // Fallback background with Egyptian street theme
      drawPixelArtBackground(ctx);
    }
  };

  const drawPixelArtBackground = (ctx: CanvasRenderingContext2D) => {
    // Sky with gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 600);
    skyGradient.addColorStop(0, COLORS.SKY);
    skyGradient.addColorStop(1, COLORS.CREAM);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, 600);

    // Street cobblestones pattern
    ctx.fillStyle = COLORS.STREET;
    ctx.fillRect(0, 600, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT - 600);
    
    // Add cobblestone texture
    for (let y = 600; y < GAME_CONFIG.CANVAS_HEIGHT; y += 40) {
      for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 40) {
        ctx.strokeStyle = COLORS.COFFEE_DARK;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 40, 40);
      }
    }

    // Traditional Egyptian shop fronts
    drawShopFronts(ctx);
    drawStreetDetails(ctx);
  };

  const drawShopFronts = (ctx: CanvasRenderingContext2D) => {
    // Main coffee shop structure
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(50, 200, 400, 350);
    
    // Shop roof with traditional pattern
    ctx.fillStyle = COLORS.COFFEE_MID;
    ctx.fillRect(30, 180, 440, 30);
    
    // Decorative arch
    ctx.beginPath();
    ctx.arc(250, 300, 50, 0, Math.PI);
    ctx.fillStyle = COLORS.TEAL;
    ctx.fill();
    
    // Arabic shop sign with decorative border
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(80, 220, 340, 80);
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 220, 340, 80);
    
    // Arabic text
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('قهوة أوكا', 250, 255);
    ctx.font = '20px Arial';
    ctx.fillText('OKKAA COFFEE', 250, 280);

    // Shop windows with traditional mashrabiya pattern
    drawMashrabiya(ctx, 100, 320, 80, 60);
    drawMashrabiya(ctx, 320, 320, 80, 60);
  };

  const drawMashrabiya = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = COLORS.COFFEE_MID;
    ctx.fillRect(x, y, w, h);
    
    // Geometric pattern
    ctx.strokeStyle = COLORS.CREAM;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const cx = x + (i + 0.5) * (w / 4);
        const cy = y + (j + 0.5) * (h / 3);
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const drawStreetDetails = (ctx: CanvasRenderingContext2D) => {
    // Traditional tuk-tuk with detailed pixel art
    drawTukTuk(ctx, 600, 480);
    
    // Cairo skyline silhouettes with minarets
    drawSkyline(ctx);
    
    // Street lamp
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(900, 400, 20, 200);
    ctx.beginPath();
    ctx.arc(910, 400, 25, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.GOLD;
    ctx.fill();
  };

  const drawTukTuk = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Main body
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(x, y, 120, 80);
    
    // Canopy
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(x + 10, y - 20, 100, 20);
    
    // Decorative stripes
    ctx.fillStyle = COLORS.GOLD;
    ctx.fillRect(x + 10, y + 20, 100, 4);
    ctx.fillRect(x + 10, y + 40, 100, 4);
    
    // Wheels with spokes
    drawWheel(ctx, x + 30, y + 80, 20);
    drawWheel(ctx, x + 90, y + 80, 20);
  };

  const drawWheel = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fill();
    
    // Spokes
    ctx.strokeStyle = COLORS.CREAM;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      ctx.stroke();
    }
  };

  const drawSkyline = (ctx: CanvasRenderingContext2D) => {
    // Mosque with minaret
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(800, 250, 80, 150);
    
    // Minaret
    ctx.fillRect(820, 150, 20, 100);
    
    // Dome
    ctx.beginPath();
    ctx.arc(840, 250, 40, 0, Math.PI);
    ctx.fill();
    
    // Crescent
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(840, 230, 8, 0, Math.PI);
    ctx.stroke();
  };

  const drawOkkaMachine = (ctx: CanvasRenderingContext2D) => {
    const machineX = 200;
    const machineY = 100;
    
    // Machine body with detailed pixel art
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(machineX, machineY, 140, 200);
    
    // Machine border
    ctx.strokeStyle = COLORS.COFFEE_DARK;
    ctx.lineWidth = 4;
    ctx.strokeRect(machineX, machineY, 140, 200);
    
    // Control panel
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(machineX + 10, machineY + 20, 120, 60);
    
    // Okkaa logo with background
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(machineX + 20, machineY + 30, 100, 40);
    ctx.fillStyle = COLORS.TEAL;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('OKKAA', machineX + 70, machineY + 55);
    
    // Buttons and indicators
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 1 ? COLORS.GOLD : COLORS.COFFEE_MID;
      ctx.beginPath();
      ctx.arc(machineX + 30 + i * 30, machineY + 100, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Coffee spout with detailed design
    ctx.fillStyle = COLORS.COFFEE_MID;
    ctx.fillRect(machineX + 60, machineY + 180, 20, 40);
    ctx.fillRect(machineX + 55, machineY + 220, 30, 10);
    
    // Steam animation
    drawSteam(ctx, machineX + 70, machineY + 160);
    
    // Coffee drip animation
    if (gameState.gameStatus === 'playing') {
      drawCoffeeDrip(ctx, machineX + 70, machineY + 230);
    }
  };

  const drawSteam = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const time = Date.now() * 0.005;
    
    for (let i = 0; i < 5; i++) {
      const offset = Math.sin(time + i) * 10;
      const alpha = 0.8 - (i * 0.15);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x + offset, y - i * 8, 3 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawCoffeeDrip = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const dripY = y + (Date.now() % 1000) / 10;
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.beginPath();
    ctx.arc(x, dripY, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawHero = (ctx: CanvasRenderingContext2D, x: number, isUnderSpout: boolean, isDrinking: boolean) => {
    const heroY = 1400;
    
    // Shadow
    ctx.fillStyle = COLORS.SHADOW;
    ctx.fillRect(x - 30, heroY + 15, 60, 10);
    
    // Hero body with detailed pixel art
    ctx.fillStyle = COLORS.COFFEE_MID; // Camel-brown galabiya
    ctx.fillRect(x - 25, heroY - 80, 50, 80);
    
    // Traditional pattern on galabiya
    ctx.fillStyle = COLORS.TEAL;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x - 20 + i * 15, heroY - 60, 10, 4);
    }
    
    // Hero head
    ctx.fillStyle = COLORS.COFFEE_LIGHT;
    ctx.fillRect(x - 20, heroY - 120, 40, 40);
    
    // Traditional taqiyah (cap)
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(x - 18, heroY - 125, 36, 15);
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(x - 15, heroY - 120, 30, 8);
    
    // Beard
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(x - 12, heroY - 90, 24, 8);
    
    // Traditional sandals
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(x - 28, heroY, 22, 12);
    ctx.fillRect(x + 6, heroY, 22, 12);
    
    // Animation states
    if (isDrinking) {
      // Drinking animation with sparkles
      ctx.save();
      ctx.translate(0, -5);
      drawSparkles(ctx, x, heroY - 100);
      ctx.restore();
    } else if (gameState.mood >= 80) {
      // Happy animation
      const bounce = Math.sin(Date.now() * 0.01) * 3;
      ctx.save();
      ctx.translate(0, bounce);
    } else if (gameState.mood < 30) {
      // Tired/slouched animation
      ctx.save();
      ctx.translate(0, 5);
    }
    
    if (gameState.mood >= 80 || isDrinking) {
      ctx.restore();
    }
  };

  const drawSparkles = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = COLORS.GOLD;
    const time = Date.now() * 0.01;
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 + time;
      const sparkleX = x + Math.cos(angle) * 25;
      const sparkleY = y + Math.sin(angle) * 15;
      const size = 2 + Math.sin(time + i) * 1;
      
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawCoffeeCups = (ctx: CanvasRenderingContext2D) => {
    gameState.coffeeCups.forEach(cup => {
      if (!cup.collected) {
        drawCoffeeCup(ctx, cup.x, cup.y);
      }
    });
  };

  const drawCoffeeCup = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Cup shadow
    ctx.fillStyle = COLORS.SHADOW;
    ctx.fillRect(x - GAME_CONFIG.CUP_SIZE/2 + 2, y + GAME_CONFIG.CUP_SIZE/2 + 2, GAME_CONFIG.CUP_SIZE, 8);
    
    // Cup body
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(x - GAME_CONFIG.CUP_SIZE/2, y - GAME_CONFIG.CUP_SIZE/2, GAME_CONFIG.CUP_SIZE, GAME_CONFIG.CUP_SIZE);
    
    // Cup border
    ctx.strokeStyle = COLORS.COFFEE_DARK;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - GAME_CONFIG.CUP_SIZE/2, y - GAME_CONFIG.CUP_SIZE/2, GAME_CONFIG.CUP_SIZE, GAME_CONFIG.CUP_SIZE);
    
    // Coffee inside
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(x - GAME_CONFIG.CUP_SIZE/2 + 4, y - GAME_CONFIG.CUP_SIZE/2 + 4, GAME_CONFIG.CUP_SIZE - 8, GAME_CONFIG.CUP_SIZE/2);
    
    // Steam
    drawSteam(ctx, x, y - GAME_CONFIG.CUP_SIZE/2);
    
    // Handle
    ctx.strokeStyle = COLORS.COFFEE_DARK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + GAME_CONFIG.CUP_SIZE/2 + 8, y, 10, -Math.PI/2, Math.PI/2);
    ctx.stroke();
  };

  const drawHUD = (ctx: CanvasRenderingContext2D) => {
    // Mood bar with decorative frame
    const barX = 600, barY = 100, barW = 400, barH = 40;
    
    // Decorative frame
    ctx.fillStyle = COLORS.GOLD;
    ctx.fillRect(barX - 5, barY - 5, barW + 10, barH + 10);
    
    // Mood bar background
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(barX, barY, barW, barH);
    
    // Mood bar fill with gradient
    const fillWidth = (gameState.mood / 100) * (barW - 10);
    const moodGradient = ctx.createLinearGradient(barX + 5, 0, barX + barW - 5, 0);
    moodGradient.addColorStop(0, COLORS.COFFEE_MID);
    moodGradient.addColorStop(0.5, COLORS.TEAL);
    moodGradient.addColorStop(1, COLORS.GOLD);
    ctx.fillStyle = moodGradient;
    ctx.fillRect(barX + 5, barY + 5, fillWidth, barH - 10);
    
    // Mood bar label with Arabic
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('مزاج - MOOD', barX, barY - 15);
    
    // Mood percentage
    ctx.textAlign = 'right';
    ctx.fillText(`${gameState.mood}%`, barX + barW, barY + 30);
    
    // Timer with decorative background
    ctx.fillStyle = COLORS.GOLD;
    ctx.fillRect(920, 160, 160, 60);
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(925, 165, 150, 50);
    
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(gameState.timeLeft)}s`, 1000, 200);
    
    // Score
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameState.score}`, 50, 50);
  };

  const drawDrinkButton = (ctx: CanvasRenderingContext2D) => {
    const buttonY = 1600;
    const buttonSize = 150;
    const buttonX = GAME_CONFIG.CANVAS_WIDTH / 2 - buttonSize / 2;
    
    // Button shadow
    ctx.fillStyle = COLORS.SHADOW;
    ctx.fillRect(buttonX + 5, buttonY + 5, buttonSize, buttonSize);
    
    // Button body with decorative border
    ctx.fillStyle = gameState.drinkCooldown > 0 ? COLORS.COFFEE_MID : COLORS.TEAL;
    ctx.fillRect(buttonX, buttonY, buttonSize, buttonSize);
    
    // Decorative gold border
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 6;
    ctx.strokeRect(buttonX, buttonY, buttonSize, buttonSize);
    
    // Coffee cup icon with steam
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(buttonX + 50, buttonY + 40, 50, 60);
    ctx.fillRect(buttonX + 45, buttonY + 100, 60, 10);
    
    // Coffee inside cup
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(buttonX + 55, buttonY + 50, 40, 30);
    
    // Steam on button
    drawSteam(ctx, buttonX + 75, buttonY + 35);
    
    // Handle
    ctx.strokeStyle = COLORS.WHITE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(buttonX + 110, buttonY + 60, 15, 0, Math.PI);
    ctx.stroke();
    
    // "DRINK" text in Arabic and English
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('اشرب', buttonX + buttonSize / 2, buttonY + 125);
    ctx.fillText('DRINK', buttonX + buttonSize / 2, buttonY + 145);
  };

  const drawScreen = (ctx: CanvasRenderingContext2D, type: string) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    // Decorative frame
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 8;
    ctx.strokeRect(100, 600, GAME_CONFIG.CANVAS_WIDTH - 200, 600);
    
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    
    switch (type) {
      case 'attract':
        ctx.fillStyle = COLORS.TEAL;
        ctx.fillText('محفز المزاج', GAME_CONFIG.CANVAS_WIDTH / 2, 800);
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('MOOD BOOSTER', GAME_CONFIG.CANVAS_WIDTH / 2, 870);
        ctx.fillText('OKKAA COFFEE', GAME_CONFIG.CANVAS_WIDTH / 2, 940);
        ctx.font = '32px Arial';
        ctx.fillText('اضغط للبدء - Tap to Start!', GAME_CONFIG.CANVAS_WIDTH / 2, 1050);
        break;
      case 'victory':
        ctx.fillStyle = COLORS.GOLD;
        ctx.fillText('انتصار!', GAME_CONFIG.CANVAS_WIDTH / 2, 800);
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('VICTORY!', GAME_CONFIG.CANVAS_WIDTH / 2, 870);
        ctx.font = '32px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, GAME_CONFIG.CANVAS_WIDTH / 2, 950);
        ctx.fillText('مزاج ممتاز! - Mood Charged!', GAME_CONFIG.CANVAS_WIDTH / 2, 1000);
        break;
      case 'defeat':
        ctx.fillStyle = COLORS.COFFEE_DARK;
        ctx.fillText('حاول مرة أخرى', GAME_CONFIG.CANVAS_WIDTH / 2, 800);
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('TRY AGAIN', GAME_CONFIG.CANVAS_WIDTH / 2, 870);
        ctx.font = '32px Arial';
        ctx.fillText(`Score: ${gameState.score}`, GAME_CONFIG.CANVAS_WIDTH / 2, 950);
        ctx.fillText('تحتاج مزيد من القهوة!', GAME_CONFIG.CANVAS_WIDTH / 2, 1000);
        break;
    }
    
    // Copyright
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('© Okkaa 2025', GAME_CONFIG.CANVAS_WIDTH - 20, GAME_CONFIG.CANVAS_HEIGHT - 20);
  };

  // Collision detection
  const checkCupCollision = (heroX: number, heroY: number, cup: CoffeeCup) => {
    const heroHalfSize = GAME_CONFIG.HERO_SIZE / 2;
    const cupHalfSize = GAME_CONFIG.CUP_SIZE / 2;
    
    return Math.abs(heroX - cup.x) < (heroHalfSize + cupHalfSize) &&
           Math.abs(heroY - cup.y) < (heroHalfSize + cupHalfSize);
  };

  const isHeroUnderSpout = () => {
    return Math.abs(gameState.heroX - GAME_CONFIG.SPOUT_X) < GAME_CONFIG.SPOUT_TOLERANCE;
  };

  const handleDrink = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return;
    if (gameState.drinkCooldown > 0) return;
    if (!isHeroUnderSpout()) {
      toast("انتقل تحت صنبور القهوة! - Move under the coffee spout!");
      return;
    }

    setGameState(prev => ({
      ...prev,
      mood: Math.min(prev.mood + GAME_CONFIG.MOOD_INCREASE, 100),
      drinkCooldown: GAME_CONFIG.DRINK_COOLDOWN,
      score: prev.score + 50
    }));

    toast("☕ يا سلام! Coffee power +10!");
  }, [gameState.gameStatus, gameState.drinkCooldown]);

  const startGame = () => {
    setGameState({
      mood: 0,
      timeLeft: GAME_CONFIG.GAME_DURATION,
      heroX: GAME_CONFIG.CANVAS_WIDTH / 2,
      drinkCooldown: 0,
      gameStatus: 'playing',
      attractTimer: 0,
      coffeeCups: [],
      score: 0
    });
    cupSpawnTimerRef.current = 0;
    cupIdCounterRef.current = 0;
  };

  const resetToAttract = () => {
    setGameState(prev => ({
      ...prev,
      gameStatus: 'attract',
      attractTimer: 0,
      coffeeCups: []
    }));
  };

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    ctx.save();

    // Update game state
    setGameState(prev => {
      const newState = { ...prev };

      if (newState.gameStatus === 'attract') {
        newState.attractTimer += deltaTime;
      } else if (newState.gameStatus === 'playing') {
        newState.timeLeft = Math.max(0, newState.timeLeft - deltaTime);
        newState.drinkCooldown = Math.max(0, newState.drinkCooldown - deltaTime);

        // Spawn coffee cups
        cupSpawnTimerRef.current += deltaTime;
        if (cupSpawnTimerRef.current >= GAME_CONFIG.CUP_SPAWN_RATE) {
          newState.coffeeCups.push({
            id: cupIdCounterRef.current++,
            x: Math.random() * (GAME_CONFIG.CANVAS_WIDTH - 100) + 50,
            y: -GAME_CONFIG.CUP_SIZE,
            speed: GAME_CONFIG.CUP_SPEED + Math.random() * 100,
            collected: false
          });
          cupSpawnTimerRef.current = 0;
        }

        // Update coffee cups
        newState.coffeeCups = newState.coffeeCups.filter(cup => {
          if (!cup.collected) {
            cup.y += cup.speed * deltaTime;
            
            // Check collision with hero
            if (checkCupCollision(newState.heroX, 1400, cup)) {
              cup.collected = true;
              newState.mood = Math.min(newState.mood + GAME_CONFIG.MOOD_INCREASE, 100);
              newState.score += 100;
              toast("☕ قهوة لذيذة! +10 مزاج");
            }
          }
          
          // Remove cups that are off screen
          return cup.y < GAME_CONFIG.CANVAS_HEIGHT + GAME_CONFIG.CUP_SIZE;
        });

        // Check win/lose conditions
        if (newState.mood >= 100) {
          newState.gameStatus = 'victory';
          setTimeout(resetToAttract, GAME_CONFIG.RESULT_DISPLAY * 1000);
        } else if (newState.timeLeft <= 0) {
          newState.gameStatus = 'defeat';
          setTimeout(resetToAttract, GAME_CONFIG.RESULT_DISPLAY * 1000);
        }
      }

      return newState;
    });

    // Draw game
    drawBackground(ctx);
    drawOkkaMachine(ctx);
    
    if (gameState.gameStatus === 'playing') {
      drawCoffeeCups(ctx);
      drawHero(ctx, gameState.heroX, isHeroUnderSpout(), gameState.drinkCooldown > 0.5);
      drawHUD(ctx);
      drawDrinkButton(ctx);
    } else {
      drawHero(ctx, gameState.heroX, false, false);
      drawScreen(ctx, gameState.gameStatus);
    }

    ctx.restore();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, isHeroUnderSpout, resetToAttract, handleDrink]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) * (GAME_CONFIG.CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (GAME_CONFIG.CANVAS_HEIGHT / rect.height);

    if (gameState.gameStatus === 'attract') {
      startGame();
      return;
    }

    // Check drink button
    const buttonX = GAME_CONFIG.CANVAS_WIDTH / 2 - 75;
    const buttonY = 1600;
    if (x >= buttonX && x <= buttonX + 150 && y >= buttonY && y <= buttonY + 150) {
      handleDrink();
      return;
    }

    // Start dragging for hero movement
    setIsDragging(true);
    setDragStartX(x);
    setHeroStartX(gameState.heroX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || gameState.gameStatus !== 'playing') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) * (GAME_CONFIG.CANVAS_WIDTH / rect.width);
    const deltaX = x - dragStartX;
    const newX = Math.max(50, Math.min(GAME_CONFIG.CANVAS_WIDTH - 50, heroStartX + deltaX));
    
    setGameState(prev => ({ ...prev, heroX: newX }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState.gameStatus !== 'playing') return;

    switch (e.code) {
      case 'ArrowLeft':
        setGameState(prev => ({
          ...prev,
          heroX: Math.max(50, prev.heroX - GAME_CONFIG.HERO_SPEED)
        }));
        break;
      case 'ArrowRight':
        setGameState(prev => ({
          ...prev,
          heroX: Math.min(GAME_CONFIG.CANVAS_WIDTH - 50, prev.heroX + GAME_CONFIG.HERO_SPEED)
        }));
        break;
      case 'Space':
        e.preventDefault();
        handleDrink();
        break;
    }
  }, [gameState.gameStatus, handleDrink]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameLoop, handleKeyDown]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-screen object-contain cursor-pointer"
          style={{ aspectRatio: '1080/1920' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
};

export default CoffeeGame;
