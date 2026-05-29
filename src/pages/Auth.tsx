import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, ArrowLeft, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { PageMeta } from '@/components/seo/PageMeta';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
const signupSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate('/engagement-order');
  }, [user, isLoading, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMessage(''); setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !z.string().email().safeParse(trimmedEmail).success) {
        setError('Please enter a valid email address'); setIsSubmitting(false); return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: `${window.location.origin}/auth` });
      if (error) setError(error.message); else setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch { setError('Something went wrong.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMessage(''); setIsSubmitting(true);
    const timeoutId = setTimeout(() => { setIsSubmitting(c => { if (c) { setError('Connection timeout.'); return false; } return false; }); }, 20000);
    try {
      if (isLogin) {
        const v = loginSchema.safeParse({ email, password });
        if (!v.success) { setError(v.error.errors[0].message); setIsSubmitting(false); return; }
        const { error } = await signIn(email, password);
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('invalid login credentials')) setError('Incorrect email or password.');
          else if (msg.includes('email not confirmed')) setError('Please verify your email first.');
          else if (msg.includes('rate limit')) setError('Too many attempts. Try again in 5 mins.');
          else setError('Login failed.');
          setIsSubmitting(false); return;
        }
        navigate('/engagement-order', { replace: true });
      } else {
        const v = signupSchema.safeParse({ email, password, fullName });
        if (!v.success) { setError(v.error.errors[0].message); setIsSubmitting(false); return; }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered')) setError('This email is already registered.');
          else if (msg.includes('rate limit')) setError('Too many attempts. Wait 5 minutes.');
          else setError(error.message || 'Signup failed.');
          setIsSubmitting(false); clearTimeout(timeoutId); return;
        }
        setSuccessMessage('Account created successfully!');
        setTimeout(() => setIsLogin(true), 2000);
      }
    } catch (err: any) {
      if (!err?.message?.includes('abort')) setError('Something went wrong. Please try again.');
    } finally { setIsSubmitting(false); clearTimeout(timeoutId); }
  };

  const inputClass = "h-12 rounded-md border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary px-4 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background text-foreground relative overflow-hidden">
      <PageMeta
        title={isLogin ? 'Sign in — Voting Pro' : 'Create your account — Voting Pro'}
        description="Sign in or create your free Voting Pro account to launch organic Instagram, YouTube and TikTok growth campaigns. No credit card required."
        canonicalPath="/auth"
      />

      {/* Ambient luxury glow */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(900px 500px at 80% -10%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(700px 400px at -10% 110%, hsl(var(--primary) / 0.06), transparent 60%)' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="w-full max-w-[420px] relative z-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="w-3 h-3" /> :back_to_home
        </Link>

        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 rounded-md border border-border bg-card flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 0 hsl(var(--primary) / 0.15)' }}>
            <span className="font-serif italic text-2xl text-primary leading-none">v</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">voting</span>
            <span className="font-serif text-xl text-foreground -mt-0.5">Pro <span className="text-primary italic">edition</span></span>
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">
          {isForgotPassword ? ':01 — recover' : isLogin ? ':01 — return' : ':01 — enter'}
        </p>
        <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-foreground mb-3">
          {isForgotPassword ? <>Reset <em className="text-primary not-italic font-serif italic">access</em>.</> : isLogin ? <>Welcome <em className="text-primary not-italic font-serif italic">back</em>.</> : <>Create <em className="text-primary not-italic font-serif italic">account</em>.</>}
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          {isForgotPassword ? 'Enter your email and we will send a secure reset link.' : isLogin ? 'Sign in to continue to your private console.' : 'A free workspace, ready in seconds.'}
        </p>

        {showVerifyEmail ? (
          <div className="text-center py-8 border border-border rounded-md bg-card/60">
            <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mx-auto mb-6 bg-background">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-serif text-2xl mb-2 text-foreground">Check your inbox</h3>
            <p className="text-xs text-muted-foreground mb-1">Verification link sent to</p>
            <p className="text-sm font-mono text-foreground mb-6">{email}</p>
            <button onClick={() => { setShowVerifyEmail(false); setIsLogin(true); }} className="text-xs font-mono uppercase tracking-[0.18em] text-primary hover:underline">
              ← back to login
            </button>
          </div>
        ) : (
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-5">
            {!isLogin && !isForgotPassword && (
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 block">:full_name</Label>
                <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
              </div>
            )}
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 block">:email</Label>
              <Input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">:password</Label>
                  {isLogin && (
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary hover:underline">
                      forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-11`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}
            {successMessage && <p className="text-[13px] font-medium text-primary">{successMessage}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group w-full h-12 rounded-md bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.6)] transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                {isForgotPassword ? 'send reset link' : isLogin ? 'sign in' : 'create account'}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>}
            </button>

            {isForgotPassword ? (
              <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-center text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                ← back to login
              </button>
            ) : (
              <p className="text-center text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground pt-2">
                {isLogin ? "no account? " : 'already a member? '}
                <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }} className="text-primary hover:underline">
                  {isLogin ? 'sign up →' : 'sign in →'}
                </button>
              </p>
            )}
          </form>
        )}

        {/* Telegram */}
        <a href="https://t.me/votingpro" target="_blank" rel="noopener noreferrer" className="mt-10 flex items-center gap-3 p-4 rounded-md border border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-all">
          <div className="w-9 h-9 rounded-md border border-border flex items-center justify-center bg-background">
            <svg className="w-4 h-4 fill-primary" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.61.8-1.88 1.77-1.88.21 0 .69.05.99.23.32.19.43.46.46.72.02.16.01.32-.01.48z" /></svg>
          </div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">:join_telegram</p>
            <p className="text-xs text-muted-foreground mt-0.5">Updates & priority support</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </a>
      </div>
    </div>
  );
}
