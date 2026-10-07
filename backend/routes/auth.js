// Auth routes — Google OAuth 2.0 flow
import { Router } from 'express';
import { handleGoogleCallback, signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const router = Router();

// Redirect to Google OAuth
router.get('/google', (_req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) {
      console.error('Google token exchange failed:', tokens);
      return res.redirect(`${FRONTEND_URL}?error=token_failed`);
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleProfile = await userInfoResponse.json();
    if (!googleProfile.sub) {
      return res.redirect(`${FRONTEND_URL}?error=profile_failed`);
    }

    // Create/update user and get JWT
    const { token } = await handleGoogleCallback(googleProfile);
    setAuthCookie(res, token);

    // Redirect to frontend
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
});

// Register with email + password
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.', code: 'INVALID_INPUT' });
  }
  if (!name || name.trim().length < 1) {
    return res.status(400).json({ error: 'Name is required.', code: 'INVALID_INPUT' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.', code: 'INVALID_INPUT' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.', code: 'INVALID_INPUT' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_EXISTS' });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      name: name.trim(),
      passwordHash,
      authProvider: 'email',
      lastLoginAt: new Date(),
    });

    const token = signToken(user._id.toString());
    setAuthCookie(res, token);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_EXISTS' });
    }
    res.status(500).json({ error: 'Registration failed.', code: 'SERVER_ERROR' });
  }
});

// Login with email + password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.', code: 'INVALID_INPUT' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.default.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id.toString());
    setAuthCookie(res, token);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.', code: 'SERVER_ERROR' });
  }
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      createdAt: req.user.createdAt,
    },
  });
});

// Logout
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
