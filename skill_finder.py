#!/usr/bin/env python3
"""
Suggests the right Claude Code skill based on a task description.
Usage: python skill_finder.py "your task description"
       python skill_finder.py  (interactive mode)
"""

import sys
import re
from dataclasses import dataclass

@dataclass
class Skill:
    name: str
    trigger: str
    description: str
    keywords: list[str]
    examples: list[str]


SKILLS = [
    Skill(
        name="update-config",
        trigger="/update-config",
        description="Configure the Claude Code harness via settings.json. Use for hooks, permissions, env vars, and automated behaviors.",
        keywords=[
            "hook", "hooks", "settings", "config", "permission", "permissions",
            "allow", "env", "environment variable", "automated", "automatically",
            "from now on", "each time", "whenever", "before", "after",
            "settings.json", "allow command", "add permission",
        ],
        examples=[
            "from now on, run tests before committing",
            "allow npm commands",
            "set DEBUG=true",
            "add a hook that runs lint after saving",
            "when claude stops show a notification",
        ],
    ),
    Skill(
        name="keybindings-help",
        trigger="/keybindings-help",
        description="Customize keyboard shortcuts, rebind keys, or add chord bindings in ~/.claude/keybindings.json.",
        keywords=[
            "keybinding", "keybindings", "keyboard", "shortcut", "shortcuts",
            "rebind", "chord", "hotkey", "key binding", "ctrl", "cmd", "alt",
            "submit key", "keybindings.json",
        ],
        examples=[
            "rebind ctrl+s to submit",
            "add a chord shortcut for /review",
            "change the submit key",
            "customize keybindings",
        ],
    ),
    Skill(
        name="simplify",
        trigger="/simplify",
        description="Review recently changed code for reuse, quality, and efficiency, then fix any issues found.",
        keywords=[
            "simplify", "refactor", "clean up", "cleanup", "review code",
            "code quality", "efficiency", "reuse", "improve code", "tidy",
            "optimize", "reduce duplication", "dry",
        ],
        examples=[
            "simplify the code I just wrote",
            "clean up my recent changes",
            "refactor for better quality",
        ],
    ),
    Skill(
        name="fewer-permission-prompts",
        trigger="/fewer-permission-prompts",
        description="Scan transcripts for common read-only tool calls and add an allowlist to reduce permission prompts.",
        keywords=[
            "permission prompt", "permission prompts", "allow list", "allowlist",
            "stop asking", "too many prompts", "reduce prompts", "approve",
            "always allow", "annoying prompt",
        ],
        examples=[
            "stop asking me to approve every read command",
            "reduce permission prompts",
            "add common tools to the allowlist",
        ],
    ),
    Skill(
        name="loop",
        trigger="/loop",
        description="Run a prompt or slash command on a recurring interval (e.g. every 5 minutes).",
        keywords=[
            "loop", "recurring", "repeat", "every", "interval", "schedule",
            "periodically", "keep running", "poll", "watch", "monitor",
            "cron", "repeatedly",
        ],
        examples=[
            "check the deploy status every 5 minutes",
            "run /review every hour",
            "keep watching for new PRs",
        ],
    ),
    Skill(
        name="claude-api",
        trigger="/claude-api",
        description="Build, debug, and optimize Claude API / Anthropic SDK apps. Handles prompt caching, tool use, model migration, and more.",
        keywords=[
            "anthropic", "claude api", "sdk", "prompt caching", "cache",
            "tool use", "function calling", "opus", "sonnet", "haiku",
            "model", "streaming", "batch", "files api", "citations",
            "thinking", "compaction", "managed agents", "migrate model",
            "api key", "api call", "llm", "completion",
        ],
        examples=[
            "build a chatbot using the Claude API",
            "add prompt caching to my Anthropic SDK app",
            "migrate from claude-3 to claude-4",
            "implement tool use with the Anthropic SDK",
        ],
    ),
    Skill(
        name="session-start-hook",
        trigger="/session-start-hook",
        description="Create a SessionStart hook for Claude Code on the web that installs dependencies so tests and linters work.",
        keywords=[
            "session start", "startup hook", "session hook", "claude code web",
            "web session", "install dependencies", "remote session",
            "npm install", "pip install", "session start hook",
        ],
        examples=[
            "set up a startup hook that runs npm install",
            "create a session start hook for my web project",
            "install dependencies at session start",
        ],
    ),
    Skill(
        name="init",
        trigger="/init",
        description="Initialize a new CLAUDE.md file with codebase documentation for the current project.",
        keywords=[
            "claude.md", "init", "initialize", "document codebase",
            "codebase documentation", "project docs", "setup claude",
            "new project", "onboard",
        ],
        examples=[
            "create a CLAUDE.md for this project",
            "initialize claude for this repo",
            "document the codebase for Claude",
        ],
    ),
    Skill(
        name="review",
        trigger="/review",
        description="Review a pull request — analyzes code changes, identifies issues, and provides feedback.",
        keywords=[
            "review", "pull request", "pr", "code review", "review pr",
            "review pull request", "check pr", "review changes", "feedback",
        ],
        examples=[
            "review this pull request",
            "review PR #42",
            "give feedback on my changes",
        ],
    ),
    Skill(
        name="security-review",
        trigger="/security-review",
        description="Complete a security review of pending changes on the current branch.",
        keywords=[
            "security", "security review", "vulnerability", "vulnerabilities",
            "owasp", "injection", "xss", "sql injection", "secure", "audit",
            "penetration", "pentest", "exploit", "cve", "insecure",
        ],
        examples=[
            "do a security review of my changes",
            "check for security vulnerabilities",
            "audit this branch for security issues",
        ],
    ),
]


def score_skill(skill: Skill, query: str) -> int:
    query_lower = query.lower()
    score = 0
    words = re.findall(r"\w+", query_lower)

    for kw in skill.keywords:
        if kw.lower() in query_lower:
            # Longer keyword matches score higher
            score += len(kw.split()) * 2

    for word in words:
        for kw in skill.keywords:
            if word in kw.lower().split():
                score += 1

    return score


def find_skills(query: str, top_n: int = 3) -> list[tuple[Skill, int]]:
    scored = [(skill, score_skill(skill, query)) for skill in SKILLS]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [(s, sc) for s, sc in scored if sc > 0][:top_n]


def print_result(skill: Skill, score: int, rank: int) -> None:
    bar = "#" * min(score, 20)
    print(f"\n  {rank}. {skill.trigger}  (relevance: {bar})")
    print(f"     {skill.description}")
    print(f"     Examples: {' / '.join(skill.examples[:2])}")


def main() -> None:
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        print("Claude Code Skill Finder")
        print("=" * 40)
        query = input("Describe your task: ").strip()

    if not query:
        print("No task provided.")
        sys.exit(1)

    results = find_skills(query)

    if not results:
        print(f'\nNo matching skills found for: "{query}"')
        print("\nAll available skills:")
        for skill in SKILLS:
            print(f"  {skill.trigger} — {skill.description}")
        sys.exit(0)

    print(f'\nTop skill suggestions for: "{query}"')
    print("=" * 50)
    for rank, (skill, score) in enumerate(results, start=1):
        print_result(skill, score, rank)

    print()


if __name__ == "__main__":
    main()
