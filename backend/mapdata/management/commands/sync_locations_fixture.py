"""
Django management command: sync_locations_fixture

Replaces all Location rows with the contents of the committed fixture
(backend/mapdata/fixtures/locations.json). Used on deploy so production,
which has no pin-editing UI, always mirrors exactly what's committed to
git — including deletions, which a plain `loaddata` would not propagate.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Replace all Location rows with the contents of the committed fixture (used on deploy)."

    def handle(self, *args, **options):
        from mapdata.models import Location

        with transaction.atomic():
            Location.objects.all().delete()
            call_command("loaddata", "mapdata/fixtures/locations.json")

        self.stdout.write(self.style.SUCCESS("Location table replaced from fixture."))
