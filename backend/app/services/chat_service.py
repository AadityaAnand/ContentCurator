import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models import Conversation, Message
from app.services.topic_ingestion_service import topic_ingestion_service
from app.services.ollama_service import ollama_service
from app.config import settings

logger = logging.getLogger(__name__)


class ChatService:
    """
    Service for handling chat conversations with web research.

    Workflow:
    1. User asks a question
    2. System researches the web (via Tavily)
    3. System synthesizes answer from sources with citations
    4. Stores conversation history for follow-ups
    """

    async def answer_question(
        self,
        question: str,
        conversation_id: Optional[int],
        db: Session,
        max_sources: int = 5
    ) -> Dict:
        """
        Answer a user's question by researching the web and synthesizing a response.

        Args:
            question: The user's question
            conversation_id: ID of existing conversation, or None for new
            db: Database session
            max_sources: Number of sources to research

        Returns:
            Dict with:
            {
                "conversation_id": int,
                "message": MessageResponse with sources
            }
        """
        logger.info(f"Answering question: {question}")

        # Get or create conversation
        if conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
        else:
            # Create new conversation with title from first question
            title = question[:100] + "..." if len(question) > 100 else question
            conversation = Conversation(title=title)
            db.add(conversation)
            db.flush()

        # Store user message
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=question
        )
        db.add(user_message)
        db.commit()

        try:
            # Research the question
            sources = await self._research_question(question, max_sources)

            if not sources:
                # No sources found, give a polite response
                answer = "I couldn't find any relevant sources to answer your question. Could you try rephrasing it or asking something else?"
                assistant_message = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=answer,
                    sources=[],
                    research_query=question
                )
            else:
                # Synthesize answer from sources
                answer = await self._synthesize_answer(question, sources)

                # Create assistant message with sources
                assistant_message = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=answer,
                    sources=sources,
                    research_query=question
                )

            db.add(assistant_message)
            db.commit()
            db.refresh(assistant_message)

            return {
                "conversation_id": conversation.id,
                "message": assistant_message
            }

        except Exception as e:
            logger.error(f"Error answering question: {e}")
            db.rollback()
            raise

    async def _research_question(self, question: str, max_sources: int) -> List[Dict]:
        """
        Research a question using Tavily search.

        Returns:
            List of source dicts: [{"title": str, "url": str, "snippet": str}, ...]
        """
        if not settings.TAVILY_API_KEY:
            logger.warning("TAVILY_API_KEY not configured, cannot research")
            return []

        try:
            # Use the existing topic ingestion service to search
            import httpx

            search_endpoint = "https://api.tavily.com/search"
            payload = {
                "api_key": settings.TAVILY_API_KEY,
                "query": question,
                "max_results": max_sources,
                "search_depth": "basic",
                "include_answer": False,
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(search_endpoint, json=payload)
                resp.raise_for_status()
                data = resp.json()
                results = data.get("results", [])

            # Extract sources with snippets
            sources = []
            for result in results[:max_sources]:
                sources.append({
                    "title": result.get("title", "Untitled"),
                    "url": result.get("url", ""),
                    "snippet": result.get("content", "")[:500]  # First 500 chars as snippet
                })

            logger.info(f"Found {len(sources)} sources for question: {question}")
            return sources

        except Exception as e:
            logger.error(f"Error researching question: {e}")
            return []

    async def _synthesize_answer(self, question: str, sources: List[Dict]) -> str:
        """
        Synthesize an answer from multiple sources using Ollama.

        Args:
            question: The user's question
            sources: List of source dicts with title, url, snippet

        Returns:
            Formatted answer with citations [1], [2], etc.
        """
        # Build context from sources
        context_parts = []
        for i, source in enumerate(sources, 1):
            context_parts.append(
                f"[{i}] {source['title']}\n"
                f"URL: {source['url']}\n"
                f"Content: {source['snippet']}\n"
            )

        context = "\n\n".join(context_parts)

        # Create prompt for answer synthesis
        prompt = f"""You are a helpful research assistant. Answer the user's question using ONLY the provided sources.

Include citations in your answer using [1], [2], etc. to reference the sources.

IMPORTANT RULES:
1. Only use information from the provided sources
2. If sources don't fully answer the question, say so
3. Add citations [1], [2] after statements to show which source
4. Be concise but comprehensive
5. If sources contradict each other, mention both views
6. At the end, include a "Sources:" section listing all references

SOURCES:
{context}

USER QUESTION:
{question}

ANSWER:"""

        try:
            # Call Ollama to generate response
            import httpx

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "http://localhost:11434/api/chat",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are a helpful research assistant that answers questions using provided sources with citations."},
                            {"role": "user", "content": prompt}
                        ],
                        "stream": False,
                        "options": {
                            "temperature": 0.3,  # Lower temperature for more factual responses
                            "num_predict": 1000
                        }
                    }
                )
                response.raise_for_status()
                data = response.json()
                answer = data.get("message", {}).get("content", "")

                # Add source list at the end if not already present
                if "Sources:" not in answer and "SOURCES:" not in answer:
                    answer += "\n\n**Sources:**\n"
                    for i, source in enumerate(sources, 1):
                        answer += f"{i}. [{source['title']}]({source['url']})\n"

                return answer.strip()

        except Exception as e:
            logger.error(f"Error synthesizing answer: {e}")
            # Fallback: Just list the sources
            fallback = f"I found {len(sources)} relevant sources for your question:\n\n"
            for i, source in enumerate(sources, 1):
                fallback += f"{i}. **{source['title']}**\n   {source['snippet'][:200]}...\n   [Read more]({source['url']})\n\n"
            return fallback

    def get_conversation(self, conversation_id: int, db: Session) -> Optional[Conversation]:
        """Get a conversation with all messages."""
        return db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def list_conversations(self, db: Session, limit: int = 20) -> List[Conversation]:
        """List recent conversations."""
        return db.query(Conversation)\
            .order_by(Conversation.updated_at.desc())\
            .limit(limit)\
            .all()

    def delete_conversation(self, conversation_id: int, db: Session) -> bool:
        """Delete a conversation and all its messages."""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conversation:
            db.delete(conversation)
            db.commit()
            return True
        return False


# Global instance
chat_service = ChatService()
