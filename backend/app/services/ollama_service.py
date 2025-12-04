import httpx
import asyncio
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with Ollama API"""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self.embedding_model = settings.OLLAMA_EMBEDDING_MODEL
        self.timeout = 120.0  # 2 minutes for long operations
    
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
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.embedding_model,
                        "prompt": text
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
        prompt = f"""Summarize the following content in 2-3 concise sentences. 
Focus on the most important information and main takeaway.

Content:
{content[:4000]}

Executive Summary:"""
        
        return await self.generate_chat_completion(
            prompt=prompt,
            system_prompt="You are a skilled content summarizer. Provide clear, concise summaries.",
            temperature=0.5,
            max_tokens=150
        )
    
    async def generate_full_summary(self, content: str) -> str:
        """Generate a comprehensive paragraph summary"""
        prompt = f"""Write a comprehensive summary of the following content in one detailed paragraph (5-7 sentences).
Include key points, main arguments, and important details.

Content:
{content[:6000]}

Full Summary:"""
        
        return await self.generate_chat_completion(
            prompt=prompt,
            system_prompt="You are a skilled content summarizer. Provide thorough, informative summaries.",
            temperature=0.5,
            max_tokens=300
        )
    
    async def extract_key_points(self, content: str) -> List[str]:
        """Extract 5-7 key points from content"""
        prompt = f"""Extract 5-7 key points from the following content.
Format each point as a concise bullet point (one line each).
Return ONLY the bullet points, one per line, starting with a dash (-).

Content:
{content[:6000]}

Key Points:"""
        
        response = await self.generate_chat_completion(
            prompt=prompt,
            system_prompt="You are a skilled content analyzer. Extract the most important points.",
            temperature=0.5,
            max_tokens=400
        )
        
        # Parse bullet points
        points = []
        for line in response.strip().split('\n'):
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*')):
                # Remove bullet point character
                point = line[1:].strip()
                if point:
                    points.append(point)
        
        # Ensure we have 5-7 points
        if len(points) < 5:
            logger.warning(f"Only extracted {len(points)} key points, expected 5-7")
        
        return points[:7]  # Limit to 7
    
    async def categorize_content(self, title: str, content: str) -> List[str]:
        """Auto-categorize content into topics"""
        prompt = f"""Analyze the following article and assign 1-3 relevant categories/topics.
Choose from common technology and knowledge categories like: AI, Machine Learning, Programming, 
Web Development, Cybersecurity, Startups, Science, Business, Finance, Health, Education, etc.

Return ONLY the category names, separated by commas, nothing else.

Title: {title}

Content:
{content[:3000]}

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
