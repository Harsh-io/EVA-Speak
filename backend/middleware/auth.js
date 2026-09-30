// Google OAuth 2.0 + JWT authentication middleware
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eva-speak-dev-secret-change-in-prod';
const JWT_EXPIRY = '30d';
const COOKIE_NAME = 'eva_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
}

// Middleware: require authentication
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'User not found.', code: 'UNAUTHORIZED' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Invalid or expired token.', code: 'UNAUTHORIZED' });
    }
    next(err);
  }
}

// Middleware: optional auth (doesn't reject unauthenticated requests)
export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.sub).lean();
      if (user) {
        req.user = user;
        req.userId = user._id;
      }
    }
  } catch {
    // Silently continue without auth
  }
  next();
}

// Exchange Google OAuth tokens for user + JWT
export async function handleGoogleCallback(googleProfile) {
  const { sub: googleId, email, name, picture } = googleProfile;

  let user = await User.findOne({ googleId });
  if (user) {
    user.lastLoginAt = new Date();
    if (name) user.name = name;
    if (picture) user.picture = picture;
    await user.save();
  } else {
    user = await User.create({
      googleId,
      email,
      name: name || email.split('@')[0],
      picture: picture || '',
      lastLoginAt: new Date(),
    });
  }

  const token = signToken(user._id.toString());
  return { user, token };
}
