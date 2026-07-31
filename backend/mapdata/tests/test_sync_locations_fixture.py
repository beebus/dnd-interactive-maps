import io
from contextlib import redirect_stdout

from django.core.management import call_command
from django.test import TestCase

from ..models import Location


class SyncLocationsFixtureTest(TestCase):
    def test_replaces_location_table_with_fixture_contents(self):
        Location.objects.create(name="Not In Fixture", x=1, y=1, map="underdark")

        buf = io.StringIO()
        with redirect_stdout(buf):
            call_command("sync_locations_fixture")

        self.assertFalse(Location.objects.filter(name="Not In Fixture").exists())
        self.assertTrue(Location.objects.filter(name="Menzoberranzan", map="underdark").exists())
        self.assertIn("Location table replaced from fixture", buf.getvalue())
