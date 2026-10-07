"""CLI bridge for RAG pipeline — called from Node.js backend."""

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="EVA Speak RAG Pipeline Bridge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Command: parse-resume
    parse_cmd = subparsers.add_parser("parse-resume", help="Parse and embed a resume")
    parse_cmd.add_argument("file", type=Path, help="Path to resume file (PDF/DOCX)")
    parse_cmd.add_argument("--resume-id", required=True, help="Resume document ID")

    # Command: generate-questions
    gen_cmd = subparsers.add_parser("generate-questions", help="Generate interview questions")
    gen_cmd.add_argument("--resume-id", required=True, help="Resume document ID")
    gen_cmd.add_argument("--count", type=int, default=5, help="Number of questions")

    # Command: analyze-answer
    answer_cmd = subparsers.add_parser("analyze-answer", help="Analyze an interview answer")
    answer_cmd.add_argument("video", type=Path, help="Path to video file")
    answer_cmd.add_argument("--question-id", default="unknown", help="Question ID")

    args = parser.parse_args()

    try:
        if args.command == "parse-resume":
            result = handle_parse_resume(args.file, args.resume_id)
        elif args.command == "generate-questions":
            result = handle_generate_questions(args.resume_id, args.count)
        elif args.command == "analyze-answer":
            result = handle_analyze_answer(args.video, args.question_id)
        else:
            raise ValueError(f"Unknown command: {args.command}")

        print(json.dumps(result, ensure_ascii=True))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 1


def handle_parse_resume(file_path: Path, resume_id: str) -> dict:
    """Parse resume and embed chunks into Pinecone."""
    from app.rag.resume_parser import parse_resume, chunk_text

    text = parse_resume(file_path)
    chunks = chunk_text(text)

    namespace = resume_id
    chunk_count = len(chunks)

    # Try to embed and store in Pinecone
    try:
        from app.rag.embeddings import get_embeddings
        from app.rag.pinecone_store import upsert_chunks

        embeddings = get_embeddings(chunks)
        upsert_chunks(chunks, embeddings, namespace, metadata={"resume_id": resume_id})
    except Exception as exc:
        # Non-fatal: resume text is still available for direct use
        sys.stderr.write(f"Warning: Pinecone embedding failed: {exc}\n")

    return {
        "text": text,
        "namespace": namespace,
        "chunkCount": chunk_count,
        "status": "ready",
    }


def handle_generate_questions(resume_id: str, count: int) -> dict:
    """Generate interview questions from resume context."""
    # Try MongoDB to get resume text
    resume_text = ""
    try:
        import os
        import pymongo
        mongo_uri = os.getenv("MONGODB_URI")
        if mongo_uri:
            from bson import ObjectId
            client = pymongo.MongoClient(mongo_uri)
            db = client.get_default_database() or client["eva-speak"]
            resume = db.resumes.find_one({"_id": ObjectId(resume_id)})
            if resume:
                resume_text = resume.get("text", "")
    except Exception:
        pass

    try:
        from app.rag.question_generator import generate_interview_questions
        questions = generate_interview_questions(resume_text, resume_id, count)
    except Exception as exc:
        # Fallback to generic questions if RAG pipeline fails
        from uuid import uuid4
        questions = [
            {"id": str(uuid4()), "text": "Tell me about yourself and your most relevant experience.", "type": "behavioral", "context": "General", "difficulty": "easy"},
            {"id": str(uuid4()), "text": "What is your greatest professional achievement?", "type": "behavioral", "context": "General", "difficulty": "medium"},
            {"id": str(uuid4()), "text": "How do you handle pressure and tight deadlines?", "type": "situational", "context": "General", "difficulty": "medium"},
            {"id": str(uuid4()), "text": "Where do you see yourself in five years?", "type": "behavioral", "context": "General", "difficulty": "easy"},
            {"id": str(uuid4()), "text": "Describe a time you resolved a conflict in a team.", "type": "behavioral", "context": "General", "difficulty": "hard"},
        ][:count]
        sys.stderr.write(f"Warning: RAG generation failed ({exc}), using fallback questions.\n")

    return {"questions": questions}


def handle_analyze_answer(video_path: Path, question_id: str) -> dict:
    """Analyze a video answer using the full pipeline + LLM feedback."""
    from app.full_pipeline import analyze_full

    report, _, _ = analyze_full(video_path, expected_text="interview response")

    # Try to enhance with LLM feedback
    try:
        from app.rag.feedback_generator import generate_coaching_feedback
        coaching = generate_coaching_feedback(report, mode="interview")
        report["sample_answer"] = coaching.get("sample_answer")
        report["improvement_tips"] = coaching.get("improvement_tips", [])
        report["strengths"] = coaching.get("strengths", [])
        report["areas_to_improve"] = coaching.get("areas_to_improve", [])
        if coaching.get("feedback"):
            report["feedback"] = coaching["feedback"]
    except Exception as exc:
        sys.stderr.write(f"Warning: LLM feedback failed: {exc}\n")

    report["question_id"] = question_id
    return report


if __name__ == "__main__":
    raise SystemExit(main())
