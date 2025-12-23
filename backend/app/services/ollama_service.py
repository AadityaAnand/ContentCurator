import httpx
import asyncio
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import settings
import logging
import re

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with Ollama API"""

    def __init__(self):
        self.base_url = settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self.embedding_model = settings.OLLAMA_EMBEDDING_MODEL
        self.timeout = 120.0  # 2 minutes for long operations
        self.max_chunk_size = 4000  # Maximum characters per chunk

    def _chunk_text(self, text: str, max_size: int = None) -> List[str]:
        """
        Intelligently chunk text into smaller pieces that respect word boundaries.

        Args:
            text: Text to chunk
            max_size: Maximum size of each chunk (defaults to self.max_chunk_size)

        Returns:
            List of text chunks
        """
        if max_size is None:
            max_size = self.max_chunk_size

        # If text is small enough, return as is
        if len(text) <= max_size:
            return [text]

        chunks = []
        current_chunk = ""

        # Split by paragraphs first (double newlines)
        paragraphs = re.split(r'\n\n+', text)

        for paragraph in paragraphs:
            # If adding this paragraph would exceed max_size
            if len(current_chunk) + len(paragraph) + 2 > max_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""

                # If paragraph itself is too large, split by sentences
                if len(paragraph) > max_size:
                    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                    for sentence in sentences:
                        if len(current_chunk) + len(sentence) + 1 > max_size:
                            if current_chunk:
                                chunks.append(current_chunk.strip())
                            current_chunk = sentence
                        else:
                            current_chunk += " " + sentence if current_chunk else sentence
                else:
                    current_chunk = paragraph
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph

        # Add remaining chunk
        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_chat_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Generate a chat completion using Ollama.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt for context
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result["message"]["content"]
        except Exception as e:
            logger.error(f"Ollama chat completion error: {e}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embeddings for text using Ollama.
        For very long text, uses first chunk to avoid embedding failures.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        try:
            # Limit embedding text to avoid failures with very long content
            # Most embedding models have token limits (e.g., 512 tokens ≈ 2000 chars)
            embedding_text = text
            if len(text) > 8000:
                logger.info(f"Text too long for embedding ({len(text)} chars), using first chunk")
                chunks = self._chunk_text(text, max_size=8000)
                embedding_text = chunks[0]

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.embedding_model,
                        "prompt": embedding_text
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result["embedding"]
        except Exception as e:
            logger.error(f"Ollama embedding error: {e}")
            raise
    
    async def generate_executive_summary(self, content: str) -> str:
        """Generate a 2-3 sentence executive summary"""
        # Chunk the content if it's too long
        chunks = self._chunk_text(content, max_size=4000)

        # If single chunk, process directly
        if len(chunks) == 1:
            prompt = f"""Summarize the following content in 2-3 concise sentences.
Focus on the most important information and main takeaway.

Content:
{chunks[0]}

Executive Summary:"""

            return await self.generate_chat_completion(
                prompt=prompt,
                system_prompt="You are a skilled content summarizer. Provide clear, concise summaries.",
                temperature=0.5,
                max_tokens=150
            )

        # Multiple chunks: summarize each chunk then combine
        logger.info(f"Content too long ({len(content)} chars), processing {len(chunks)} chunks")
        chunk_summaries = await asyncio.gather(*[
            self.generate_chat_completion(
                prompt=f"Summarize this in 1-2 sentences:\n\n{chunk}",
                system_prompt="You are a skilled content summarizer.",
                temperature=0.5,
                max_tokens=100
            )
            for chunk in chunks[:3]  # Limit to first 3 chunks for executive summary
        ])

        # Combine chunk summaries into final executive summary
        combined = " ".join(chunk_summaries)
        if len(combined) > 500:  # If still too long, re-summarize
            prompt = f"""Combine these summaries into 2-3 concise sentences:

{combined}

Final Executive Summary:"""
            return await self.generate_chat_completion(
                prompt=prompt,
                system_prompt="You are a skilled content summarizer.",
                temperature=0.5,
                max_tokens=150
            )

        return combined
    
    async def generate_full_summary(self, content: str) -> str:
        """Generate a comprehensive paragraph summary"""
        # Chunk the content if it's too long
        chunks = self._chunk_text(content, max_size=6000)

        # If single chunk, process directly
        if len(chunks) == 1:
            prompt = f"""Write a comprehensive summary of the following content in one detailed paragraph (5-7 sentences).
Include key points, main arguments, and important details.

Content:
{chunks[0]}

Full Summary:"""

            return await self.generate_chat_completion(
                prompt=prompt,
                system_prompt="You are a skilled content summarizer. Provide thorough, informative summaries.",
                temperature=0.5,
                max_tokens=300
            )

        # Multiple chunks: summarize each chunk then combine
        logger.info(f"Generating full summary for {len(chunks)} chunks")
        chunk_summaries = await asyncio.gather(*[
            self.generate_chat_completion(
                prompt=f"Provide a detailed summary (2-3 sentences) of this content:\n\n{chunk}",
                system_prompt="You are a skilled content summarizer.",
                temperature=0.5,
                max_tokens=200
            )
            for chunk in chunks[:5]  # Limit to first 5 chunks
        ])

        # Combine chunk summaries into cohesive paragraph
        combined = " ".join(chunk_summaries)
        if len(combined) > 1000:  # If too long, condense
            prompt = f"""Synthesize these summaries into one cohesive paragraph (5-7 sentences):

{combined}

Final Summary:"""
            return await self.generate_chat_completion(
                prompt=prompt,
                system_prompt="You are a skilled content summarizer.",
                temperature=0.5,
                max_tokens=400
            )

        return combined
    
    async def extract_key_points(self, content: str) -> List[str]:
        """Extract 5-7 key points from content"""
        # Chunk the content if it's too long
        chunks = self._chunk_text(content, max_size=6000)

        # If single chunk, process directly
        if len(chunks) == 1:
            prompt = f"""Extract 5-7 key points from the following content.
Format each point as a concise bullet point (one line each).
Return ONLY the bullet points, one per line, starting with a dash (-).

Content:
{chunks[0]}

Key Points:"""

            response = await self.generate_chat_completion(
                prompt=prompt,
                system_prompt="You are a skilled content analyzer. Extract the most important points.",
                temperature=0.5,
                max_tokens=400
            )
        else:
            # Multiple chunks: extract points from each, then combine
            logger.info(f"Extracting key points from {len(chunks)} chunks")
            chunk_points = await asyncio.gather(*[
                self.generate_chat_completion(
                    prompt=f"Extract 2-3 key points from this content. Return only bullet points starting with '-':\n\n{chunk}",
                    system_prompt="You are a skilled content analyzer.",
                    temperature=0.5,
                    max_tokens=200
                )
                for chunk in chunks[:4]  # Limit to first 4 chunks
            ])

            # Combine all points
            response = "\n".join(chunk_points)

        # Parse bullet points
        points = []
        for line in response.strip().split('\n'):
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*')):
                # Remove bullet point character
                point = line[1:].strip()
                if point and len(points) < 7:  # Limit while parsing
                    points.append(point)

        # Ensure we have at least one point
        if len(points) == 0:
            logger.warning("No key points extracted, using default")
            points = ["Summary not available"]
        elif len(points) < 5:
            logger.warning(f"Only extracted {len(points)} key points, expected 5-7")

        return points[:7]  # Limit to 7
    
    async def categorize_content(self, title: str, content: str) -> List[str]:
        """Auto-categorize content into topics"""
        # Use first chunk only for categorization (title is usually most indicative)
        chunks = self._chunk_text(content, max_size=3000)
        content_sample = chunks[0] if chunks else content[:3000]

        prompt = f"""Analyze the following article and assign 1-3 relevant categories/topics.
Choose from common technology and knowledge categories like: AI, Machine Learning, Programming,
Web Development, Cybersecurity, Startups, Science, Business, Finance, Health, Education, etc.

Return ONLY the category names, separated by commas, nothing else.

Title: {title}

Content:
{content_sample}

Categories:"""

        response = await self.generate_chat_completion(
            prompt=prompt,
            system_prompt="You are a content categorization expert.",
            temperature=0.3,
            max_tokens=50
        )

        # Parse categories
        categories = [cat.strip() for cat in response.strip().split(',')]
        categories = [cat for cat in categories if cat and len(cat) < 50]

        return categories[:3]  # Limit to 3
    
    async def process_article_content(
        self,
        title: str,
        content: str
    ) -> Dict[str, Any]:
        """
        Process article content to generate all AI-powered fields.
        This runs all operations in parallel for efficiency.
        
        Returns:
            Dict with executive_summary, full_summary, key_points, categories
        """
        try:
            # Run all operations in parallel
            results = await asyncio.gather(
                self.generate_executive_summary(content),
                self.generate_full_summary(content),
                self.extract_key_points(content),
                self.categorize_content(title, content),
                return_exceptions=True
            )
            
            # Check for errors
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Error in parallel operation {i}: {result}")
                    # Provide defaults for failed operations
                    if i == 0:
                        results[i] = "Summary generation failed."
                    elif i == 1:
                        results[i] = "Detailed summary generation failed."
                    elif i == 2:
                        results[i] = ["Summary not available"]
                    elif i == 3:
                        results[i] = ["Uncategorized"]
            
            return {
                "executive_summary": results[0],
                "full_summary": results[1],
                "key_points": results[2],
                "categories": results[3]
            }
        except Exception as e:
            logger.error(f"Error processing article content: {e}")
            raise


# Global instance
ollama_service = OllamaService()
