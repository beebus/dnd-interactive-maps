import io
import json
import smtplib
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.core import mail
from django.test import Client, TestCase, override_settings
from graphene_django.utils.testing import GraphQLTestCase

from .management.commands.analyze_map import Command
from .models import Location, PointOfInterest


# ---------------------------------------------------------------------------
# Location model
# ---------------------------------------------------------------------------

class LocationModelTest(TestCase):
    def test_create_location(self):
        loc = Location.objects.create(name="Test Location", x=100, y=200)
        self.assertEqual(loc.name, "Test Location")
        self.assertEqual(loc.x, 100)
        self.assertEqual(loc.y, 200)

    def test_str(self):
        loc = Location(name="Menzoberranzan")
        self.assertEqual(str(loc), "Menzoberranzan")

    def test_default_map(self):
        loc = Location.objects.create(name="Test", x=0, y=0)
        self.assertEqual(loc.map, "underdark")

    def test_poi_relationship(self):
        loc = Location.objects.create(name="Blingdenstone", x=180, y=62, map="underdark")
        poi = PointOfInterest.objects.create(
            location=loc, title="The Royal Council", description="Seat of svirfneblin government"
        )
        # noinspection PyUnresolvedReferences
        self.assertEqual(loc.pois.count(), 1)
        self.assertEqual(str(poi), "The Royal Council at Blingdenstone")


# ---------------------------------------------------------------------------
# analyze_map _compare logic
# ---------------------------------------------------------------------------

class AnalyzeMapCompareTest(TestCase):
    @staticmethod
    def _img(name, x, y):
        return {"name": name, "x": x, "y": y}

    @staticmethod
    def _db(pk, name, x, y):
        return {"id": pk, "name": name, "x": x, "y": y}

    def test_missing_when_no_nearby_pin(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3)]
        db_locs = [self._db(1, "Menzoberranzan", 0.9, 0.9)]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(len(missing), 1)
        self.assertEqual(missing[0]["name"], "Menzoberranzan")
        self.assertEqual(len(mismatched), 0)

    def test_no_issue_when_nearby_and_matching_name(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3)]
        db_locs = [self._db(1, "Menzoberranzan", 0.21, 0.31)]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(len(missing), 0)
        self.assertEqual(len(mismatched), 0)

    def test_mismatched_when_nearby_but_different_name(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3)]
        db_locs = [self._db(1, "Blingdenstone", 0.21, 0.31)]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(len(missing), 0)
        self.assertEqual(len(mismatched), 1)
        self.assertEqual(mismatched[0]["map_name"], "Menzoberranzan")
        self.assertEqual(mismatched[0]["db_name"], "Blingdenstone")

    def test_all_missing_when_db_is_empty(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3), self._img("Blingdenstone", 0.5, 0.5)]
        missing, mismatched = Command._compare(image_locs, [], threshold=0.06)
        self.assertEqual(len(missing), 2)
        self.assertEqual(len(mismatched), 0)

    def test_empty_image_locs_returns_no_issues(self):
        db_locs = [self._db(1, "Menzoberranzan", 0.2, 0.3)]
        missing, mismatched = Command._compare([], db_locs, threshold=0.06)
        self.assertEqual(len(missing), 0)
        self.assertEqual(len(mismatched), 0)


# ---------------------------------------------------------------------------
# GraphQL API
# ---------------------------------------------------------------------------

class GraphQLLocationTest(GraphQLTestCase):
    GRAPHQL_URL = "/graphql/"

    def setUp(self):
        Location.objects.create(name="Menzoberranzan", x=195, y=50, map="underdark")
        Location.objects.create(name="Elturel", x=300, y=400, map="elturel")

    def test_all_locations_returns_all(self):
        response = self.query(
            """
            query {
                allLocations {
                    name
                    x
                    y
                }
            }
            """
        )
        self.assertResponseNoErrors(response)
        data = response.json()["data"]["allLocations"]
        self.assertEqual(len(data), 2)

    def test_all_locations_filtered_by_map(self):
        response = self.query(
            """
            query {
                allLocations(mapName: "underdark") {
                    name
                }
            }
            """
        )
        self.assertResponseNoErrors(response)
        data = response.json()["data"]["allLocations"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Menzoberranzan")

    def test_all_locations_empty_for_unknown_map(self):
        response = self.query(
            """
            query {
                allLocations(mapName: "faerun") {
                    name
                }
            }
            """
        )
        self.assertResponseNoErrors(response)
        self.assertEqual(response.json()["data"]["allLocations"], [])

    def test_create_location_mutation(self):
        response = self.query(
            """
            mutation {
                createLocation(name: "Blingdenstone", x: 180.0, y: 62.0, mapName: "underdark") {
                    location {
                        name
                        x
                        y
                    }
                }
            }
            """
        )
        self.assertResponseNoErrors(response)
        location = response.json()["data"]["createLocation"]["location"]
        self.assertEqual(location["name"], "Blingdenstone")
        self.assertEqual(location["x"], 180.0)
        self.assertEqual(location["y"], 62.0)
        self.assertTrue(Location.objects.filter(name="Blingdenstone").exists())


# ---------------------------------------------------------------------------
# contact view
# ---------------------------------------------------------------------------

class ContactViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/contact/"
        self.valid_payload = {
            "name": "Drizzt Do'Urden",
            "email": "drizzt@menzoberranzan.test",
            "message": "Love the map, thanks!",
        }

    def test_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 405)

    def test_invalid_json_body_returns_400(self):
        response = self.client.post(self.url, data="not-json", content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "Invalid request."})

    def test_missing_fields_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"name": "", "email": "", "message": ""}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "All fields are required."})

    def test_whitespace_only_fields_are_treated_as_missing(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"name": "   ", "email": "drizzt@menzoberranzan.test", "message": "hi"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "All fields are required."})

    def test_invalid_email_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({**self.valid_payload, "email": "not-an-email"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "Invalid email address."})

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@dndmaps.test",
        CONTACT_EMAIL="owner@dndmaps.test",
    )
    def test_valid_submission_sends_email_and_returns_ok(self):
        response = self.client.post(
            self.url, data=json.dumps(self.valid_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.subject, "[D&D Maps] Comment from Drizzt Do'Urden")
        self.assertIn("Love the map, thanks!", sent.body)
        self.assertEqual(sent.to, ["owner@dndmaps.test"])

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@dndmaps.test",
        CONTACT_EMAIL="owner@dndmaps.test",
    )
    def test_strips_whitespace_from_submitted_fields(self):
        padded_payload = {
            "name": "  Drizzt  ",
            "email": "  drizzt@menzoberranzan.test  ",
            "message": "  hi there  ",
        }
        response = self.client.post(
            self.url, data=json.dumps(padded_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Drizzt", mail.outbox[0].subject)
        self.assertNotIn("  Drizzt  ", mail.outbox[0].subject)

    @patch("mapdata.views.send_mail", side_effect=smtplib.SMTPException("connection refused"))
    def test_smtp_failure_returns_500(self, _mock_send_mail):
        response = self.client.post(
            self.url, data=json.dumps(self.valid_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"error": "Failed to send message. Please try again later."})

    @patch("mapdata.views.send_mail", side_effect=OSError("network unreachable"))
    def test_os_error_returns_500(self, _mock_send_mail):
        response = self.client.post(
            self.url, data=json.dumps(self.valid_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"error": "Failed to send message. Please try again later."})


# ---------------------------------------------------------------------------
# analyze_map._resolve_image
# ---------------------------------------------------------------------------

class AnalyzeMapResolveImageTest(TestCase):
    def test_override_path_is_used_verbatim(self):
        result = Command._resolve_image("/some/custom/path.jpg", "underdark")
        self.assertEqual(result, Path("/some/custom/path.jpg"))

    @patch("mapdata.management.commands.analyze_map.Path.exists")
    def test_uses_docker_mount_path_when_present(self, mock_exists):
        mock_exists.return_value = True
        result = Command._resolve_image(None, "underdark")
        self.assertEqual(result, Path("/maps/underdark.jpg"))

    @patch("mapdata.management.commands.analyze_map.Path.exists")
    def test_falls_back_to_repo_relative_path_when_docker_mount_absent(self, mock_exists):
        mock_exists.return_value = False
        result = Command._resolve_image(None, "underdark")
        self.assertEqual(
            result,
            Path(__file__).resolve().parents[2] / "frontend" / "public" / "maps" / "underdark.jpg",
        )


# ---------------------------------------------------------------------------
# analyze_map._jpeg_dimensions
# ---------------------------------------------------------------------------

class AnalyzeMapJpegDimensionsTest(TestCase):
    @staticmethod
    def _minimal_sof0_jpeg(width: int, height: int) -> bytes:
        return bytes([
            0xFF, 0xD8,  # SOI
            0xFF, 0xC0,  # SOF0 marker
            0x00, 0x0B,  # segment length
            0x08,  # precision
            (height >> 8) & 0xFF, height & 0xFF,
            (width >> 8) & 0xFF, width & 0xFF,
            0x03,  # number of components
            0x00, 0x00, 0x00,
        ])

    def test_reads_width_and_height_from_sof0_marker(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.jpg"
            path.write_bytes(self._minimal_sof0_jpeg(width=600, height=400))
            w, h = Command._jpeg_dimensions(path)
        self.assertEqual((w, h), (600, 400))

    def test_raises_value_error_when_no_sof_marker_present(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "bad.jpg"
            path.write_bytes(bytes([0xFF, 0xD8, 0xFF, 0xD9]))  # SOI + EOI, no SOF
            with self.assertRaises(ValueError):
                Command._jpeg_dimensions(path)


# ---------------------------------------------------------------------------
# analyze_map._print_report
# ---------------------------------------------------------------------------

class AnalyzeMapPrintReportTest(TestCase):
    def test_reports_no_inconsistencies(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._print_report([], [])
        self.assertIn("No inconsistencies found.", buf.getvalue())

    def test_reports_missing_pins(self):
        missing = [{"name": "Menzoberranzan", "x": 0.2, "y": 0.3}]
        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._print_report(missing, [])
        output = buf.getvalue()
        self.assertIn("1 MISSING pin(s)", output)
        self.assertIn("Menzoberranzan", output)

    def test_reports_mismatched_pins(self):
        mismatched = [{"map_name": "Menzoberranzan", "db_name": "Blingdenstone", "db_id": 1, "distance": 0.01}]
        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._print_report([], mismatched)
        output = buf.getvalue()
        self.assertIn("1 NAME MISMATCH(ES)", output)
        self.assertIn("Menzoberranzan", output)
        self.assertIn("Blingdenstone", output)


# ---------------------------------------------------------------------------
# analyze_map._create_pins
# ---------------------------------------------------------------------------

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
