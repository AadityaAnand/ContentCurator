"""Service for generating personalized content digests."""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.models import User, Article, Digest, Category
from app.services.email_service import EmailService
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)


class DigestService:
    """Service for creating and sending content digests."""

    def __init__(self):
        self.email_service = EmailService()
        self.ollama_service = OllamaService()

    async def generate_digest(
        self,
        user: User,
        db: Session,
        digest_type: str = 'daily',
        custom_period_days: Optional[int] = None
    ) -> Optional[Digest]:
        """
        Generate a personalized digest for a user.

        Args:
            user: User object
            db: Database session
            digest_type: Type of digest ('daily', 'weekly', 'custom')
            custom_period_days: Custom period in days (for 'custom' type)

        Returns:
            Digest object if created, None otherwise
        """
        # Check if user wants digests
        if user.digest_frequency == 'none':
            logger.info(f"User {user.id} has digests disabled")
            return None

        # Determine time period
        period_end = datetime.utcnow()
        if digest_type == 'daily':
            period_start = period_end - timedelta(days=1)
        elif digest_type == 'weekly':
            period_start = period_end - timedelta(days=7)
        elif digest_type == 'custom' and custom_period_days:
            period_start = period_end - timedelta(days=custom_period_days)
        else:
            logger.error(f"Invalid digest type: {digest_type}")
            return None

        # Fetch articles from the period
        query = db.query(Article).filter(
            Article.created_at >= period_start,
            Article.created_at <= period_end
        )

        # Filter by followed topics if user has any
        if user.followed_topics:
            category_ids = [cat.id for cat in user.followed_topics]
            query = query.join(Article.categories).filter(
                Category.id.in_(category_ids)
            )

        # Get articles ordered by date
        articles = query.order_by(desc(Article.created_at)).limit(50).all()

        if not articles:
            logger.info(f"No articles found for user {user.id} digest")
            return None

        # Generate digest content
        digest_content = await self._generate_digest_content(articles, user)

        # Extract topics covered
        topics_covered = list(set([
            cat.name
            for article in articles
            for cat in article.categories
        ]))

        # Create digest title
        title = self._generate_digest_title(digest_type, topics_covered)

        # Create digest record
        digest = Digest(
            user_id=user.id,
            title=title,
            content=digest_content,
            digest_type=digest_type,
            period_start=period_start,
            period_end=period_end,
            article_count=len(articles),
            topics_covered=topics_covered
        )
        db.add(digest)
        db.commit()
        db.refresh(digest)

        logger.info(f"Generated digest {digest.id} for user {user.id}")
        return digest

    async def _generate_digest_content(
        self,
        articles: List[Article],
        user: User
    ) -> str:
        """
        Generate synthesized digest content from articles using Ollama.

        Args:
            articles: List of articles to include
            user: User object for personalization

        Returns:
            HTML formatted digest content
        """
        # Group articles by category
        articles_by_category: Dict[str, List[Article]] = {}
        for article in articles:
            for category in article.categories:
                if category.name not in articles_by_category:
                    articles_by_category[category.name] = []
                articles_by_category[category.name].append(article)

        # Generate content sections
        sections = []

        for category_name, cat_articles in articles_by_category.items():
            # Limit to top 10 articles per category
            cat_articles = cat_articles[:10]

            # Create summaries for synthesis
            article_summaries = []
            for article in cat_articles:
                summary_text = ""
                if article.summary:
                    summary_text = article.summary.executive_summary or article.title
                else:
                    summary_text = article.title

                article_summaries.append({
                    'title': article.title,
                    'url': article.url,
                    'summary': summary_text,
                    'published_at': article.published_at.strftime('%Y-%m-%d') if article.published_at else 'Recent'
                })

            # Generate category synthesis using Ollama
            synthesis = await self._synthesize_category_articles(
                category_name,
                article_summaries
            )

            # Create HTML section
            articles_html = "\n".join([
                f"""
                <div style="margin: 15px 0; padding: 15px; background-color: #f9fafb; border-left: 3px solid #4F46E5; border-radius: 4px;">
                    <h4 style="margin: 0 0 8px 0; color: #1f2937;">
                        <a href="{art['url']}" style="color: #1f2937; text-decoration: none;">{art['title']}</a>
                    </h4>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">{art['summary']}</p>
                    <small style="color: #9ca3af;">{art['published_at']}</small>
                </div>
                """
                for art in article_summaries
            ])

            section_html = f"""
            <div style="margin: 30px 0;">
                <h2 style="color: #4F46E5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    {category_name}
                </h2>
                <p style="margin: 15px 0; line-height: 1.8; color: #374151;">
                    {synthesis}
                </p>
                <div style="margin-top: 20px;">
                    <h3 style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">Featured Articles:</h3>
                    {articles_html}
                </div>
            </div>
            """
            sections.append(section_html)

        # Combine all sections
        digest_html = "\n".join(sections)

        # Add intro and outro
        intro = f"""
        <div style="margin-bottom: 30px;">
            <p style="font-size: 16px; line-height: 1.8; color: #374151;">
                We've curated <strong>{len(articles)} articles</strong> from your followed topics.
                Here's what's been happening:
            </p>
        </div>
        """

        outro = """
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280;">
                That's all for this digest! Stay curious and keep learning.
            </p>
        </div>
        """

        return intro + digest_html + outro

    async def _synthesize_category_articles(
        self,
        category_name: str,
        articles: List[Dict[str, Any]]
    ) -> str:
        """
        Use Ollama to synthesize multiple articles into a coherent overview.

        Args:
            category_name: Name of the category
            articles: List of article dictionaries with title and summary

        Returns:
            Synthesized overview text
        """
        # Create prompt for Ollama
        articles_text = "\n\n".join([
            f"- {art['title']}: {art['summary']}"
            for art in articles
        ])

        prompt = f"""Based on these recent {category_name} articles, write a brief 2-3 sentence overview of the key themes and developments in this topic area:

{articles_text}

Overview:"""

        try:
            synthesis = await self.ollama_service.generate_chat_completion(
                prompt=prompt,
                system_prompt="You are a skilled content curator. Synthesize multiple articles into clear, engaging overviews.",
                temperature=0.7,
                max_tokens=200
            )
            return synthesis.strip()
        except Exception as e:
            logger.error(f"Error synthesizing category {category_name}: {e}")
            # Fallback to simple summary
            return f"This section covers {len(articles)} recent articles about {category_name}."

    def _generate_digest_title(
        self,
        digest_type: str,
        topics: List[str]
    ) -> str:
        """Generate a friendly digest title."""
        type_label = {
            'daily': 'Daily',
            'weekly': 'Weekly',
            'custom': 'Custom'
        }.get(digest_type, 'Content')

        if topics:
            # Show first 3 topics
            topic_str = ', '.join(topics[:3])
            if len(topics) > 3:
                topic_str += f" +{len(topics) - 3} more"
            return f"{type_label} Digest: {topic_str}"
        else:
            return f"Your {type_label} Content Digest"

    async def send_digest(
        self,
        digest: Digest,
        user: User,
        db: Session
    ) -> bool:
        """
        Send a digest via email.

        Args:
            digest: Digest object to send
            user: User to send to
            db: Database session

        Returns:
            bool: True if sent successfully
        """
        if not user.email_notifications:
            logger.info(f"User {user.id} has email notifications disabled")
            return False

        if not user.email:
            logger.warning(f"User {user.id} has no email address")
            return False

        # Send email
        success = await self.email_service.send_digest_email(
            to=user.email,
            user_name=user.full_name or user.username,
            digest_title=digest.title,
            digest_content=digest.content,
            article_count=digest.article_count,
            topics=digest.topics_covered or [],
            period_start=digest.period_start.strftime('%B %d, %Y'),
            period_end=digest.period_end.strftime('%B %d, %Y')
        )

        if success:
            # Update sent_at timestamp
            digest.sent_at = datetime.utcnow()
            db.commit()
            logger.info(f"Digest {digest.id} sent to user {user.id}")

        return success

    async def generate_and_send_digest(
        self,
        user: User,
        db: Session,
        digest_type: str = 'daily'
    ) -> Optional[Digest]:
        """
        Generate and send a digest in one operation.

        Args:
            user: User object
            db: Database session
            digest_type: Type of digest

        Returns:
            Digest object if created and sent, None otherwise
        """
        # Generate digest
        digest = await self.generate_digest(user, db, digest_type)

        if not digest:
            return None

        # Send digest
        await self.send_digest(digest, user, db)

        return digest

    async def send_digests_for_frequency(
        self,
        db: Session,
        frequency: str
    ) -> Dict[str, int]:
        """
        Send digests to all users with the specified frequency.

        Args:
            db: Database session
            frequency: Digest frequency ('daily' or 'weekly')

        Returns:
            Dict with stats about sent digests
        """
        # Get users with this frequency
        users = db.query(User).filter(
            User.digest_frequency == frequency,
            User.email_notifications == True
        ).all()

        stats = {
            'total_users': len(users),
            'digests_created': 0,
            'digests_sent': 0,
            'errors': 0
        }

        for user in users:
            try:
                digest = await self.generate_and_send_digest(
                    user=user,
                    db=db,
                    digest_type=frequency
                )

                if digest:
                    stats['digests_created'] += 1
                    if digest.sent_at:
                        stats['digests_sent'] += 1

            except Exception as e:
                logger.error(f"Error processing digest for user {user.id}: {e}")
                stats['errors'] += 1

        logger.info(f"Digest batch complete for frequency '{frequency}': {stats}")
        return stats
