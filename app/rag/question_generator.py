"""LangGraph-based question generator — generates interview questions from resume context."""

import os
from typing import Any, TypedDict
from uuid import uuid4


class QuestionGeneratorState(TypedDict):
    resume_text: str
    resume_namespace: str
    question_count: int
    retrieved_context: list[str]
    questions: list[dict[str, Any]]


def build_question_generator():
    """Build a LangGraph agent for generating interview questions from resume context."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for question generation.")

    try:
        from langgraph.graph import StateGraph, END
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        raise RuntimeError(
            "LangGraph and LangChain are required. "
            "Run: pip install langgraph langchain-openai"
        )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, api_key=api_key)

    def retrieve_context(state: QuestionGeneratorState) -> QuestionGeneratorState:
        """Retrieve relevant resume chunks from Pinecone."""
        from app.rag.embeddings import get_query_embedding
        from app.rag.pinecone_store import query_resume

        queries = [
            "technical skills and programming experience",
            "work experience and job responsibilities",
            "education background and certifications",
            "projects and achievements",
            "leadership and teamwork experience",
        ]

        all_chunks = []
        seen_texts = set()
        for query in queries[: state["question_count"]]:
            try:
                embedding = get_query_embedding(query)
                results = query_resume(embedding, state["resume_namespace"], top_k=3)
                for r in results:
                    if r["text"] not in seen_texts:
                        all_chunks.append(r["text"])
                        seen_texts.add(r["text"])
            except Exception:
                continue

        # Fallback: use raw resume text if Pinecone retrieval fails
        if not all_chunks and state["resume_text"]:
            words = state["resume_text"].split()
            chunk_size = max(100, len(words) // state["question_count"])
            for i in range(0, len(words), chunk_size):
                all_chunks.append(" ".join(words[i : i + chunk_size]))

        state["retrieved_context"] = all_chunks
        return state

    def generate_questions(state: QuestionGeneratorState) -> QuestionGeneratorState:
        """Generate interview questions based on retrieved resume context."""
        context = "\n\n---\n\n".join(state["retrieved_context"]) if state["retrieved_context"] else state["resume_text"]
        count = state["question_count"]

        system_prompt = """You are an expert interview coach. Generate highly relevant, contextual interview questions based on the candidate's resume.

Rules:
- Generate exactly the requested number of questions
- Questions should be specific to the candidate's experience, skills, and background
- Include a mix of behavioral, technical, and situational questions
- Each question should reference specific details from the resume
- Questions should be challenging but fair
- Return ONLY valid JSON

Output format (JSON array):
[
  {
    "id": "unique-id",
    "text": "The interview question",
    "type": "behavioral|technical|situational",
    "context": "What part of the resume this relates to",
    "difficulty": "easy|medium|hard"
  }
]"""

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Generate {count} interview questions based on this resume context:\n\n{context}"),
        ])

        import json
        try:
            # Try to parse JSON from the response
            response_text = response.content.strip()
            # Handle markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            questions = json.loads(response_text)
            # Ensure each question has an ID
            for q in questions:
                if "id" not in q:
                    q["id"] = str(uuid4())
            state["questions"] = questions
        except (json.JSONDecodeError, IndexError):
            # Fallback: create generic questions
            state["questions"] = [
                {
                    "id": str(uuid4()),
                    "text": "Tell me about your most significant professional achievement.",
                    "type": "behavioral",
                    "context": "General experience",
                    "difficulty": "medium",
                }
            ]

        return state

    # Build the graph
    graph = StateGraph(QuestionGeneratorState)
    graph.add_node("retrieve", retrieve_context)
    graph.add_node("generate", generate_questions)
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    graph.set_entry_point("retrieve")

    return graph.compile()


def generate_interview_questions(
    resume_text: str,
    resume_namespace: str,
    count: int = 5,
) -> list[dict[str, Any]]:
    """High-level function to generate interview questions."""
    agent = build_question_generator()
    result = agent.invoke({
        "resume_text": resume_text,
        "resume_namespace": resume_namespace,
        "question_count": count,
        "retrieved_context": [],
        "questions": [],
    })
    return result["questions"]
