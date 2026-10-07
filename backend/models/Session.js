// MongoDB Session model — stores all practice sessions
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mode: {
    type: String,
    required: true,
    enum: ['interview', 'impromptu', 'vocal', 'analyze'],
    index: true,
  },
  score: { type: Number, min: 0, max: 100 },
  duration: { type: Number }, // seconds
  metadata: {
    // Interview-specific
    resumeId: String,
    questionId: String,
    questionText: String,
    // Impromptu-specific
    topicId: String,
    topicText: String,
    // Vocal-specific
    passageId: String,
    passageTitle: String,
    difficulty: String,
    // Analyze-specific
    expectedText: String,
    inputFile: String,
  },
  report: { type: mongoose.Schema.Types.Mixed }, // Full analysis report
  feedback: [String],
  scores: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// Compound index for user history queries
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, mode: 1, createdAt: -1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
