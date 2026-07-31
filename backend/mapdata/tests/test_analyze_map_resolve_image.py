from pathlib import Path
from unittest.mock import patch

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapResolveImageTest(TestCase):
    def test_override_path_is_used_verbatim(self):
        result = Command._resolve_image("/some/custom/path.jpg", "underdark")
        self.assertEqual(result, Path("/some/custom/path.jpg"))

    @patch("mapdata.management.commands.analyze_map.Path.exists")
    @patch.object(Command, "_load_manifest")
    def test_uses_manifest_filename_from_docker_mount(self, mock_load_manifest, mock_exists):
        mock_load_manifest.return_value = {"underdark": "Underdark_1.jpg"}
        mock_exists.return_value = True
        result = Command._resolve_image(None, "underdark")
        self.assertEqual(result, Path("/maps/Underdark_1.jpg"))

    @patch("mapdata.management.commands.analyze_map.Path.exists")
    @patch.object(Command, "_load_manifest")
    def test_falls_back_to_repo_relative_manifest_when_docker_manifest_lacks_key(
        self, mock_load_manifest, mock_exists
    ):
        # Docker manifest doesn't have this key; repo-relative manifest does.
        # The matching image also only exists in the repo image dir, not the docker one.
        mock_load_manifest.side_effect = [{}, {"candlekeep_outer": "Candlekeep_1.jpg"}]
        mock_exists.side_effect = [False, True]
        result = Command._resolve_image(None, "candlekeep_outer")
        self.assertEqual(
            result,
            Path(__file__).resolve().parents[3] / "frontend" / "public" / "maps" / "Candlekeep_1.jpg",
        )

    @patch("mapdata.management.commands.analyze_map.Path.exists")
    @patch.object(Command, "_load_manifest")
    def test_falls_back_to_extension_guessing_when_key_not_in_any_manifest(
        self, mock_load_manifest, mock_exists
    ):
        mock_load_manifest.return_value = {}
        # Phase 2 checks, in order: docker .jpg/.jpeg/.png/.webp, then repo .jpg/.jpeg/.png/.webp.
        mock_exists.side_effect = [False, False, False, False, False, False, True]
        result = Command._resolve_image(None, "underdark")
        self.assertEqual(
            result,
            Path(__file__).resolve().parents[3] / "frontend" / "public" / "maps" / "underdark.png",
        )

    @patch("mapdata.management.commands.analyze_map.Path.exists")
    @patch.object(Command, "_load_manifest")
    def test_falls_back_to_default_jpg_guess_when_nothing_found(self, mock_load_manifest, mock_exists):
        mock_load_manifest.return_value = {}
        mock_exists.return_value = False
        result = Command._resolve_image(None, "underdark")
        self.assertEqual(
            result,
            Path(__file__).resolve().parents[3] / "frontend" / "public" / "maps" / "underdark.jpg",
        )
