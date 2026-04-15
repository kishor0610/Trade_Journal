import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { TrendingUp, Mail, Lock, User, ArrowRight, Eye, EyeOff, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const canvasRef = useRef(null);
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
      await register(email, password, name, referralCode);
      if (referralCode) {
        toast.success('Account created successfully! Welcome to TradeLedger via referral 🎉');
        // Remind user about referral bonus
        setTimeout(() => {
          toast.success('🎁 Don\'t forget: Upgrade to unlock +15 days bonus!', { duration: 5000 });
        }, 2000);
      } else {
        toast.success('Account created successfully! You have 14 days free trial.');
      }
      navigate('/dashboard');
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      if (detail === 'Email already registered') {
        toast.error('Account already exists. Please login with your email and password.');
      } else {
        toast.error(detail || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
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
          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-[0_0_25px_rgba(18,183,162,0.35)]" style={{ backgroundColor: 'color-mix(in srgb, var(--auth-accent) 24%, transparent)' }}>
              <TrendingUp className="h-6 w-6" style={{ color: 'var(--auth-accent)' }} />
            </div>
            <span className="brand-logo-text text-[1.8rem] leading-none">TradeLedger</span>
          </div>

          <h1 className="mb-2 text-4xl font-heading font-black">Create account</h1>
          <p className="mb-8 text-[#9ec7cc]">Start your trading journal journey</p>

          {referralCode && (
            <div className="mb-6 p-4 rounded-lg border border-purple-500/30 bg-purple-500/10 flex items-center gap-3">
              <Gift className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-purple-300">Referred by a friend!</p>
                <p className="text-xs text-purple-400/80">Get +15 days bonus when you subscribe</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 border-white/10 bg-black/30 pl-12 focus:border-[#1affda]"
                  data-testid="register-name-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-white/10 bg-black/30 pl-12 focus:border-[#1affda]"
                  data-testid="register-email-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-white/10 bg-black/30 pl-12 pr-12 focus:border-[#1affda]"
                  data-testid="register-password-input"
                  required
                  minLength={6}
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
              data-testid="register-submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-[#9ec7cc]">
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--auth-accent)' }} data-testid="login-link">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
