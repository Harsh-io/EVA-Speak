// MongoDB User model
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  picture: { type: String, default: '' },
  lastLoginAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  preferences: {
    defaultMode: { type: String, default: 'dashboard' },
    emailNotifications: { type: Boolean, default: true },
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
