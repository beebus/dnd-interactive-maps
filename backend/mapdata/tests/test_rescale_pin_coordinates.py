import io
from contextlib import redirect_stdout
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from ..management.commands.analyze_map import Command as AnalyzeMapCommand
from ..models import Location


class RescalePinCoordinatesTest(TestCase):
    def setUp(self):
        Location.objects.create(name="Elturel", x=139, y=100, map="elturel")
        Location.objects.create(name="Menzoberranzan", x=300, y=200, map="underdark")
        self.patches = [
            patch.object(AnalyzeMapCommand, "_resolve_image"),
            patch.object(AnalyzeMapCommand, "_image_dimensions", return_value=(1797, 1080)),
        ]
        self.mocks = [p.start() for p in self.patches]
        for p in self.patches:
            self.addCleanup(p.stop)
        self.mock_resolve_image = self.mocks[0]
        self.mock_resolve_image.return_value.exists.return_value = True

    def test_dry_run_does_not_write_changes(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            call_command("rescale_pin_coordinates", map="elturel")
        self.assertIn("Dry run only", buf.getvalue())
        elturel = Location.objects.get(name="Elturel")
        self.assertEqual(elturel.x, 139)
        self.assertEqual(elturel.y, 100)

    def test_apply_rescales_coordinates_for_the_given_map(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            call_command("rescale_pin_coordinates", map="elturel", apply=True)
        elturel = Location.objects.get(name="Elturel")
        # scale = 1797 / 1200
        self.assertAlmostEqual(elturel.x, 139 * 1797 / 1200, places=3)
        self.assertAlmostEqual(elturel.y, 100 * 1797 / 1200, places=3)
        self.assertIn("Rescaled 1 pin(s)", buf.getvalue())

    def test_only_touches_pins_for_the_requested_map(self):
        with redirect_stdout(io.StringIO()):
            call_command("rescale_pin_coordinates", map="elturel", apply=True)
        menzo = Location.objects.get(name="Menzoberranzan")
        self.assertEqual(menzo.x, 300)
        self.assertEqual(menzo.y, 200)

    def test_defaults_to_every_map_present_when_no_map_given(self):
        with redirect_stdout(io.StringIO()):
            call_command("rescale_pin_coordinates", apply=True)
        menzo = Location.objects.get(name="Menzoberranzan")
        self.assertNotEqual(menzo.x, 300)

    def test_skips_map_when_image_missing(self):
        self.mock_resolve_image.return_value.exists.return_value = False
        buf = io.StringIO()
        with redirect_stdout(io.StringIO()):
            call_command("rescale_pin_coordinates", map="elturel", apply=True, stderr=buf)
        self.assertIn("Map image not found", buf.getvalue())
        elturel = Location.objects.get(name="Elturel")
        self.assertEqual(elturel.x, 139)
