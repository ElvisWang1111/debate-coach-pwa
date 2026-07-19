"""
Single branch generation.
Loads both SKILL.md files, sends them as system prompt,
and asks the model to produce a complete structured casebook JSON.
"""
import json
import re
from pathlib import Path
from typing import Optional

from .job_manager import job_manager, BranchStatus

# ── locate skill files ──────────────────────────────────────────────────────
_HERE = Path(__file__).parent.parent.parent  # debate-coach root
DEBATE_COACH_SKILL = _HERE / "SKILL.md"
CASE_WRITER_SKILL = _HERE / "case-writing-skill" / "SKILL.md"


def _load_skills() -> str:
    parts = []
    for path in (DEBATE_COACH_SKILL, CASE_WRITER_SKILL):
        if path.exists():
            parts.append(path.read_text(encoding="utf-8"))
        else:
            print(f"[WARN] skill file not found: {path}")
    return "\n\n---\n\n".join(parts)


SKILLS_TEXT = _load_skills()

# ── JSON schema (shown to model in user prompt) ─────────────────────────────
CASEBOOK_SCHEMA = """
{
  "e1": {
    "key_terms": [
      {
        "term": "关键词",
        "interpretations": [
          {
            "perspective": "字典/学术/法律/业界等视角",
            "content": "该视角下的完整解释",
            "rationale": "为什么这个视角对本辩题重要"
          }
        ]
      }
    ],
    "reference_cases": [
      {
        "title": "案例名",
        "description": "详细描述（AI内部知识，说明你对此事的了解）",
        "relevance": "与辩题的关联",
        "knowledge_basis": "你掌握这条信息的来源依据（如：广泛报道的历史事件/学术研究共识/官方统计数据等）"
      }
    ],
    "theories": [
      {
        "name": "理论或学者名称",
        "author_source": "提出者和大致来源",
        "core_content": "核心内容",
        "application": "在本辩题中的应用方式"
      }
    ]
  },
  "e3": {
    "arguments": [
      {
        "id": "A001",
        "because": "因为（完整理由，不能只是结论）",
        "so": "所以（完整结论，必须与持方方向一致）",
        "stance": "our_side 或 opponent",
        "elaboration": "进一步展开说明这条论点的逻辑"
      }
    ]
  },
  "e4": {
    "definitions": [
      {
        "keyword": "关键词",
        "layer1_boundary": "固有定义域：一般理性人的常识理解范围",
        "layer2_focus": "讨论范围切入：我方聚焦的子集及原因",
        "definition_statement": "完整的定义陈述句（可在立论中直接使用）",
        "rationale": "为什么这样定义对我方有利且合理"
      }
    ],
    "b0": {
      "statement": "完整标准陈述句（持方成立的最根本理由）",
      "why_this_standard": "凭什么用这个标准来判断这个辩题",
      "supporting_reasoning": [
        {"argument": "支撑论证", "evidence": "AI知识支撑"}
      ]
    },
    "sub_points": [
      {
        "id": "SP1",
        "claim": "分论点完整陈述句",
        "supports_b0_via": "这个分论点如何逻辑地回扣B0",
        "reasoning": [
          {"argument": "具体论证展开", "evidence": "支撑证据或知识"}
        ]
      }
    ],
    "structure_type": "parallel 或 linear 或 value_reinforced",
    "session_tasks": [
      {
        "role": "辩位名（如一辩）",
        "segment": "环节名",
        "task": "该辩位在该环节的具体任务",
        "duration": "预计时长"
      }
    ]
  },
  "e5": {
    "definition_defense": [
      {
        "attack_type": "定义过宽 或 定义过窄 或 回避核心争议",
        "likely_attack": "对方会怎么说（完整表述）",
        "likely_evidence": "对方可能使用的证据或论据",
        "our_response": "我方完整回应（可在赛场直接说）",
        "our_evidence": "我方使用的论据",
        "response_strategy": "consume（消化）或 reverse（反转）或 block（拆除）"
      }
    ],
    "scope_defense": [
      {
        "likely_attack": "对方对讨论范围的攻击",
        "likely_evidence": "",
        "our_response": "",
        "our_evidence": ""
      }
    ],
    "b0_defense": [
      {
        "attack_type": "B→C推不通 或 B不重要",
        "likely_attack": "",
        "likely_evidence": "",
        "our_response": "",
        "our_evidence": ""
      }
    ],
    "subpoint_defenses": [
      {
        "subpoint_id": "SP1",
        "subpoint_claim": "分论点陈述句",
        "paths": [
          {
            "attack_path": "A_not_B 或 B_not_C 或 B_unimportant",
            "likely_attack": "对方具体怎么打",
            "likely_evidence": "",
            "our_response": "我方回应（可赛场直接说）",
            "our_evidence": ""
          }
        ]
      }
    ]
  },
  "e6": {
    "opponent_arguments": [
      {
        "full_chain": "对方完整A→B→C逻辑链",
        "likely_evidence": "对方最可能引用的证据",
        "attack_factual": {
          "content": "事实层反驳：A未必→B（完整攻击路径）",
          "evidence": "我方支撑证据",
          "core_arg": "核心论证句（赛场可直接说）"
        },
        "attack_logical": {
          "content": "逻辑层反驳：B未必→C（用反例法）",
          "evidence": "",
          "core_arg": ""
        },
        "attack_value": {
          "content": "价值层反驳：B不重要（需给出更重要的B'）",
          "evidence": "",
          "core_arg": ""
        }
      }
    ]
  },
  "e7": {
    "battlefields": [
      {
        "name": "战场名称（一个词或短语说明核心争议）",
        "question": "完整提问句（锁定对方立场）",
        "predicted_response": "对方最可能的第一种回应",
        "chase1": "针对第一种回应的追问",
        "chase1_predicted": "对方对追问1的可能回应",
        "chase2": "针对第二种回应方向的追问",
        "chase2_predicted": "对方对追问2的可能回应",
        "return": "归结句（能容纳对方各种回应，收束到我方论点）",
        "transition": "转场句（引出下一战场）"
      }
    ]
  }
}
"""

# ── system prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = f"""{SKILLS_TEXT}

---

## 批量辩案生成模式

你现在处于自动批量生成模式。
**不需要等待用户输入，不需要逐步引导，不需要确认。**
直接基于《辩论筑基》知识体系，一次性生成一份完整的标准化辩案。

输出格式：结构化 Markdown（不是 JSON）。严格按以下章节顺序和标题输出，不得省略任何章节。

---

## E1 · 资料搜集

### 关键词解释
针对辩题关键词（2-3个），每个关键词给出多视角解释（通识/学术/政策视角）及对本辩题的意义。

### 参考案例
2-3个与辩题高度相关的案例，注明：案例名、简述（来自AI内部知识）、与辩题关联、信息认知依据（如：广泛报道的历史事件/学术研究共识等）。

### 相关理论与学者
1-2个相关理论或学者观点，注明：名称/来源、核心内容、在本辩题的应用方式。

---

## E3 · 论点穷举

用表格列出 10-12 条论点：

| 编号 | 因为（理由） | 所以（结论） | 立场 |
|------|------------|------------|------|
（我方 ≥ 8 条，对方 ≥ 2 条；立场填"我方"或"对方"）

---

## E4 · 论证架构

### 关键词定义
每个关键词：固有定义域（常识范围）→ 我方讨论范围（聚焦子集）→ 完整定义陈述句

### B0 核心标准
完整标准陈述句（持方成立的根本理由），说明凭什么用此标准，给出2条支撑论证。

### 分论点
2个分论点，每个包含：分论点陈述句、回扣B0的逻辑路径、2条具体论证（论证 + 支撑知识）

### 赛制分工
表格：辩位 | 环节 | 任务 | 预计时长

---

## E5 · 我方防守

### 定义防守
1-2条：对方攻击预判 → 我方回应（可赛场直接说） → 回应策略（消化/反转/拆除）

### 讨论范围防守
1条对方对范围的质疑 → 我方回应

### B0标准防守
1-2条：对方攻击B→C或B不重要 → 我方回应

### 分论点防守
每个分论点：三条防守路径（A不→B / B不→C / B不重要），各给一条对方攻击 + 我方回应

---

## E6 · 我方攻击

3个预判对方论点，每个论点：
- **对方完整逻辑链**（A→B→C）
- **事实层攻击**：A未必→B
- **逻辑层攻击**：B未必→C（用反例）
- **价值层攻击**：B不重要（给出更重要的B'）

---

## E7 · 自由辩套题

2-3个战场，每个战场：
**战场名称**
- 问：（锁定对方的提问）
- 追1：（针对对方第一种回应的追问）
- 追2：（针对对方第二种回应的追问）
- 归：（归结句，容纳对方各种回应）
- 转：（引出下一战场的转场句）
"""

# ── branch generation ────────────────────────────────────────────────────────

def _make_client(api_key: str, api_url: str):
    """Return Anthropic or OpenAI-compatible client depending on URL."""
    is_anthropic = (not api_url) or "anthropic.com" in api_url
    if is_anthropic:
        import anthropic
        kwargs = {"api_key": api_key}
        if api_url and "anthropic.com" not in api_url:
            kwargs["base_url"] = api_url
        return "anthropic", anthropic.AsyncAnthropic(**kwargs)
    else:
        from openai import AsyncOpenAI
        return "openai", AsyncOpenAI(api_key=api_key, base_url=api_url)


def _extract_json(text: str) -> Optional[dict]:
    """Try to extract JSON from model output."""
    # Try markdown code block — capture everything between ``` markers
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Try raw JSON — track brace depth to find the outermost {...}
    start = text.find('{')
    if start != -1:
        depth = 0
        in_string = False
        escape = False
        for i, ch in enumerate(text[start:], start):
            if escape:
                escape = False
                continue
            if ch == '\\' and in_string:
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        break
    return None


async def generate_branch(
    job_id: str,
    branch_id: str,
    motion: str,
    stance: str,
    debate_format: str,
    model: str,
    api_key: str,
    api_url: str,
):
    job = job_manager.get_job(job_id)
    branch = job.branches[branch_id]
    branch.status = BranchStatus.RUNNING

    await job_manager.emit(job_id, {
        "type": "branch_start",
        "branch_id": branch_id,
    })

    user_prompt = f"""辩题：{motion}
持方：{stance}
赛制：{debate_format}

请按系统提示中规定的 Markdown 格式，生成完整标准化辩案。
严格保留所有章节标题（## E1、## E3、## E4、## E5、## E6、## E7），不得省略任何章节。
直接输出 Markdown 内容，不需要额外的包裹标记。"""

    provider, client = _make_client(api_key, api_url)
    full_text = ""

    try:
        if provider == "anthropic":
            async with client.messages.stream(
                model=model,
                max_tokens=8192,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for token in stream.text_stream:
                    full_text += token
                    branch.text += token
                    await job_manager.emit(job_id, {
                        "type": "branch_token",
                        "branch_id": branch_id,
                        "token": token,
                    })
        else:
            # OpenAI-compatible streaming
            stream = await client.chat.completions.create(
                model=model,
                max_tokens=8192,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    full_text += token
                    branch.text += token
                    await job_manager.emit(job_id, {
                        "type": "branch_token",
                        "branch_id": branch_id,
                        "token": token,
                    })

        # Store markdown output directly (no JSON parsing needed)
        branch.result = {"_raw": full_text}
        branch.status = BranchStatus.COMPLETE
        branch.word_count = len(full_text)
        await job_manager.emit(job_id, {
            "type": "branch_complete",
            "branch_id": branch_id,
            "word_count": branch.word_count,
        })

    except Exception as e:
        branch.status = BranchStatus.ERROR
        branch.error = str(e)
        await job_manager.emit(job_id, {
            "type": "branch_error",
            "branch_id": branch_id,
            "error": str(e),
        })
