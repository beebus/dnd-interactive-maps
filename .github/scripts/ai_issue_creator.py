# .github/scripts/ai_issue_creator.py
import hashlib
import os
import json
import sys
import requests
import anthropic
from anthropic.types import MessageParam, TextBlock
from typing import cast

REPO_API = "https://api.github.com/repos/beebus/dnd-interactive-maps"


def _fingerprint(finding_text: str) -> str:
    # Stable id for this exact finding, independent of the AI-generated title/body wording.
    return hashlib.sha256(finding_text.strip().encode("utf-8")).hexdigest()[:12]


def _existing_open_issue(headers: dict, fingerprint: str, label: str) -> str | None:
    response = requests.get(
        f"{REPO_API}/issues",
        headers=headers,
        params={"state": "open", "labels": label},
    )
    response.raise_for_status()
    for issue in response.json():
        if fingerprint in (issue.get("body") or ""):
            return issue.get("html_url")
    return None


def create_issue_from_finding(finding_text: str, label: str = "security-scan"):
    headers = {"Authorization": f"token {os.environ.get('GITHUB_TOKEN', '')}"}
    fingerprint = _fingerprint(finding_text)

    existing_url = _existing_open_issue(headers, fingerprint, label)
    if existing_url:
        print(f"Issue already open for this finding, skipping: {existing_url}")
        return

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    # Ask Claude to write a good GitHub issue
    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1024,
        stream=False,   # explicit False → eliminates Stream union warning
        messages=cast(list[MessageParam], cast(object, [
            {
                "role": "user",
                "content": f"Write a GitHub issue title and body for this security finding. "
                           f"Respond with JSON only, no markdown, in this exact format: "
                           f'{{\"title\": \"...\", \"body\": \"...\"}}. Finding: {finding_text}'
            }
        ]))
    )

    # Cast the content block to TextBlock → eliminates ThinkingBlock union warning
    content_block = cast(TextBlock, message.content[0])
    issue_data = json.loads(content_block.text)
    issue_data["body"] = f"{issue_data['body']}\n\n<!-- fingerprint:{fingerprint} -->"

    # Post to GitHub Issues API
    response = requests.post(
        f"{REPO_API}/issues",
        headers=headers,
        json={"title": issue_data["title"], "body": issue_data["body"], "labels": [label]}
    )
    print(f"Issue created: {response.json().get('html_url')}")


if __name__ == "__main__":
    finding_arg = sys.argv[1] if len(sys.argv) > 1 else "Unknown security finding"
    label_arg = "security-scan"
    if len(sys.argv) > 2 and sys.argv[2] == "--label" and len(sys.argv) > 3:
        label_arg = sys.argv[3]
    create_issue_from_finding(finding_arg, label=label_arg)