import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Optional, AsyncIterator
import json


class BranchStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"


class JobStatus(str, Enum):
    CREATED = "created"
    SAMPLING = "sampling"
    AGGREGATING = "aggregating"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class BranchState:
    id: str
    status: BranchStatus = BranchStatus.PENDING
    text: str = ""
    result: Optional[dict] = None
    error: Optional[str] = None
    word_count: int = 0

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "word_count": self.word_count,
            "error": self.error,
            "has_result": self.result is not None,
        }


@dataclass
class JobState:
    id: str
    motion: str
    stance: str
    format: str
    n_branches: int
    model: str
    api_key: str
    api_url: str
    parallel: int
    status: JobStatus = JobStatus.CREATED
    branches: Dict[str, BranchState] = field(default_factory=dict)
    final_casebook_md: Optional[str] = None
    final_casebook_json: Optional[dict] = None
    error: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    # Internal: subscribers get events from this queue
    _event_queues: list = field(default_factory=list)

    def to_dict(self):
        completed = sum(1 for b in self.branches.values() if b.status == BranchStatus.COMPLETE)
        errored = sum(1 for b in self.branches.values() if b.status == BranchStatus.ERROR)
        return {
            "id": self.id,
            "motion": self.motion,
            "stance": self.stance,
            "format": self.format,
            "n_branches": self.n_branches,
            "status": self.status,
            "branches": {bid: b.to_dict() for bid, b in self.branches.items()},
            "progress": {"completed": completed, "errored": errored, "total": self.n_branches},
            "has_result": self.final_casebook_md is not None,
            "created_at": self.created_at,
        }


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobState] = {}

    def create_job(
        self, motion, stance, format, n_branches, model, api_key, api_url, parallel=5
    ) -> str:
        job_id = str(uuid.uuid4())[:8]
        job = JobState(
            id=job_id,
            motion=motion,
            stance=stance,
            format=format,
            n_branches=n_branches,
            model=model,
            api_key=api_key,
            api_url=api_url,
            parallel=parallel,
        )
        for i in range(n_branches):
            branch_id = f"{i + 1:03d}"
            job.branches[branch_id] = BranchState(id=branch_id)
        self._jobs[job_id] = job
        return job_id

    def get_job(self, job_id: str) -> Optional[JobState]:
        return self._jobs.get(job_id)

    async def emit(self, job_id: str, event: dict):
        job = self._jobs.get(job_id)
        if not job:
            return
        data = json.dumps(event, ensure_ascii=False)
        for q in job._event_queues:
            await q.put(data)

    async def stream_events(self, job_id: str) -> AsyncIterator[str]:
        job = self._jobs.get(job_id)
        if not job:
            yield json.dumps({"type": "error", "message": "job not found"})
            return

        q: asyncio.Queue = asyncio.Queue()
        job._event_queues.append(q)

        # Send current snapshot first
        yield json.dumps({"type": "job_state", "data": job.to_dict()}, ensure_ascii=False)

        try:
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=60.0)
                    yield data
                    event = json.loads(data)
                    if event.get("type") in ("job_complete", "job_error"):
                        break
                except asyncio.TimeoutError:
                    yield json.dumps({"type": "ping"})
        finally:
            job._event_queues.remove(q)


job_manager = JobManager()
