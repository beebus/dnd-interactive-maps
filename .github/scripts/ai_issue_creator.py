# .github/scripts/ai_issue_creator.py
import os
import json
import sys
import requests
import anthropic
from anthropic.types import MessageParam, TextBlock
from typing import cast


def create_issue_from_finding(finding_text: str):   # renamed param → fixes "Shadows name"
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    # Ask Claude to write a good GitHub issue
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
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

    # Post to GitHub Issues API
    response = requests.post(
        "https://api.github.com/repos/beebus/dnd-interactive-maps/issues",
        headers={"Authorization": f"token {os.environ.get('GITHUB_TOKEN', '')}"},
        json={"title": issue_data["title"], "body": issue_data["body"]}
    )
    print(f"Issue created: {response.json().get('html_url')}")


if __name__ == "__main__":
    finding_arg = sys.argv[1] if len(sys.argv) > 1 else "Unknown security finding"
    create_issue_from_finding(finding_arg)