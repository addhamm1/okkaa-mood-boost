
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface GameState {
  mood: number;
  timeLeft: number;
  heroX: number;
  drinkCooldown: number;
  gameStatus: 'attract' | 'playing' | 'victory' | 'defeat';
  attractTimer: number;
}

const GAME_CONFIG = {
  CANVAS_WIDTH: 1080,
  CANVAS_HEIGHT: 1920,
  HERO_SPEED: 30,
  SPOUT_X: 270, // Position under coffee machine
  SPOUT_TOLERANCE: 80,
  DRINK_COOLDOWN: 0.8,
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
  STREET: '#696969'
};

const CoffeeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    mood: 0,
    timeLeft: GAME_CONFIG.GAME_DURATION,
    heroX: GAME_CONFIG.CANVAS_WIDTH / 2,
    drinkCooldown: 0,
    gameStatus: 'attract',
    attractTimer: 0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [heroStartX, setHeroStartX] = useState(0);

  // Draw functions
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 600);
    skyGradient.addColorStop(0, COLORS.SKY);
    skyGradient.addColorStop(1, COLORS.CREAM);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, 600);

    // Street
    ctx.fillStyle = COLORS.STREET;
    ctx.fillRect(0, 600, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT - 600);

    // Kiosk structure
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(50, 200, 400, 350);
    
    // Kiosk roof
    ctx.fillStyle = COLORS.COFFEE_MID;
    ctx.fillRect(30, 180, 440, 30);

    // Arabic shop sign
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(80, 220, 340, 60);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('قهوة سريعة', 250, 255);

    // Tuk-tuk silhouette
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(600, 480, 120, 80);
    ctx.fillRect(650, 460, 50, 20);
    // Tuk-tuk wheels
    ctx.beginPath();
    ctx.arc(630, 560, 20, 0, Math.PI * 2);
    ctx.arc(690, 560, 20, 0, Math.PI * 2);
    ctx.fill();

    // Nile skyline silhouettes
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(800, 300, 60, 300);
    ctx.fillRect(900, 250, 80, 350);
    ctx.fillRect(1000, 320, 50, 280);
  };

  const drawOkkaMachine = (ctx: CanvasRenderingContext2D) => {
    // Machine body
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(200, 100, 140, 200);
    
    // Machine details
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(210, 120, 120, 40);
    
    // Okkaa logo
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('OKKAA', 270, 145);
    
    // Coffee spout
    ctx.fillStyle = COLORS.COFFEE_MID;
    ctx.fillRect(260, 280, 20, 40);
    
    // Steam animation (simple)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const steamOffset = Math.sin(Date.now() * 0.01) * 5;
    ctx.fillRect(265 + steamOffset, 260, 3, 15);
    ctx.fillRect(270 + steamOffset * 0.5, 250, 2, 20);
    ctx.fillRect(275 + steamOffset * 1.2, 255, 3, 18);
  };

  const drawHero = (ctx: CanvasRenderingContext2D, x: number, isUnderSpout: boolean, isDrinking: boolean) => {
    const heroY = 1400;
    
    // Hero body
    ctx.fillStyle = COLORS.COFFEE_MID; // Camel-brown jacket
    ctx.fillRect(x - 25, heroY - 80, 50, 80);
    
    // Hero head
    ctx.fillStyle = COLORS.COFFEE_LIGHT;
    ctx.fillRect(x - 20, heroY - 120, 40, 40);
    
    // Sunglasses
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(x - 15, heroY - 110, 30, 8);
    
    // Stubble
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(x - 10, heroY - 90, 20, 5);
    
    // Shoes
    ctx.fillStyle = COLORS.COFFEE_DARK; // Mocha shoes
    ctx.fillRect(x - 30, heroY, 25, 15);
    ctx.fillRect(x + 5, heroY, 25, 15);
    
    // Animation states
    if (isDrinking) {
      // Head tilted back, add sparkles
      ctx.fillStyle = COLORS.TEAL;
      ctx.fillRect(x - 5, heroY - 130, 3, 3);
      ctx.fillRect(x + 8, heroY - 125, 3, 3);
      ctx.fillRect(x - 8, heroY - 120, 3, 3);
    } else if (gameState.mood === 100) {
      // Happy bounce
      const bounceOffset = Math.sin(Date.now() * 0.01) * 3;
      ctx.translate(0, bounceOffset);
    } else if (gameState.mood < 30) {
      // Slouched/sad posture
      ctx.translate(0, 10);
    }
  };

  const drawHUD = (ctx: CanvasRenderingContext2D) => {
    // Mood bar background
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.fillRect(600, 100, 400, 40);
    
    // Mood bar fill
    const fillWidth = (gameState.mood / 100) * 390;
    ctx.fillStyle = COLORS.TEAL;
    ctx.fillRect(605, 105, fillWidth, 30);
    
    // Mood bar label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('MOOD', 610, 80);
    ctx.fillText(`${gameState.mood}%`, 920, 130);
    
    // Timer
    ctx.fillStyle = COLORS.COFFEE_DARK;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(gameState.timeLeft)}s`, 1000, 200);
  };

  const drawDrinkButton = (ctx: CanvasRenderingContext2D) => {
    const buttonY = 1600;
    const buttonSize = 150;
    const buttonX = GAME_CONFIG.CANVAS_WIDTH / 2 - buttonSize / 2;
    
    // Button shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(buttonX + 5, buttonY + 5, buttonSize, buttonSize);
    
    // Button body
    ctx.fillStyle = gameState.drinkCooldown > 0 ? COLORS.COFFEE_MID : COLORS.TEAL;
    ctx.fillRect(buttonX, buttonY, buttonSize, buttonSize);
    
    // Button border
    ctx.strokeStyle = COLORS.COFFEE_DARK;
    ctx.lineWidth = 4;
    ctx.strokeRect(buttonX, buttonY, buttonSize, buttonSize);
    
    // Coffee cup icon
    ctx.fillStyle = 'white';
    ctx.fillRect(buttonX + 50, buttonY + 40, 50, 60);
    ctx.fillRect(buttonX + 45, buttonY + 100, 60, 10);
    
    // Handle
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(buttonX + 110, buttonY + 60, 15, 0, Math.PI);
    ctx.stroke();
    
    // "DRINK" text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DRINK', buttonX + buttonSize / 2, buttonY + 135);
  };

  const drawScreen = (ctx: CanvasRenderingContext2D, type: string) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    
    switch (type) {
      case 'attract':
        ctx.fillText('MOOD BOOSTER', GAME_CONFIG.CANVAS_WIDTH / 2, 800);
        ctx.fillText('OKKAA COFFEE', GAME_CONFIG.CANVAS_WIDTH / 2, 870);
        ctx.font = '32px Arial';
        ctx.fillText('Tap to Start!', GAME_CONFIG.CANVAS_WIDTH / 2, 1000);
        break;
      case 'victory':
        ctx.fillStyle = COLORS.TEAL;
        ctx.fillText('VICTORY!', GAME_CONFIG.CANVAS_WIDTH / 2, 800);
        ctx.fillStyle = 'white';
        ctx.font = '32px Arial';
        ctx.fillText('Mood Charged!', GAME_CONFIG.CANVAS_WIDTH / 2, 900);
        break;
      case 'defeat':
        ctx.fillStyle = COLORS.COFFEE_DARK;
        ctx.fillText('TRY AGAIN', GAME_CONFIG.CANVAS_WIDTH / 2, 800);
        ctx.fillStyle = 'white';
        ctx.font = '32px Arial';
        ctx.fillText('Need More Coffee!', GAME_CONFIG.CANVAS_WIDTH / 2, 900);
        break;
    }
    
    // Copyright
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('© Okkaa 2025', GAME_CONFIG.CANVAS_WIDTH - 20, GAME_CONFIG.CANVAS_HEIGHT - 20);
  };

  const isHeroUnderSpout = () => {
    return Math.abs(gameState.heroX - GAME_CONFIG.SPOUT_X) < GAME_CONFIG.SPOUT_TOLERANCE;
  };

  const handleDrink = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return;
    if (gameState.drinkCooldown > 0) return;
    if (!isHeroUnderSpout()) {
      toast("Move under the coffee spout!");
      return;
    }

    setGameState(prev => ({
      ...prev,
      mood: Math.min(prev.mood + GAME_CONFIG.MOOD_INCREASE, 100),
      drinkCooldown: GAME_CONFIG.DRINK_COOLDOWN
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
      attractTimer: 0
    });
  };

  const resetToAttract = () => {
    setGameState(prev => ({
      ...prev,
      gameStatus: 'attract',
      attractTimer: 0
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
        if (newState.attractTimer >= GAME_CONFIG.ATTRACT_TIMEOUT) {
          // Auto-start after idle time
        }
      } else if (newState.gameStatus === 'playing') {
        newState.timeLeft = Math.max(0, newState.timeLeft - deltaTime);
        newState.drinkCooldown = Math.max(0, newState.drinkCooldown - deltaTime);

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
    if (gameState.gameStatus === 'playing') {
      drawBackground(ctx);
      drawOkkaMachine(ctx);
      drawHero(ctx, gameState.heroX, isHeroUnderSpout(), gameState.drinkCooldown > 0.5);
      drawHUD(ctx);
      drawDrinkButton(ctx);
    } else {
      drawBackground(ctx);
      drawOkkaMachine(ctx);
      drawHero(ctx, gameState.heroX, false, false);
      drawScreen(ctx, gameState.gameStatus);
    }

    ctx.restore();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, isHeroUnderSpout, resetToAttract]);

  // Touch/Mouse handlers
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

  // Keyboard controls
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

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

    // Start game loop
    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    // Add keyboard listeners
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
