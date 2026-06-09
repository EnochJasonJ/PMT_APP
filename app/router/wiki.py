from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DBSessionDep
from app.core.rbac import manager_required, member_required
from app.schema.wiki import WikiCreate, WikiResponse, WikiUpdate
from app.service.wiki import wiki_service

router = APIRouter(prefix="/wiki", tags=["Wiki"])


@router.get("/project/{project_id}", response_model=list[WikiResponse], dependencies=[Depends(member_required)])
async def list_wiki(project_id: int, db: DBSessionDep):
    """List wiki pages for a project."""
    return await wiki_service.list_for_project(db, project_id)


@router.post("/", response_model=WikiResponse, status_code=status.HTTP_201_CREATED)
async def create_wiki(page_in: WikiCreate, db: DBSessionDep, current_user=Depends(member_required)):
    return await wiki_service.create(db, page_in, current_user.id)


@router.patch("/{page_id}", response_model=WikiResponse, dependencies=[Depends(member_required)])
async def update_wiki(page_id: int, page_in: WikiUpdate, db: DBSessionDep):
    page = await wiki_service.get_by_id(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    return await wiki_service.update(db, page, page_in)


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_wiki(page_id: int, db: DBSessionDep):
    page = await wiki_service.get_by_id(db, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Wiki page not found")
    await wiki_service.delete(db, page)
    return None
