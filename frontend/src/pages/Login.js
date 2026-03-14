import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import PandaLogin from '../components/PandaLogin';
import { TrendingUp, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const canvasRef = useRef(null);
  const pandaRef = useRef(null);
  const authErrorAudioRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const audio = new Audio('/sounds/auth-error.mp3');
    audio.preload = 'auto';
    authErrorAudioRef.current = audio;

    return () => {
      authErrorAudioRef.current = null;
    };
  }, []);

  const playAuthErrorSound = () => {
    const audio = authErrorAudioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } catch {
      // Sound should never block auth feedback.
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frameId = null;
    let active = !document.hidden;

    class Particle {
      constructor() {
        this.reset();
        this.x = Math.random() * width;
        this.y = Math.random() * height;
      }

      reset() {
        this.size = 0.6 + Math.random() * 2.2;
        this.speedX = 0.07 + Math.random() * 0.45;
        this.speedY = -0.05 + Math.random() * 0.22;
        this.alpha = 0.2 + Math.random() * 0.55;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > width + 20) this.x = -20;
        if (this.x < -20) this.x = width + 20;
        if (this.y > height + 20) this.y = -20;
        if (this.y < -20) this.y = height + 20;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26, 255, 218, ${this.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(26, 255, 218, 0.45)';
        ctx.fill();
      }
    }

    const particles = [];

    const getParticleCount = () => {
      const area = window.innerWidth * window.innerHeight;
      const target = Math.floor(area / 3200);
      return Math.max(140, Math.min(target, 520));
    };

    const buildParticles = () => {
      particles.length = 0;
      const count = prefersReducedMotion ? Math.floor(getParticleCount() * 0.35) : getParticleCount();
      for (let i = 0; i < count; i += 1) {
        particles.push(new Particle());
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildParticles();
    };

    const animate = () => {
      if (!active) {
        frameId = requestAnimationFrame(animate);
        return;
      }

      ctx.fillStyle = 'rgba(2, 12, 18, 0.2)';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        particles[i].update();
        particles[i].draw();
      }

      frameId = requestAnimationFrame(animate);
    };

    const handleVisibility = () => {
      active = !document.hidden;
    };

    resize();
    ctx.fillStyle = 'rgba(2, 12, 18, 1)';
    ctx.fillRect(0, 0, width, height);
    animate();

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      pandaRef.current?.loginSuccess();
      toast.success('Welcome back!');
      await new Promise((resolve) => setTimeout(resolve, 700));
      navigate('/dashboard');
    } catch (error) {
      pandaRef.current?.loginError();
      playAuthErrorSound();
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailFocus = () => {
    pandaRef.current?.emailFocus();
  };

  const handleEmailHover = () => {
    pandaRef.current?.emailHover();
  };

  const handleEmailBlur = () => {
    pandaRef.current?.emailBlur();
  };

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);
    pandaRef.current?.emailType(value);
  };

  const handlePasswordFocus = () => {
    pandaRef.current?.passwordFocus();
  };

  const handlePasswordBlur = () => {
    pandaRef.current?.passwordBlur();
  };

  const handlePasswordChange = (event) => {
    const value = event.target.value;
    setPassword(value);
    pandaRef.current?.passwordType(value);
  };

  return (
    <div className="auth-chroma-shell relative min-h-screen overflow-hidden bg-[#020a10]">
      <div className="auth-chroma-base absolute inset-0" />
      <div className="auth-chroma-aurora pointer-events-none absolute inset-0" />
      <canvas
        id="bg"
        ref={canvasRef}
        className="auth-particle-canvas pointer-events-none fixed inset-0 z-[2] h-full w-full"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="login-glass-panel w-full max-w-md rounded-2xl p-6 sm:p-8"
        >
          <PandaLogin ref={pandaRef} className="panda-card-corner" />

          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-[0_0_25px_rgba(18,183,162,0.35)]" style={{ backgroundColor: 'color-mix(in srgb, var(--auth-accent) 24%, transparent)' }}>
              <TrendingUp className="h-6 w-6" style={{ color: 'var(--auth-accent)' }} />
            </div>
            <span className="brand-logo-text text-[1.8rem] leading-none">TradeLedger</span>
          </div>

          <div className="pr-32">
            <h1 className="mb-2 text-4xl font-heading font-black">Welcome back</h1>
            <p className="mb-8 text-[#9ec7cc]">Sign in to continue tracking your trades</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="panda-login-stack">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onMouseEnter={handleEmailHover}
                  onFocus={handleEmailFocus}
                  onBlur={handleEmailBlur}
                  onChange={handleEmailChange}
                  onInvalid={() => {
                    pandaRef.current?.loginError();
                    playAuthErrorSound();
                  }}
                  className="h-12 border-white/10 bg-black/30 pl-12 focus:border-[#1affda]"
                  data-testid="login-email-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: 'var(--auth-accent)' }} data-testid="forgot-password-link">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  onInput={handlePasswordChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  onInvalid={() => {
                    pandaRef.current?.loginError();
                    playAuthErrorSound();
                  }}
                  className="h-12 border-white/10 bg-black/30 pl-12 pr-12 focus:border-[#1affda]"
                  data-testid="login-password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg font-bold text-[#012228] shadow-[0_0_24px_rgba(26,255,218,0.4)]"
              style={{ backgroundColor: 'var(--auth-accent)' }}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-[#9ec7cc]">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--auth-accent)' }} data-testid="register-link">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
