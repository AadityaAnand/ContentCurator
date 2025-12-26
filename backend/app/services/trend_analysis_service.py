"""Trend analysis and forecasting service."""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from collections import defaultdict
import statistics

from app.models import Article, Category, Trend

logger = logging.getLogger(__name__)


class TrendAnalysisService:
    """Service for analyzing and forecasting content trends."""

    def analyze_topic_trends(
        self,
        db: Session,
        days: int = 30,
        min_articles: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Analyze trending topics based on article velocity and volume.

        Args:
            db: Database session
            days: Number of days to analyze
            min_articles: Minimum articles required for trend

        Returns:
            List of trending topics with metrics
        """
        since = datetime.utcnow() - timedelta(days=days)
        midpoint = datetime.utcnow() - timedelta(days=days // 2)

        # Get category data for both periods
        recent_counts = {}
        older_counts = {}

        # Recent period (last half)
        recent_results = db.query(
            Category.id,
            Category.name,
            func.count(Article.id).label('count')
        ).join(
            Article.categories
        ).filter(
            Article.created_at >= midpoint
        ).group_by(
            Category.id,
            Category.name
        ).all()

        for cat_id, cat_name, count in recent_results:
            recent_counts[cat_id] = {'name': cat_name, 'count': count}

        # Older period (first half)
        older_results = db.query(
            Category.id,
            func.count(Article.id).label('count')
        ).join(
            Article.categories
        ).filter(
            and_(
                Article.created_at >= since,
                Article.created_at < midpoint
            )
        ).group_by(
            Category.id
        ).all()

        for cat_id, count in older_results:
            older_counts[cat_id] = count

        # Calculate trends
        trends = []
        for cat_id, recent_data in recent_counts.items():
            recent_count = recent_data['count']
            older_count = older_counts.get(cat_id, 0)

            # Skip if too few articles
            if recent_count + older_count < min_articles:
                continue

            # Calculate velocity (rate of change)
            if older_count > 0:
                velocity = ((recent_count - older_count) / older_count) * 100
            else:
                velocity = 100.0 if recent_count > 0 else 0.0

            # Calculate confidence based on volume
            confidence = min(1.0, (recent_count + older_count) / 20.0)

            # Determine trend direction
            if velocity > 20:
                direction = 'rising'
            elif velocity < -20:
                direction = 'falling'
            else:
                direction = 'stable'

            trends.append({
                'category_id': cat_id,
                'category_name': recent_data['name'],
                'recent_volume': recent_count,
                'previous_volume': older_count,
                'velocity': round(velocity, 2),
                'confidence': round(confidence, 2),
                'direction': direction,
                'total_volume': recent_count + older_count
            })

        # Sort by absolute velocity (highest change first)
        trends.sort(key=lambda x: abs(x['velocity']), reverse=True)

        return trends

    def forecast_category_volume(
        self,
        db: Session,
        category_id: int,
        forecast_days: int = 7
    ) -> Dict[str, Any]:
        """
        Forecast future article volume for a category using simple linear regression.

        Args:
            db: Database session
            category_id: Category ID to forecast
            forecast_days: Number of days to forecast ahead

        Returns:
            Forecast data with predicted volumes
        """
        # Get historical data (last 30 days)
        since = datetime.utcnow() - timedelta(days=30)

        results = db.query(
            func.date(Article.created_at).label('date'),
            func.count(Article.id).label('count')
        ).join(
            Article.categories
        ).filter(
            and_(
                Category.id == category_id,
                Article.created_at >= since
            )
        ).group_by(
            func.date(Article.created_at)
        ).order_by('date').all()

        if len(results) < 7:
            return {
                'category_id': category_id,
                'error': 'Insufficient historical data (need at least 7 days)',
                'forecast': []
            }

        # Convert to time series
        time_series = []
        for i, (date, count) in enumerate(results):
            time_series.append({'day': i, 'count': count, 'date': str(date)})

        # Simple linear regression
        n = len(time_series)
        x_values = [item['day'] for item in time_series]
        y_values = [item['count'] for item in time_series]

        x_mean = statistics.mean(x_values)
        y_mean = statistics.mean(y_values)

        # Calculate slope and intercept
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
        denominator = sum((x - x_mean) ** 2 for x in x_values)

        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator

        intercept = y_mean - slope * x_mean

        # Generate forecast
        forecast = []
        last_day = n
        for i in range(forecast_days):
            day = last_day + i
            predicted_value = max(0, slope * day + intercept)  # Can't have negative articles
            forecast_date = datetime.utcnow() + timedelta(days=i)

            forecast.append({
                'date': forecast_date.strftime('%Y-%m-%d'),
                'predicted_volume': round(predicted_value, 1),
                'confidence': max(0.3, 1.0 - (i / forecast_days) * 0.5)  # Confidence decreases over time
            })

        # Calculate trend strength
        if slope > 0.5:
            trend_direction = 'increasing'
        elif slope < -0.5:
            trend_direction = 'decreasing'
        else:
            trend_direction = 'stable'

        return {
            'category_id': category_id,
            'historical_days': n,
            'trend_direction': trend_direction,
            'slope': round(slope, 3),
            'avg_daily_volume': round(y_mean, 1),
            'forecast_days': forecast_days,
            'forecast': forecast,
            'historical_data': time_series[-7:]  # Last 7 days for reference
        }

    def detect_emerging_topics(
        self,
        db: Session,
        days: int = 14,
        min_velocity: float = 50.0
    ) -> List[Dict[str, Any]]:
        """
        Detect rapidly emerging topics that are gaining traction.

        Args:
            db: Database session
            days: Number of days to analyze
            min_velocity: Minimum growth rate (%) to be considered emerging

        Returns:
            List of emerging topics
        """
        trends = self.analyze_topic_trends(db, days=days, min_articles=2)

        # Filter for emerging topics
        emerging = [
            trend for trend in trends
            if trend['velocity'] >= min_velocity and trend['direction'] == 'rising'
        ]

        # Enrich with additional context
        for topic in emerging:
            # Get recent articles for this topic
            recent_articles = db.query(Article).join(
                Article.categories
            ).filter(
                Category.id == topic['category_id']
            ).order_by(
                Article.created_at.desc()
            ).limit(5).all()

            topic['recent_article_count'] = len(recent_articles)
            topic['latest_articles'] = [
                {
                    'id': art.id,
                    'title': art.title,
                    'created_at': art.created_at.isoformat() if art.created_at else None
                }
                for art in recent_articles
            ]

        return emerging

    def calculate_topic_momentum(
        self,
        db: Session,
        category_id: int,
        window_days: int = 7
    ) -> Dict[str, Any]:
        """
        Calculate momentum score for a topic based on recent activity.

        Momentum considers:
        - Volume (how many articles)
        - Velocity (rate of increase)
        - Acceleration (change in velocity)

        Args:
            db: Database session
            category_id: Category ID
            window_days: Days to analyze per period

        Returns:
            Momentum metrics
        """
        now = datetime.utcnow()

        # Define three periods
        period1_start = now - timedelta(days=window_days * 3)
        period1_end = now - timedelta(days=window_days * 2)

        period2_start = period1_end
        period2_end = now - timedelta(days=window_days)

        period3_start = period2_end
        period3_end = now

        # Count articles in each period
        def get_count(start, end):
            return db.query(func.count(Article.id)).join(
                Article.categories
            ).filter(
                and_(
                    Category.id == category_id,
                    Article.created_at >= start,
                    Article.created_at < end
                )
            ).scalar() or 0

        count1 = get_count(period1_start, period1_end)
        count2 = get_count(period2_start, period2_end)
        count3 = get_count(period3_start, period3_end)

        # Calculate velocity (rate of change)
        velocity1 = ((count2 - count1) / max(count1, 1)) * 100
        velocity2 = ((count3 - count2) / max(count2, 1)) * 100

        # Calculate acceleration (change in velocity)
        acceleration = velocity2 - velocity1

        # Calculate momentum score (0-100)
        volume_score = min(count3 / 10.0, 1.0) * 40  # Max 40 points for volume
        velocity_score = min(max(velocity2, 0) / 100.0, 1.0) * 40  # Max 40 points for velocity
        acceleration_score = min(max(acceleration, 0) / 50.0, 1.0) * 20  # Max 20 points for acceleration

        momentum_score = volume_score + velocity_score + acceleration_score

        return {
            'category_id': category_id,
            'momentum_score': round(momentum_score, 1),
            'volume': count3,
            'velocity': round(velocity2, 2),
            'acceleration': round(acceleration, 2),
            'periods': {
                'oldest': count1,
                'middle': count2,
                'recent': count3
            },
            'window_days': window_days
        }

    def get_trending_summary(
        self,
        db: Session,
        days: int = 14
    ) -> Dict[str, Any]:
        """
        Get comprehensive trending summary for dashboard.

        Args:
            db: Database session
            days: Number of days to analyze

        Returns:
            Summary with top trends, emerging topics, and hot topics
        """
        # Get overall trends
        all_trends = self.analyze_topic_trends(db, days=days)

        # Get emerging topics
        emerging = self.detect_emerging_topics(db, days=days)

        # Calculate momentum for top categories
        hot_topics = []
        for trend in all_trends[:10]:
            momentum = self.calculate_topic_momentum(db, trend['category_id'])
            if momentum['momentum_score'] > 30:
                hot_topics.append({
                    **trend,
                    'momentum_score': momentum['momentum_score']
                })

        # Sort hot topics by momentum
        hot_topics.sort(key=lambda x: x['momentum_score'], reverse=True)

        return {
            'period_days': days,
            'generated_at': datetime.utcnow().isoformat(),
            'summary': {
                'total_trending_topics': len(all_trends),
                'emerging_topics_count': len(emerging),
                'hot_topics_count': len(hot_topics)
            },
            'top_trends': all_trends[:10],
            'emerging_topics': emerging[:5],
            'hot_topics': hot_topics[:5]
        }


# Global instance
trend_analysis_service = TrendAnalysisService()
