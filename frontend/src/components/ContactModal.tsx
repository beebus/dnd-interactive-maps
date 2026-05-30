import React, { useState } from 'react';
import './Modal.css';

interface ContactModalProps {
  onClose: () => void;
}

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactModal({ onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha] = useState(() => generateCaptcha());
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function resetError() {
    if (status === 'error') setStatus('idle');
  }

  const emailValid = isValidEmail(email);
  const captchaCorrect = captchaInput !== '' && parseInt(captchaInput, 10) === captcha.answer;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    emailValid &&
    message.trim().length > 0 &&
    captchaCorrect &&
    status !== 'sending';

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('sending');
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBase}/api/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">Send a Comment</h2>

        {status === 'success' ? (
          <p className="modal-success">Your message has been sent! Thank you for the feedback.</p>
        ) : (
          <>
            <p className="modal-subtitle">
              Have a comment, suggestion, error, or typo to report? Send it our way!
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-field">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); resetError(); }}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>

              <div className="modal-field">
                <label htmlFor="contact-email">Email Address</label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); resetError(); }}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                {email.length > 0 && !emailValid && (
                  <span className="modal-field-error">Please enter a valid email address.</span>
                )}
              </div>

              <div className="modal-field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={e => { setMessage(e.target.value); resetError(); }}
                  placeholder="Your message..."
                  rows={5}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="contact-captcha">What is {captcha.a} + {captcha.b}?</label>
                <input
                  id="contact-captcha"
                  type="text"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={e => { setCaptchaInput(e.target.value); resetError(); }}
                  placeholder="Type your answer"
                  className="modal-captcha-input"
                />
              </div>

              {status === 'error' && (
                <p className="modal-error">{errorMsg}</p>
              )}

              <button type="submit" className="modal-submit" disabled={!canSubmit}>
                {status === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
