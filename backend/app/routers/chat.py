from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
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
