// MongoDB Resume model — stores uploaded resumes and their embeddings reference
import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  mimeType: { type: String },
  text: { type: String, default: '' }, // Extracted plain text (populated after parsing)
  pineconeNamespace: { type: String }, // Namespace in Pinecone for this resume's vectors
  chunkCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
  },
  error: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;
