from django.test import override_settings
from graphene_django.utils.testing import GraphQLTestCase

from ..models import Location, PointOfInterest


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

    @override_settings(DEBUG=True)
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

    @override_settings(DEBUG=True)
    def test_update_location_mutation(self):
        loc = Location.objects.get(name="Menzoberranzan")
        response = self.query(
            """
            mutation($id: ID!) {
                updateLocation(id: $id, name: "Blingdenstone", x: 180.0, y: 62.0) {
                    location {
                        name
                        x
                        y
                    }
                }
            }
            """,
            variables={"id": loc.id},
        )
        self.assertResponseNoErrors(response)
        location = response.json()["data"]["updateLocation"]["location"]
        self.assertEqual(location["name"], "Blingdenstone")
        self.assertEqual(location["x"], 180.0)
        self.assertEqual(location["y"], 62.0)
        loc.refresh_from_db()
        self.assertEqual(loc.name, "Blingdenstone")
        self.assertEqual(loc.x, 180.0)
        self.assertEqual(loc.y, 62.0)

    @override_settings(DEBUG=True)
    def test_update_location_not_found_returns_error(self):
        response = self.query(
            """
            mutation {
                updateLocation(id: "999999", name: "Nowhere") {
                    location {
                        name
                    }
                }
            }
            """
        )
        self.assertResponseHasErrors(response)

    @override_settings(DEBUG=True)
    def test_delete_location_mutation(self):
        loc = Location.objects.get(name="Menzoberranzan")
        PointOfInterest.objects.create(location=loc, title="Bazaar", description="A market.")
        response = self.query(
            """
            mutation($id: ID!) {
                deleteLocation(id: $id) {
                    success
                    deletedId
                }
            }
            """,
            variables={"id": loc.id},
        )
        self.assertResponseNoErrors(response)
        data = response.json()["data"]["deleteLocation"]
        self.assertTrue(data["success"])
        self.assertEqual(str(data["deletedId"]), str(loc.id))
        self.assertFalse(Location.objects.filter(pk=loc.id).exists())
        self.assertFalse(PointOfInterest.objects.filter(location_id=loc.id).exists())

    @override_settings(DEBUG=True)
    def test_delete_location_not_found_returns_error(self):
        response = self.query(
            """
            mutation {
                deleteLocation(id: "999999") {
                    success
                }
            }
            """
        )
        self.assertResponseHasErrors(response)

    @override_settings(DEBUG=False)
    def test_mutations_rejected_when_debug_false(self):
        loc = Location.objects.get(name="Menzoberranzan")

        create_response = self.query(
            """
            mutation {
                createLocation(name: "ShouldNotExist", x: 1.0, y: 1.0, mapName: "underdark") {
                    location { name }
                }
            }
            """
        )
        self.assertResponseHasErrors(create_response)
        self.assertFalse(Location.objects.filter(name="ShouldNotExist").exists())

        update_response = self.query(
            """
            mutation($id: ID!) {
                updateLocation(id: $id, name: "ShouldNotChange") {
                    location { name }
                }
            }
            """,
            variables={"id": loc.id},
        )
        self.assertResponseHasErrors(update_response)
        loc.refresh_from_db()
        self.assertEqual(loc.name, "Menzoberranzan")

        delete_response = self.query(
            """
            mutation($id: ID!) {
                deleteLocation(id: $id) {
                    success
                }
            }
            """,
            variables={"id": loc.id},
        )
        self.assertResponseHasErrors(delete_response)
        self.assertTrue(Location.objects.filter(pk=loc.id).exists())
