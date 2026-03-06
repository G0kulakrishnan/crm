import React, { useState } from 'react';
import db from '../../instant';
import { DEFAULT_PLANS } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

export default function AuthScreen() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [bizName, setBizName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast('Enter your email address', 'error'); return; }
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

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) { toast('Enter the code from your email', 'error'); return; }
    setLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      toast('Welcome to TechCRM! 👋', 'success');
    } catch (err) {
      toast(err?.body?.message || 'Invalid code. Try again.', 'error');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 800, fontSize: 18, color: '#fff' }}>TC</div>
          <h1>TechCRM</h1>
          <p>All-in-one SaaS CRM to manage leads,<br />invoices, projects &amp; automation.</p>
        </div>
        <div style={{ marginTop: 20, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.35)', marginBottom: 10 }}>Choose a Plan</div>
          <div className="auth-plans">
            {DEFAULT_PLANS.map(p => (
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
          <h2>{step === 'email' ? 'Welcome Back 👋' : 'Check Your Email 📧'}</h2>
          <p className="sub">
            {step === 'email'
              ? 'Sign in to your TechCRM workspace'
              : `We sent a 6-digit code to ${email}`}
          </p>

          {/* TABS (only visible on email step) */}
          {step === 'email' && (
            <div className="auth-tabs">
              <div className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign In</div>
              <div className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Create Account</div>
            </div>
          )}

          {/* OTP INFO BOX */}
          {step === 'email' && (
            <div className="auth-otp-info">
              <strong>🔐 Passwordless Magic Code Auth</strong>
              Enter your email and we'll send you a one-time code. No password needed — secure and instant.
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
              {selectedPlan && (
                <div className="form-group">
                  <label>Selected Plan</label>
                  <input value={selectedPlan} readOnly style={{ background: '#f0fdf4', borderColor: 'var(--accent)', fontWeight: 600 }} />
                </div>
              )}
            </>
          )}

          {/* EMAIL STEP */}
          {step === 'email' && (
            <form onSubmit={handleSendCode}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Magic Code →'}
              </button>
            </form>
          )}

          {/* CODE STEP */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode}>
              <div className="form-group">
                <label>6-Digit Code</label>
                <input
                  type="text" value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456" required autoFocus
                  style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center', fontWeight: 700 }}
                  maxLength={8}
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
