from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies import DBSessionDep
from app.core.security import create_access_token, verify_password
from app.service.user import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login")
async def login(
    db: DBSessionDep,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await UserService.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}
