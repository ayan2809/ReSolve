from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing import List

from database import get_session
from models import Problem, Attempt
from schemas import ProblemCreate, ProblemRead, AttemptCreate, AttemptRead
from services.scheduler_logic import generate_initial_schedules

router = APIRouter(prefix="/problems", tags=["problems"])

from auth import get_current_user_id

@router.post("", response_model=ProblemRead)
def create_problem(
    problem: ProblemCreate, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    # Include user_id when creating the Problem to satisfy required field
    db_problem = Problem(**problem.model_dump(), user_id=user_id)
    session.add(db_problem)
    session.commit()
    session.refresh(db_problem)
    return db_problem


@router.get("", response_model=List[ProblemRead])
def read_problems(
    offset: int = 0,
    limit: int = Query(default=100, le=100),
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    problems = session.exec(
        select(Problem)
        .where(Problem.user_id == user_id)
        .offset(offset)
        .limit(limit)
    ).all()
    return problems

@router.get("/{problem_id}", response_model=ProblemRead)
def read_problem(
    problem_id: int, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    problem = session.get(Problem, problem_id)
    if not problem or problem.user_id != user_id:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem

@router.post("/{problem_id}/attempts", response_model=AttemptRead)
def create_attempt(
    problem_id: int, 
    attempt_data: AttemptCreate, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    problem = session.get(Problem, problem_id)
    if not problem or problem.user_id != user_id:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Calculate attempt number
    count_statement = select(func.count()).where(Attempt.problem_id == problem_id)
    attempt_number = session.exec(count_statement).one() + 1
    
    # Create Attempt
    db_attempt = Attempt(
        problem_id=problem_id,
        user_id=user_id,
        attempt_number=attempt_number,
        **attempt_data.model_dump()
    )
    session.add(db_attempt)
    session.commit()
    session.refresh(db_attempt)
    
    # Check if this is the first SUCCESSFUL attempt to trigger schedules
    if db_attempt.solved:
        previous_success = session.exec(
            select(Attempt)
            .where(Attempt.problem_id == problem_id)
            .where(Attempt.solved == True)
            .where(Attempt.id != db_attempt.id)
        ).first()
        
        if not previous_success:
            generate_initial_schedules(session, problem_id, db_attempt.attempt_date.date())
            
    return db_attempt

@router.get("/{problem_id}/attempts", response_model=List[AttemptRead])
def read_attempts(
    problem_id: int, 
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id)
):
    # Verify ownership
    problem = session.get(Problem, problem_id)
    if not problem or problem.user_id != user_id:
        raise HTTPException(status_code=404, detail="Problem not found")

    attempts = session.exec(
        select(Attempt)
        .where(Attempt.problem_id == problem_id)
        .order_by(Attempt.attempt_date.desc())
    ).all()
    return attempts
