import React, { useState } from 'react';
import db from '../../instant';
import { DEFAULT_PLANS } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

export default function AuthScreen({ settings }) {
  const activePlans = settings?.plans || DEFAULT_PLANS;
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'magic'
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [bizName, setBizName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleMagicSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast('Enter your email address', 'error'); return; }
    
    if (tab === 'register') {
      localStorage.setItem('tc_reg_data', JSON.stringify({
        bizName, fullName, phone, selectedPlan: selectedPlan || 'Trial'
      }));
    }

    setLoading(true);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep('code');
      toast('Magic code sent! Check your email 📧', 'success');
    } catch (err) {
      toast(err?.body?.message || 'Failed to send code. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) { toast('Enter the code from your email', 'error'); return; }
    setLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      toast(`Welcome to ${settings?.brandName || 'TechCRM'}! 👋`, 'success');
    } catch (err) {
      toast(err?.body?.message || 'Invalid code. Try again.', 'error');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast('Enter email and password', 'error'); return; }
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action: tab })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      // Attempt to sign in with custom token
      await db.auth.signInWithToken(data.token);
      
      if (data.isTeamMember) {
        localStorage.setItem('tc_team_member', JSON.stringify({
          isTeamMember: true,
          ownerUserId: data.ownerUserId,
          teamMemberId: data.teamMemberId
        }));
      } else {
        localStorage.removeItem('tc_team_member');
      }

      if (tab === 'register') {
        localStorage.setItem('tc_reg_data', JSON.stringify({
          bizName, fullName, phone, selectedPlan: selectedPlan || 'Trial'
        }));
      }

      toast(tab === 'login' ? 'Welcome Back! 👋' : 'Account created successfully! 🎉', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast('Please enter your email first', 'info'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password-request', email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // In production, backend should send the email or we call our /api/send-email from here
      // For now we log it so development is easier
      console.log('PASSWORD RESET CODE (Dev Mode):', data.otp);
      
      toast('Reset code sent! Check your email / console.', 'success');
      setStep('reset');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code.trim() || !newPassword) { toast('Enter code and new password', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password-verify', email: email.trim(), code: code.trim(), newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast('Password reset successfully! You can now log in.', 'success');
      setStep('email');
      setTab('login');
      setPassword('');
      setNewPassword('');
      setCode('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 800, fontSize: 18, color: '#fff' }}>{settings?.brandShort || 'TC'}</div>
          <h1>{settings?.brandName || 'TechCRM'}</h1>
          <p>All-in-one SaaS CRM to manage leads,<br />invoices, projects &amp; automation.</p>
        </div>
        <div style={{ marginTop: 20, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.35)', marginBottom: 10 }}>Choose a Plan</div>
          <div className="auth-plans">
            {activePlans.map(p => (
              <div
                key={p.id}
                className={`auth-plan-card${selectedPlan === p.name ? ' selected' : ''}`}
                onClick={() => { setSelectedPlan(p.name); }}
              >
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{p.duration} days · {p.sale === 0 ? 'Free' : `₹${p.sale.toLocaleString()}/period`}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 28, color: 'rgba(255,255,255,.35)', fontSize: 11, textAlign: 'center' }}>
          Secure · Real-time · Multi-tenant
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-box">
          <h2>{step === 'email' ? 'Welcome 👋' : step === 'reset' ? 'Reset Password 🔑' : 'Check Your Email 📧'}</h2>
          <p className="sub">
            {step === 'email'
              ? `Sign in to your ${settings?.brandName || 'TechCRM'} workspace`
              : step === 'reset'
              ? 'Enter the 6-digit code and a new password'
              : `We sent a 6-digit code to ${email}`}
          </p>

          {/* TABS (only visible on email step) */}
          {step === 'email' && (
            <div className="auth-tabs">
              <div className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign In</div>
              <div className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Create Account</div>
            </div>
          )}

          {/* AUTH METHOD SELECTOR */}
          {step === 'email' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button 
                type="button" 
                className={`btn ${authMethod === 'password' ? 'btn-primary' : ''}`} 
                style={{ flex: 1, background: authMethod !== 'password' ? '#f1f5f9' : undefined, color: authMethod !== 'password' ? '#64748b' : undefined }}
                onClick={() => setAuthMethod('password')}
              >
                Password
              </button>
              <button 
                type="button" 
                className={`btn ${authMethod === 'magic' ? 'btn-primary' : ''}`} 
                style={{ flex: 1, background: authMethod !== 'magic' ? '#f1f5f9' : undefined, color: authMethod !== 'magic' ? '#64748b' : undefined }}
                onClick={() => setAuthMethod('magic')}
              >
                Magic Code
              </button>
            </div>
          )}

          {/* REGISTER EXTRA FIELDS */}
          {step === 'email' && tab === 'register' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label>Business Name</label>
                <input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Your business name" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </>
          )}

          {/* EMAIL & PASSWORD STEP */}
          {step === 'email' && (
            <form onSubmit={authMethod === 'password' ? handlePasswordSubmit : handleMagicSendCode}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required autoFocus
                />
              </div>

              {authMethod === 'password' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ marginBottom: 0 }}>Password</label>
                    {tab === 'login' && (
                      <span 
                        style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setStep('forgot')}
                      >
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required 
                    style={{ marginTop: 6 }}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={loading}>
                {loading ? 'Processing...' : (authMethod === 'password' ? (tab === 'login' ? 'Sign In' : 'Create Account') : 'Send Magic Code →')}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD REQUEST STEP */}
          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <span
                  style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setStep('email')}
                >
                  ← Back to Login
                </span>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD RESET STEP */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>6-Digit Reset Code</label>
                <input
                  type="text" value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456" required autoFocus
                  style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center', fontWeight: 700 }}
                  maxLength={6}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••" required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={loading}>
                {loading ? 'Reseting...' : 'Update Password ✓'}
              </button>
            </form>
          )}

          {/* MAGIC CODE STEP */}
          {step === 'code' && (
            <form onSubmit={handleMagicVerifyCode}>
              <div className="form-group">
                <label>6-Digit Magic Code</label>
                <input
                  type="text" value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456" required autoFocus
                  style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center', fontWeight: 700 }}
                  maxLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In ✓'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <span
                  style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { setStep('email'); setCode(''); }}
                >
                  ← Use a different email
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
