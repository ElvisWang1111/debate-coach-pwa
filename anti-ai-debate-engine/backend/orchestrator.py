"""
Parallel branch orchestration.
Runs N branches with a semaphore, then triggers aggregation.
"""
import asyncio

from .job_manager import job_manager, JobStatus
from .sampler import generate_branch
from .aggregator import run_aggregation


async def run_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        return

    job.status = JobStatus.SAMPLING
    await job_manager.emit(job_id, {
        "type": "sampling_start",
        "n_branches": job.n_branches,
    })

    semaphore = asyncio.Semaphore(job.parallel)

    async def _run_one(branch_id: str):
        async with semaphore:
            await generate_branch(
                job_id=job_id,
                branch_id=branch_id,
                motion=job.motion,
                stance=job.stance,
                debate_format=job.format,
                model=job.model,
                api_key=job.api_key,
                api_url=job.api_url,
            )

    tasks = [_run_one(bid) for bid in job.branches]
    await asyncio.gather(*tasks, return_exceptions=True)

    # All branches done → aggregate
    job.status = JobStatus.AGGREGATING
    await job_manager.emit(job_id, {"type": "sampling_done"})

    try:
        await run_aggregation(job_id)
    except Exception as e:
        job.status = JobStatus.ERROR
        job.error = str(e)
        await job_manager.emit(job_id, {"type": "job_error", "error": str(e)})
