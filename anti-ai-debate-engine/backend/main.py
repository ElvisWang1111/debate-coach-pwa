import asyncio
import json
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .job_manager import job_manager
from .orchestrator import run_job

app = FastAPI(title="Debate Casebook Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend
from pathlib import Path
_FRONTEND = Path(__file__).parent.parent / "frontend"
if _FRONTEND.exists():
    app.mount("/ui", StaticFiles(directory=str(_FRONTEND), html=True), name="frontend")


# ── Request models ───────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    motion: str
    stance: str
    format: str = "标准传辩"
    n_branches: int = 10
    parallel: int = 5
    model: str = "deepseek-chat"
    api_key: str
    api_url: str = ""


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/api/start")
async def start_job(req: StartRequest, background_tasks: BackgroundTasks):
    if not req.api_key:
        raise HTTPException(400, "api_key is required")
    if req.n_branches < 1 or req.n_branches > 50:
        raise HTTPException(400, "n_branches must be between 1 and 50")

    job_id = job_manager.create_job(
        motion=req.motion,
        stance=req.stance,
        format=req.format,
        n_branches=req.n_branches,
        model=req.model,
        api_key=req.api_key,
        api_url=req.api_url,
        parallel=min(req.parallel, req.n_branches),
    )
    background_tasks.add_task(run_job, job_id)
    return {"job_id": job_id}


@app.get("/api/stream/{job_id}")
async def stream_events(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")

    async def generator():
        async for event_json in job_manager.stream_events(job_id):
            yield f"data: {event_json}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/status/{job_id}")
async def job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job.to_dict()


@app.get("/api/result/{job_id}")
async def job_result(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    if not job.final_casebook_md:
        raise HTTPException(404, "result not ready")
    return {"casebook_md": job.final_casebook_md, "casebook_json": job.final_casebook_json}


@app.get("/api/download/{job_id}/md")
async def download_md(job_id: str):
    job = job_manager.get_job(job_id)
    if not job or not job.final_casebook_md:
        raise HTTPException(404, "not ready")
    filename = f"casebook_{job_id}.md"
    return Response(
        content=job.final_casebook_md.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/download/{job_id}/json")
async def download_json(job_id: str):
    job = job_manager.get_job(job_id)
    if not job or not job.final_casebook_json:
        raise HTTPException(404, "not ready")
    filename = f"casebook_{job_id}.json"
    content = json.dumps(job.final_casebook_json, ensure_ascii=False, indent=2)
    return Response(
        content=content.encode("utf-8"),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/download/{job_id}/txt")
async def download_txt(job_id: str):
    job = job_manager.get_job(job_id)
    if not job or not job.final_casebook_md:
        raise HTTPException(404, "not ready")
    # Strip markdown formatting for plain text
    import re
    text = re.sub(r"#{1,6}\s", "", job.final_casebook_md)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    filename = f"casebook_{job_id}.txt"
    return Response(
        content=text.encode("utf-8"),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/branch/{job_id}/{branch_id}")
async def get_branch(job_id: str, branch_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    branch = job.branches.get(branch_id)
    if not branch:
        raise HTTPException(404, "branch not found")
    return {
        "id": branch.id,
        "status": branch.status,
        "text": branch.text,
        "result": branch.result,
        "word_count": branch.word_count,
        "error": branch.error,
    }


@app.get("/")
async def root():
    return {"message": "Debate Casebook Engine. UI: /ui  API: /docs"}
