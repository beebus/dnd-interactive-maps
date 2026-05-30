"""
Django management command: analyze_map

Compares text labels on a D&D map image against Location pins in the database
and reports (optionally creates GitHub issues for) two kinds of inconsistency:

  MISSING  — A name visible on the map has no nearby pin in the database.
  MISMATCH — A pin exists near a map label, but the names don't match well.

Coordinate note
---------------
The frontend stores pin coordinates in CSS display pixels (relative to the
image as rendered at 100 vw width).  Claude returns native image pixels.
Because the scale ratio is unknown at analysis time, coordinates are each
normalized to [0, 1] using their own reference dimension (display width for
DB pins is estimated as the native width; adjust --display-width if your
browser viewport differs).  Use a generous --threshold when comparing across
these two spaces.

Usage examples
--------------
  python manage.py analyze_map
  python manage.py analyze_map --map elturel --threshold 0.08
  python manage.py analyze_map --create-issues
"""

import base64
import json
import math
import os
import struct
from difflib import SequenceMatcher
from pathlib import Path
from typing import Union

from django.core.management.base import BaseCommand

GITHUB_ISSUES_API = "https://api.github.com/repos/beebus/dnd-interactive-maps/issues"
NAME_SIMILARITY_MIN = 0.6


class Command(BaseCommand):
    help = "Analyze a D&D map image and detect inconsistencies with database pins"

    def add_arguments(self, parser):
        parser.add_argument(
            "--map",
            default="underdark",
            help="Map slug to analyze (must match the Location.map field and the image filename)",
        )
        parser.add_argument(
            "--threshold",
            type=float,
            default=0.06,
            help=(
                "Max normalised distance [0-1] to consider a DB pin 'nearby' a map label "
                "(default: 0.06 ≈ 6%% of image width/height)"
            ),
        )
        parser.add_argument(
            "--display-width",
            type=int,
            default=None,
            help=(
                "Browser viewport width (px) used when pins were created.  "
                "If omitted, the image's native pixel width is used as the reference."
            ),
        )
        parser.add_argument(
            "--create-issues",
            action="store_true",
            help="Post a GitHub issue for each inconsistency found",
        )
        parser.add_argument(
            "--create-pins",
            action="store_true",
            help="Write missing locations to the database as new Location pins",
        )
        parser.add_argument(
            "--image-path",
            help="Override the path to the map image (JPEG)",
        )

    def handle(self, *args, **options):
        import anthropic

        from mapdata.models import Location

        map_name = options["map"]
        threshold = options["threshold"]

        image_path: Path = self._resolve_image(options.get("image_path"), map_name)
        if not image_path.exists():
            self.stderr.write(self.style.ERROR(f"Map image not found: {image_path}"))
            return

        self.stdout.write(f"Map image : {image_path}")
        native_w, native_h = self._jpeg_dimensions(image_path)
        self.stdout.write(f"Dimensions: {native_w}×{native_h} px (native)")

        display_w = options["display_width"] or native_w
        display_h = int(native_h * display_w / native_w)
        self.stdout.write(f"DB coord reference: {display_w}×{display_h} px (display)")

        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

        self.stdout.write("Sending image to Claude for location extraction…")
        image_locs = self._vision_extract(client, image_path, native_w, native_h)  # type: ignore
        self.stdout.write(
            self.style.SUCCESS(f"Claude identified {len(image_locs)} locations on the map")
        )

        # noinspection PyUnresolvedReferences
        db_locs = [
            {
                "id": loc.id,
                "name": loc.name,
                "x": loc.x / display_w,
                "y": loc.y / display_h,
            }
            for loc in Location.objects.filter(map=map_name)
        ]
        self.stdout.write(f"Database   : {len(db_locs)} pins for map '{map_name}'")

        missing, mismatched = self._compare(image_locs, db_locs, threshold)  # type: ignore
        self._print_report(missing, mismatched)

        if options["create_pins"] and missing:
            self._create_pins(missing, map_name, display_w, display_h, location_model=Location)

        if options["create_issues"] and (missing or mismatched):
            self._post_issues(client, missing, mismatched, map_name)

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _resolve_image(override, map_name):
        if override:
            return Path(override)
        # Inside Docker the map volume is mounted at /maps.
        # Outside Docker (local dev) falls back to the repo-relative path.
        docker_path = Path("/maps") / f"{map_name}.jpg"
        if docker_path.exists():
            return docker_path
        root = Path(__file__).resolve().parents[4]
        return root / "frontend" / "public" / "maps" / f"{map_name}.jpg"

    @staticmethod
    def _jpeg_dimensions(path: Union[str, Path]) -> tuple[int, int]:
        """Read image dimensions directly from the JPEG SOF marker (no Pillow needed)."""
        with open(path, "rb") as f:
            data = f.read()
        i = 2  # skip the SOI marker (FF D8)
        while i < len(data) - 8:
            if data[i] != 0xFF:
                break
            marker = data[i + 1]
            seg_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
            if marker in (0xC0, 0xC1, 0xC2):  # SOF0 / SOF1 / SOF2
                h = struct.unpack(">H", data[i + 5 : i + 7])[0]
                w = struct.unpack(">H", data[i + 7 : i + 9])[0]
                return w, h
            i += 2 + seg_len
        raise ValueError(f"Cannot read JPEG dimensions from {path}")

    @staticmethod
    def _vision_extract(client, image_path, img_w, img_h):
        """Send the map image to Claude and return a list of {name, x, y} dicts
        where x and y are already normalized to [0, 1]."""
        with open(image_path, "rb") as f:
            b64_data = base64.standard_b64encode(f.read()).decode()

        ext = image_path.suffix.lower()
        media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

        prompt = (
            f"This is a D&D fantasy map image ({img_w}×{img_h} pixels). "
            "Identify every named location — cities, towns, dungeons, fortresses, regions, "
            "and landmarks — that appears as a text label directly on this map. "
            "For each location, estimate the pixel coordinates (x from the left edge, "
            "y from the top edge) of the centre of its text label. "
            "Respond with ONLY a valid JSON array and nothing else:\n"
            '[{"name": "Menzoberranzan", "x": 312, "y": 204}, ...]'
        )

        msg = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=8096,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )

        raw = msg.content[0].text.strip()
        # Strip accidental Markdown code fences
        if raw.startswith("```"):
            parts = raw.split("```", 2)
            raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            items = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Claude returned invalid JSON (possibly truncated — try raising max_tokens).\n"
                f"Parse error: {exc}\n"
                f"Raw response tail: ...{raw[-300:]}"
            ) from exc
        return [
            {
                "name": " ".join(w.capitalize() for w in item["name"].split()),
                "x": item["x"] / img_w,
                "y": item["y"] / img_h,
            }
            for item in items
        ]

    @staticmethod
    def _compare(image_locs, db_locs, threshold):
        missing = []
        mismatched = []

        for i_loc in image_locs:
            if not db_locs:
                missing.append(i_loc)
                continue

            nearest = min(
                db_locs,
                key=lambda d: math.hypot(d["x"] - i_loc["x"], d["y"] - i_loc["y"]),
            )
            dist = math.hypot(nearest["x"] - i_loc["x"], nearest["y"] - i_loc["y"])

            if dist > threshold:
                missing.append(i_loc)
            else:
                similarity = SequenceMatcher(
                    None, i_loc["name"].lower(), nearest["name"].lower()
                ).ratio()
                if similarity < NAME_SIMILARITY_MIN:
                    mismatched.append(
                        {
                            "map_name": i_loc["name"],
                            "db_name": nearest["name"],
                            "db_id": nearest["id"],
                            "distance": dist,
                            "x": i_loc["x"],
                            "y": i_loc["y"],
                        }
                    )

        return missing, mismatched

    def _print_report(self, missing, mismatched):
        if not missing and not mismatched:
            self.stdout.write(self.style.SUCCESS("\nNo inconsistencies found."))
            return

        if missing:
            self.stdout.write(
                self.style.WARNING(f"\n{len(missing)} MISSING pin(s) — on map but not in DB:")
            )
            for loc in missing:
                self.stdout.write(
                    f"  • {loc['name']:40s}  (normalised pos {loc['x']:.3f}, {loc['y']:.3f})"
                )

        if mismatched:
            self.stdout.write(
                self.style.WARNING(f"\n{len(mismatched)} NAME MISMATCH(ES) — nearby pin has a different name:")
            )
            for m in mismatched:
                self.stdout.write(
                    f"  • Map: '{m['map_name']}'  →  DB id={m['db_id']} '{m['db_name']}'"
                )

    def _create_pins(self, missing, map_name, display_w, display_h, location_model):
        created = location_model.objects.bulk_create([
            location_model(
                name=loc["name"],
                x=round(loc["x"] * display_w),
                y=round(loc["y"] * display_h),
                map=map_name,
            )
            for loc in missing
        ])
        self.stdout.write(
            self.style.SUCCESS(f"Created {len(created)} new pin(s) in the database.")
        )
        self.stdout.write(
            "Run the following to export them to the fixture file:\n"
            "  docker compose exec backend python manage.py dump-data mapdata.location "
            "--indent 2 > backend/mapdata/fixtures/locations.json"
        )

    def _post_issues(self, client, missing, mismatched, map_name):
        import requests

        token = os.environ.get("GITHUB_TOKEN", "")
        headers = {
            "Authorization": f"token {token}",
            "Content-Type": "application/json",
        }

        for loc in missing:
            body = self._draft_issue(  # type: ignore
                client,
                kind="missing_pin",
                detail=(
                    f"The {map_name} map image shows a location named '{loc['name']}' "
                    f"at approximate normalised position ({loc['x']:.3f}, {loc['y']:.3f}) "
                    "but no database pin exists nearby."
                ),
            )
            resp = requests.post(GITHUB_ISSUES_API, headers=headers, json=body, timeout=15)
            url = resp.json().get("html_url", "(no url)")
            self.stdout.write(f"Issue created: {url}")

        for m in mismatched:
            body = self._draft_issue(  # type: ignore
                client,
                kind="name_mismatch",
                detail=(
                    f"The {map_name} map image labels a location '{m['map_name']}' "
                    f"but the nearest database pin (id={m['db_id']}) is named '{m['db_name']}'. "
                    f"Normalised distance: {m['distance']:.4f}."
                ),
            )
            resp = requests.post(GITHUB_ISSUES_API, headers=headers, json=body, timeout=15)
            url = resp.json().get("html_url", "(no url)")
            self.stdout.write(f"Issue created: {url}")

    @staticmethod
    def _draft_issue(client, kind, detail):
        action = {
            "missing_pin": "Add a new database pin for the missing location.",
            "name_mismatch": "Rename the database pin to match the label on the map image, or confirm the discrepancy is intentional.",
        }[kind]

        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Write a short, actionable GitHub issue for a D&D interactive-map "
                        f"inconsistency. Action needed: {action} "
                        f"Finding: {detail} "
                        'Reply with JSON only — {"title": "...", "body": "..."} — no markdown.'
                    ),
                }
            ],
        )
        return json.loads(msg.content[0].text.strip())
