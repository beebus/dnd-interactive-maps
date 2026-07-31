import io
from contextlib import redirect_stdout
from unittest.mock import MagicMock

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapCreatePinsTest(TestCase):
    def test_creates_pins_with_coordinates_scaled_and_rounded(self):
        location_model = MagicMock()
        location_model.objects.bulk_create.return_value = [MagicMock(), MagicMock()]
        missing = [
            {"name": "Menzoberranzan", "x": 0.25, "y": 0.5},
            {"name": "Blingdenstone", "x": 0.1, "y": 0.9},
        ]

        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._create_pins(missing, "underdark", display_w=1000, display_h=800, location_model=location_model)

        location_model.objects.bulk_create.assert_called_once()
        created_instances = location_model.objects.bulk_create.call_args[0][0]
        self.assertEqual(len(created_instances), 2)

        call_kwargs = [c.kwargs for c in location_model.call_args_list]
        self.assertIn({"name": "Menzoberranzan", "x": 250, "y": 400, "map": "underdark"}, call_kwargs)
        self.assertIn({"name": "Blingdenstone", "x": 100, "y": 720, "map": "underdark"}, call_kwargs)
        self.assertIn("Created 2 new pin(s)", buf.getvalue())
