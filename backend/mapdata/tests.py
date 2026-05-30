from django.test import TestCase
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
