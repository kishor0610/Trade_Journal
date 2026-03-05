import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSent(true);
      // If no email service configured, token is returned directly (dev mode)
      if (response.data.token) {
        setResetToken(response.data.token);
      }
      toast.success('Password reset instructions sent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-heading font-black mb-2">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
          
          {resetToken && (
            <div className="glass-card p-4 mb-6 text-left">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Dev Mode:</strong> Email service not configured. Use this link:
              </p>
              <Button
                onClick={() => navigate(`/reset-password?token=${resetToken}`)}
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                Reset Password Now
              </Button>
            </div>
          )}
          
          <Link to="/login" className="text-accent hover:underline">
            Back to login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <h1 className="text-4xl font-heading font-black mb-2">Forgot password?</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email and we'll send you instructions to reset your password
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-12 bg-secondary border-white/10 focus:border-accent"
                data-testid="forgot-email-input"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-white text-black font-bold hover:bg-gray-200"
            data-testid="forgot-submit-btn"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
