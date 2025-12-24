#!/usr/bin/env python3
"""
Scheduler script to send email digests.

This script can be run as a cron job to automatically send digests:

Daily digests (run at 8 AM daily):
  0 8 * * * cd /path/to/backend && python scripts/send_digests.py daily

Weekly digests (run at 8 AM on Mondays):
  0 8 * * 1 cd /path/to/backend && python scripts/send_digests.py weekly
"""
import asyncio
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.services.digest_service import DigestService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def send_digests(frequency: str):
    """
    Send digests to all users with the specified frequency.

    Args:
        frequency: 'daily' or 'weekly'
    """
    if frequency not in ['daily', 'weekly']:
        logger.error(f"Invalid frequency: {frequency}. Must be 'daily' or 'weekly'")
        sys.exit(1)

    logger.info(f"Starting {frequency} digest batch send...")

    db = SessionLocal()
    digest_service = DigestService()

    try:
        stats = await digest_service.send_digests_for_frequency(db, frequency)

        logger.info(f"Digest batch complete!")
        logger.info(f"  Total users: {stats['total_users']}")
        logger.info(f"  Digests created: {stats['digests_created']}")
        logger.info(f"  Digests sent: {stats['digests_sent']}")
        logger.info(f"  Errors: {stats['errors']}")

        # Exit with error code if there were errors
        if stats['errors'] > 0:
            sys.exit(1)

    except Exception as e:
        logger.error(f"Fatal error during digest batch: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python send_digests.py <daily|weekly>")
        sys.exit(1)

    frequency = sys.argv[1].lower()
    asyncio.run(send_digests(frequency))
