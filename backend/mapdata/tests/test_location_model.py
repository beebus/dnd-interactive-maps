from django.test import TestCase

from ..models import Location, PointOfInterest


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
