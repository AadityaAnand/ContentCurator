"""Email service for sending digests and notifications."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM or settings.SMTP_USER

    def is_configured(self) -> bool:
        """Check if SMTP is properly configured."""
        return all([
            self.smtp_host,
            self.smtp_user,
            self.smtp_password,
            self.smtp_from
        ])

    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email via SMTP.

        Args:
            to: Recipient email address
            subject: Email subject
            html_content: HTML body of the email
            text_content: Plain text alternative (optional)

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("SMTP not configured, skipping email send")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_from
            msg['To'] = to

            # Add plain text alternative if provided
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)

            # Add HTML content
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False

    async def send_digest_email(
        self,
        to: str,
        user_name: str,
        digest_title: str,
        digest_content: str,
        article_count: int,
        topics: List[str],
        period_start: str,
        period_end: str
    ) -> bool:
        """
        Send a formatted digest email.

        Args:
            to: Recipient email
            user_name: User's display name
            digest_title: Title of the digest
            digest_content: Main digest content (HTML)
            article_count: Number of articles in digest
            topics: List of topics covered
            period_start: Start date of digest period
            period_end: End date of digest period

        Returns:
            bool: Success status
        """
        subject = f"Your Content Digest: {digest_title}"

        # Create HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }}
                .container {{
                    background-color: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    border-bottom: 3px solid #4F46E5;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                h1 {{
                    color: #4F46E5;
                    margin: 0 0 10px 0;
                    font-size: 28px;
                }}
                .meta {{
                    color: #666;
                    font-size: 14px;
                    margin-top: 10px;
                }}
                .meta span {{
                    margin-right: 15px;
                }}
                .topics {{
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin: 20px 0;
                }}
                .topic-tag {{
                    background-color: #EEF2FF;
                    color: #4F46E5;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 13px;
                }}
                .content {{
                    margin: 30px 0;
                    line-height: 1.8;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e5e5;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .button:hover {{
                    background-color: #4338CA;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{digest_title}</h1>
                    <div class="meta">
                        <span>📅 {period_start} - {period_end}</span>
                        <span>📰 {article_count} articles</span>
                    </div>
                </div>

                <p>Hi {user_name},</p>
                <p>Here's your personalized content digest with the latest updates from your followed topics.</p>

                {f'''
                <div class="topics">
                    <strong>Topics Covered:</strong>
                    {"".join([f'<span class="topic-tag">{topic}</span>' for topic in topics])}
                </div>
                ''' if topics else ''}

                <div class="content">
                    {digest_content}
                </div>

                <div style="text-align: center;">
                    <a href="{settings.FRONTEND_URL or 'http://localhost:3000'}" class="button">
                        View All Articles
                    </a>
                </div>

                <div class="footer">
                    <p>You're receiving this email because you subscribed to {digest_title.split(':')[0].lower()} digests.</p>
                    <p>To change your preferences, visit your <a href="{settings.FRONTEND_URL or 'http://localhost:3000'}/profile">profile settings</a>.</p>
                    <p>&copy; {period_start.split('-')[0]} Content Curator. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Create plain text version
        text_content = f"""
{digest_title}
{period_start} - {period_end} | {article_count} articles

Hi {user_name},

Here's your personalized content digest with the latest updates from your followed topics.

{f"Topics Covered: {', '.join(topics)}" if topics else ''}

{digest_content}

View all articles at: {settings.FRONTEND_URL or 'http://localhost:3000'}

---
You're receiving this email because you subscribed to {digest_title.split(':')[0].lower()} digests.
To change your preferences, visit your profile settings.
        """

        return await self.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
