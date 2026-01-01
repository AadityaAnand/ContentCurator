from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
import json
from app.database import get_db
from app.models import Conversation, Message
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    ConversationDetail,
    MessageResponse
)
from app.services.chat_service import chat_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Send a message and get a researched response.

    - If conversation_id is provided, continues existing conversation
    - If conversation_id is None, creates a new conversation
    - System researches the web and synthesizes an answer with sources
    """
    try:
        result = await chat_service.answer_question(
            question=request.message,
            conversation_id=request.conversation_id,
            db=db,
            max_sources=5
        )

        return ChatResponse(
            conversation_id=result["conversation_id"],
            message=MessageResponse.model_validate(result["message"])
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message"
        )


@router.post("/stream")
async def send_message_stream(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Send a message and get a streaming response (SSE format).

    - Streams the response as it's generated
    - Returns events: researching, generating, chunk, done, error
    """
    async def event_generator():
        try:
            # Send researching event
            yield f"data: {json.dumps({'type': 'researching'})}\n\n"

            # Get response with streaming
            async for event in chat_service.answer_question_stream(
                question=request.message,
                conversation_id=request.conversation_id,
                db=db,
                max_sources=5
            ):
                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            logger.error(f"Error in streaming chat: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    List recent conversations.
    """
    conversations = chat_service.list_conversations(db, limit=limit)

    # Add message count to each conversation
    result = []
    for conv in conversations:
        conv_response = ConversationResponse.model_validate(conv)
        conv_response.message_count = len(conv.messages)
        result.append(conv_response)

    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific conversation with all messages.
    """
    conversation = db.query(Conversation)\
        .options(joinedload(Conversation.messages))\
        .filter(Conversation.id == conversation_id)\
        .first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found"
        )

    return ConversationDetail.model_validate(conversation)


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a conversation and all its messages.
    """
    success = chat_service.delete_conversation(conversation_id, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found"
        )

    return {"message": "Conversation deleted successfully"}


@router.get("/sources")
async def get_chat_sources(
    conversation_id: int = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get unique sources from chat conversations.

    - If conversation_id is provided, returns sources only from that conversation
    - Otherwise, returns sources from all conversations
    """
    from sqlalchemy import func

    # Build query for messages with sources
    query = db.query(Message).filter(Message.sources.isnot(None))

    # Filter by conversation if specified
    if conversation_id:
        query = query.filter(Message.conversation_id == conversation_id)

    messages = query.order_by(Message.created_at.desc()).limit(limit).all()

    # Collect all unique sources
    sources_dict = {}
    for message in messages:
        if message.sources:
            for source in message.sources:
                url = source.get('url', '')
                if url and url not in sources_dict:
                    sources_dict[url] = {
                        'id': f"chat-{len(sources_dict) + 1}",
                        'title': source.get('title', 'Untitled'),
                        'url': url,
                        'snippet': source.get('snippet', ''),
                        'source_type': 'chat',
                        'created_at': message.created_at.isoformat(),
                        'conversation_id': message.conversation_id,
                        'message_id': message.id
                    }

    return list(sources_dict.values())


@router.get("/graph-data")
async def get_chat_graph_data(
    conversation_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get graph data for chat conversations showing relationships between messages.

    - If conversation_id is provided, returns graph only for that conversation
    - Otherwise, returns graph for recent conversations

    Returns nodes (messages/topics) and edges (conversation flow).
    """
    # Build query for conversations
    query = db.query(Conversation).options(joinedload(Conversation.messages))

    if conversation_id:
        # Get specific conversation
        query = query.filter(Conversation.id == conversation_id)
        conversations = query.all()
    else:
        # Get recent conversations
        conversations = query.order_by(Conversation.updated_at.desc()).limit(limit).all()

    nodes = []
    edges = []

    for conv in conversations:
        messages = sorted(conv.messages, key=lambda m: m.created_at)

        # Create nodes for each message
        for i, msg in enumerate(messages):
            if msg.role == 'assistant':
                # Create node for assistant messages (with sources)
                nodes.append({
                    'id': f'msg-{msg.id}',
                    'title': msg.research_query or msg.content[:50] + '...',
                    'type': 'assistant',
                    'conversation_id': conv.id,
                    'source_count': len(msg.sources) if msg.sources else 0
                })

                # Link to previous user message
                if i > 0:
                    edges.append({
                        'source': f'msg-{messages[i-1].id}',
                        'target': f'msg-{msg.id}',
                        'type': 'response'
                    })
            elif msg.role == 'user':
                nodes.append({
                    'id': f'msg-{msg.id}',
                    'title': msg.content[:50] + ('...' if len(msg.content) > 50 else ''),
                    'type': 'user',
                    'conversation_id': conv.id
                })

    return {
        'nodes': nodes,
        'edges': edges
    }


@router.get("/stats")
async def get_chat_stats(
    conversation_id: int = None,
    db: Session = Depends(get_db)
):
    """
    Get statistics about chat conversations.

    - If conversation_id is provided, returns stats only for that conversation
    - Otherwise, returns global stats for all conversations

    Returns:
    - Total conversations (or 1 if filtering by conversation)
    - Total messages
    - Total unique sources
    - Recent activity
    """
    from sqlalchemy import func
    from datetime import datetime, timedelta

    if conversation_id:
        # Stats for specific conversation
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")

        total_messages = db.query(func.count(Message.id))\
            .filter(Message.conversation_id == conversation_id)\
            .scalar() or 0

        # Count unique sources in this conversation
        messages_with_sources = db.query(Message)\
            .filter(Message.conversation_id == conversation_id)\
            .filter(Message.sources.isnot(None))\
            .all()
        unique_sources = set()
        for msg in messages_with_sources:
            if msg.sources:
                for source in msg.sources:
                    url = source.get('url')
                    if url:
                        unique_sources.add(url)

        # Research topics in this conversation
        research_queries = db.query(Message.research_query, func.count(Message.id).label('count'))\
            .filter(Message.conversation_id == conversation_id)\
            .filter(Message.research_query.isnot(None))\
            .group_by(Message.research_query)\
            .order_by(func.count(Message.id).desc())\
            .limit(10)\
            .all()

        return {
            'conversation_id': conversation_id,
            'total_conversations': 1,
            'total_messages': total_messages,
            'total_unique_sources': len(unique_sources),
            'created_at': conversation.created_at.isoformat(),
            'updated_at': conversation.updated_at.isoformat(),
            'top_research_topics': [
                {'query': q, 'count': c} for q, c in research_queries
            ]
        }
    else:
        # Global stats
        total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
        total_messages = db.query(func.count(Message.id)).scalar() or 0

        # Count unique sources
        messages_with_sources = db.query(Message).filter(Message.sources.isnot(None)).all()
        unique_sources = set()
        for msg in messages_with_sources:
            if msg.sources:
                for source in msg.sources:
                    url = source.get('url')
                    if url:
                        unique_sources.add(url)

        # Recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_conversations = db.query(func.count(Conversation.id))\
            .filter(Conversation.created_at >= week_ago)\
            .scalar() or 0
        recent_messages = db.query(func.count(Message.id))\
            .filter(Message.created_at >= week_ago)\
            .scalar() or 0

        # Top research topics (based on research queries)
        research_queries = db.query(Message.research_query, func.count(Message.id).label('count'))\
            .filter(Message.research_query.isnot(None))\
            .group_by(Message.research_query)\
            .order_by(func.count(Message.id).desc())\
            .limit(10)\
            .all()

        return {
            'total_conversations': total_conversations,
            'total_messages': total_messages,
            'total_unique_sources': len(unique_sources),
            'recent_activity': {
                'conversations_last_7_days': recent_conversations,
                'messages_last_7_days': recent_messages
            },
            'top_research_topics': [
                {'query': q, 'count': c} for q, c in research_queries
            ]
        }
