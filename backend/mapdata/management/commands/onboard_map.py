"""
Django management command: onboard_map

Given a brand-new map image (already dropped into frontend/public/maps/ and,
ideally, catalogued in frontend/src/data/mapManifest.json) with zero existing
Location pins, uses Claude's vision API to detect location labels on the
image and generates a first-pass Django fixture of pins for it — the same
label-extraction step analyze_map.py uses to find *missing* pins on an
existing map, applied here to build the *initial* set for a new one.

Reuses _resolve_image / _image_dimensions / _vision_extract from
analyze_map.py rather than duplicating them.

Coordinate note
----------------
_vision_extract returns coordinates normalized to [0, 1]. Location.x/y are
stored in the same "display pixel" reference frame analyze_map.py uses when
no --display-width is given: the image's native pixel width/height. So the
normalized coordinates are scaled back up by the native dimensions, matching
analyze_map.py's own _create_pins conversion.

Usage examples
--------------
  python manage.py onboard_map --map elturel --dry-run
  python manage.py onboard_map --map elturel
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from mapdata.management.commands.analyze_map import Command as AnalyzeMapCommand

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "fixtures" / "locations.json"


class Command(BaseCommand):
    help = "Generate a first-pass Location fixture for a brand-new map image using Claude vision."

    def add_arguments(self, parser):
        parser.add_argument(
            "--map",
            required=True,
            help="Map key for the new map (will become the Location.map field value)",
        )
        parser.add_argument(
            "--image-path",
            help="Override the path to the map image (JPEG, PNG, or WEBP)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print the generated fixture entries instead of writing them to the fixture file",
        )

    def handle(self, *args, **options):
        import os

        import anthropic

        map_name = options["map"]

        image_path = AnalyzeMapCommand._resolve_image(options.get("image_path"), map_name)
        if not image_path.exists():
            self.stderr.write(self.style.ERROR(f"Map image not found: {image_path}"))
            return

        self.stdout.write(f"Map image : {image_path}")
        native_w, native_h = AnalyzeMapCommand._image_dimensions(image_path)
        self.stdout.write(f"Dimensions: {native_w}×{native_h} px (native)")

        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

        self.stdout.write("Sending image to Claude for location extraction…")
        image_locs = AnalyzeMapCommand._vision_extract(client, image_path, native_w, native_h)
        self.stdout.write(
            self.style.SUCCESS(f"Claude identified {len(image_locs)} locations on the map")
        )

        fixture = self._load_fixture()
        next_pk = max((entry["pk"] for entry in fixture), default=0) + 1

        new_entries = []
        for loc in image_locs:
            new_entries.append(
                {
                    "model": "mapdata.location",
                    "pk": next_pk,
                    "fields": {
                        "name": loc["name"],
                        "x": round(loc["x"] * native_w),
                        "y": round(loc["y"] * native_h),
                        "map": map_name,
                    },
                }
            )
            next_pk += 1

        if options["dry_run"]:
            self.stdout.write("\nDry run — would add:")
            self.stdout.write(json.dumps(new_entries, indent=2))
            return

        fixture.extend(new_entries)
        self._write_fixture(fixture)
        self.stdout.write(
            self.style.SUCCESS(
                f"Added {len(new_entries)} pin(s) for map '{map_name}' to {FIXTURE_PATH}"
            )
        )

    @staticmethod
    def _load_fixture() -> list[dict]:
        try:
            with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    @staticmethod
    def _write_fixture(fixture: list[dict]) -> None:
        with open(FIXTURE_PATH, "w", encoding="utf-8") as f:
            json.dump(fixture, f, indent=2)
            f.write("\n")
