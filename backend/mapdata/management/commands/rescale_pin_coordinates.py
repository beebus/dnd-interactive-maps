"""
Django management command: rescale_pin_coordinates

One-time data migration for pins created before MapPage.tsx switched from a
hardcoded 1200px reference width to the map image's actual natural width when
computing its display scale factor (see imageScale in MapPage.tsx).

Old pins were stored as: stored_value = fraction_of_dimension * 1200, using a
single isotropic scale factor (rect.width / 1200) applied to both x and y —
so both axes need the same conversion:

    new_value = stored_value * (native_image_width / 1200)

Usage
-----
  python manage.py rescale_pin_coordinates --map elturel
  python manage.py rescale_pin_coordinates --map elturel --apply
  python manage.py rescale_pin_coordinates --apply   # every map slug present in the DB
"""

from django.core.management.base import BaseCommand

from .analyze_map import Command as AnalyzeMapCommand

OLD_REFERENCE_WIDTH = 1200


class Command(BaseCommand):
    help = (
        "Rescale existing Location pin coordinates from the old hardcoded-1200px "
        "reference width to the map image's native pixel space"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--map",
            help="Only rescale pins for this map slug (default: every map slug present in the DB)",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the rescaled coordinates (default: dry run, prints what would change)",
        )

    def handle(self, *args, **options):
        from mapdata.models import Location

        qs = Location.objects.all()
        if options.get("map"):
            qs = qs.filter(map=options["map"])

        map_names = sorted(qs.values_list("map", flat=True).distinct())
        if not map_names:
            self.stdout.write("No matching pins found.")
            return

        total_updated = 0
        for map_name in map_names:
            image_path = AnalyzeMapCommand._resolve_image(None, map_name)
            if not image_path.exists():
                self.stderr.write(
                    self.style.ERROR(f"Map image not found for '{map_name}': {image_path} — skipping")
                )
                continue

            native_w, _ = AnalyzeMapCommand._image_dimensions(image_path)
            scale = native_w / OLD_REFERENCE_WIDTH
            self.stdout.write(f"\n{map_name}: native width {native_w}px, scale factor {scale:.4f}")

            updates = []
            for loc in Location.objects.filter(map=map_name):
                new_x = loc.x * scale
                new_y = loc.y * scale
                self.stdout.write(
                    f"  • {loc.name:30s} ({loc.x:.0f}, {loc.y:.0f}) -> ({new_x:.0f}, {new_y:.0f})"
                )
                loc.x = new_x
                loc.y = new_y
                updates.append(loc)

            if options["apply"]:
                Location.objects.bulk_update(updates, ["x", "y"])
                total_updated += len(updates)

        if options["apply"]:
            self.stdout.write(self.style.SUCCESS(f"\nRescaled {total_updated} pin(s)."))
        else:
            self.stdout.write(self.style.WARNING("\nDry run only — re-run with --apply to write these changes."))
