from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import AuthedActor, require_role
from db import crud

router = APIRouter(prefix="/api/org-config", tags=["org-config"])


@router.get("")
def get_org_config():
    return crud.read_org_config()


@router.put("")
def update_org_config(body: OrgConfigUpdate, actor: AuthedActor = Depends(require_role("admin"))):
    cfg = crud.read_org_config()
    if body.firm_name is not None:
        cfg["firm_name"] = body.firm_name
    if body.firm_type is not None:
        cfg["firm_type"] = body.firm_type
    if body.intermediary_classes is not None:
        cfg["intermediary_classes"] = body.intermediary_classes
    crud.write_org_config(cfg)
    return cfg


@router.get("/functional-areas")
def get_functional_areas():
    cfg = crud.read_org_config()
    return {"functional_areas": cfg.get("functional_areas", [])}


@router.put("/functional-areas")
def update_functional_areas(body: FunctionalAreasUpdate, actor: AuthedActor = Depends(require_role("admin"))):
    cfg = crud.read_org_config()
    cfg["functional_areas"] = body.functional_areas
    crud.write_org_config(cfg)
    return {"functional_areas": cfg["functional_areas"]}


class OrgConfigUpdate(BaseModel):
    firm_name: str | None = None
    firm_type: str | None = None
    intermediary_classes: list[str] | None = None


class FunctionalAreasUpdate(BaseModel):
    functional_areas: list[dict]
