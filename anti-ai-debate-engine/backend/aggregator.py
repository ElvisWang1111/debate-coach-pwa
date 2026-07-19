"""
LLM-based aggregation.
Takes all branch results, aggregates section by section,
then compiles a final Markdown casebook.
"""
import json
from typing import List, Optional

from .job_manager import job_manager, JobStatus

# Section display names
SECTIONS = [
    ("e1", "E1 · 资料搜集"),
    ("e3", "E3 · 论点穷举"),
    ("e4", "E4 · 论证架构"),
    ("e5", "E5 · 我方防守"),
    ("e6", "E6 · 我方攻击"),
    ("e7", "E7 · 自由辩套题"),
]


def _make_client(api_key: str, api_url: str):
    is_anthropic = (not api_url) or "anthropic.com" in api_url
    if is_anthropic:
        import anthropic
        kwargs = {"api_key": api_key}
        return "anthropic", anthropic.AsyncAnthropic(**kwargs)
    else:
        from openai import AsyncOpenAI
        return "openai", AsyncOpenAI(api_key=api_key, base_url=api_url)


_SECTION_HEADERS = {
    "e1": "E1",
    "e3": "E3",
    "e4": "E4",
    "e5": "E5",
    "e6": "E6",
    "e7": "E7",
}


def _extract_md_section(raw_text: str, section_key: str) -> str:
    """Extract a specific E-section from structured markdown output."""
    tag = _SECTION_HEADERS.get(section_key, section_key.upper())
    import re
    # Split on top-level ## E\d headers
    parts = re.split(r'\n(?=## E\d)', raw_text)
    for part in parts:
        if re.match(rf'^## {tag}[\s·]', part.strip()):
            return part.strip()
    # Fallback: return beginning of full text
    return raw_text[:4000]


def _collect_section(branches_results: List[Optional[dict]], section: str) -> List[str]:
    """Extract a section from all branches."""
    snippets = []
    for i, result in enumerate(branches_results):
        if not result:
            continue
        if "_raw" in result:
            excerpt = _extract_md_section(result["_raw"], section)
            snippets.append(f"[Branch {i+1}]\n{excerpt}")
        elif section in result:
            snippets.append(json.dumps(result[section], ensure_ascii=False, indent=2))
    return snippets


AGGREGATION_SYSTEM = """你是一个辩论辩案聚合专家。你的任务是：
将多个AI辩手独立生成的辩案的同一部分进行聚合和统计。

聚合规则：
1. 识别内容相同或高度相似的条目，统计出现频率（频率 = 出现次数 / 总分支数）
2. 相似内容合并为一条，并标注 [高频: X/N] 或 [中频: X/N] 或 [低频: X/N]
3. 保留所有独特内容（低频也保留，低频可能代表人类创新空间）
4. 按频率从高到低排序
5. 输出格式：结构化 Markdown，清晰可读

注意：重复不是错误——高频条目说明该论点/路径在AI思考空间中概率密度高。"""

COMPILE_SYSTEM = """你是一个辩论辩案编辑。你的任务是：
将各个部分的聚合结果，整合成一份完整、格式规范的标准化辩案 Markdown 文档。

要求：
- 主框架使用最高频的版本
- 高频论点放在每个部分的前面，低频论点整理为"补充/备选"部分
- 保留频率标注（帮助用户判断哪些是AI共识，哪些是独特视角）
- 文档结构清晰，使用标题、表格、列表等 Markdown 格式
- 语言流畅，可以直接作为备赛参考"""


async def _stream_llm(provider, client, model, system, user_prompt, job_id, event_type="agg_token"):
    """Stream from LLM and emit tokens; return full text."""
    full = ""
    try:
        if provider == "anthropic":
            async with client.messages.stream(
                model=model,
                max_tokens=8192,
                system=system,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for token in stream.text_stream:
                    full += token
                    await job_manager.emit(job_id, {"type": event_type, "token": token})
        else:
            stream = await client.chat.completions.create(
                model=model,
                max_tokens=8192,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    full += token
                    await job_manager.emit(job_id, {"type": event_type, "token": token})
    except Exception as e:
        await job_manager.emit(job_id, {"type": "agg_error", "error": str(e)})
        raise
    return full


async def run_aggregation(job_id: str):
    job = job_manager.get_job(job_id)
    provider, client = _make_client(job.api_key, job.api_url)

    branch_results = [b.result for b in job.branches.values()]
    n_total = len(branch_results)
    n_valid = sum(1 for r in branch_results if r and "_raw" not in r)

    await job_manager.emit(job_id, {
        "type": "agg_start",
        "n_total": n_total,
        "n_valid": n_valid,
        "sections": [s[0] for s in SECTIONS],
    })

    aggregated_sections = {}

    # ── Aggregate each section ──────────────────────────────────────────────
    for section_key, section_label in SECTIONS:
        snippets = _collect_section(branch_results, section_key)
        if not snippets:
            continue

        await job_manager.emit(job_id, {
            "type": "agg_section_start",
            "section": section_key,
            "label": section_label,
            "n_branches": len(snippets),
        })

        # Build prompt
        joined = "\n\n---分支分隔线---\n\n".join(
            f"[Branch {i+1}/{n_total}]\n{s}" for i, s in enumerate(snippets)
        )
        user_prompt = f"""辩题：{job.motion}
持方：{job.stance}
当前处理部分：{section_label}（共 {n_total} 个分支，{len(snippets)} 个有效）

以下是 {len(snippets)} 个分支对【{section_label}】部分的输出：

{joined}

请聚合以上内容：识别重复/相似条目并统计频率，合并相似内容，按频率排序，保留所有独特内容。
频率标注格式：[高频: X/{n_total}] 或 [中频: X/{n_total}] 或 [低频: X/{n_total}]
输出为结构化 Markdown。"""

        section_text = await _stream_llm(
            provider, client, job.model,
            AGGREGATION_SYSTEM, user_prompt, job_id,
            event_type="agg_token"
        )
        aggregated_sections[section_key] = section_text

        await job_manager.emit(job_id, {
            "type": "agg_section_done",
            "section": section_key,
            "label": section_label,
        })

    # ── Final compilation ───────────────────────────────────────────────────
    await job_manager.emit(job_id, {"type": "agg_compiling"})

    sections_joined = "\n\n".join(
        f"## {label}\n\n{aggregated_sections.get(key, '（无内容）')}"
        for key, label in SECTIONS
    )

    compile_prompt = f"""辩题：{job.motion}
持方：{job.stance}
赛制：{job.format}
总分支数：{n_total}（有效：{n_valid}）

以下是各部分的聚合结果（已含频率标注）：

{sections_joined}

请将以上内容整合成一份完整的标准化辩案 Markdown 文档。
文档标题：{job.motion}（{job.stance}）· 标准化辩案
文档需包含所有部分，高频内容为主框架，低频内容整理为"补充/备选"。
保留频率标注。"""

    final_md = await _stream_llm(
        provider, client, job.model,
        COMPILE_SYSTEM, compile_prompt, job_id,
        event_type="compile_token"
    )

    # ── Save and complete ───────────────────────────────────────────────────
    job.final_casebook_md = final_md
    job.final_casebook_json = {
        "motion": job.motion,
        "stance": job.stance,
        "format": job.format,
        "n_branches": n_total,
        "n_valid_branches": n_valid,
        "sections": aggregated_sections,
        "final_casebook": final_md,
    }
    job.status = JobStatus.COMPLETE

    await job_manager.emit(job_id, {
        "type": "job_complete",
        "casebook": final_md,
    })
