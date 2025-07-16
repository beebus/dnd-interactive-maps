from django.db import models

class Location(models.Model):
    name = models.CharField(max_length=100)
    x = models.FloatField()
    y = models.FloatField()

    def __str__(self):
        return self.name

class PointOfInterest(models.Model):
    location = models.ForeignKey(Location, related_name="pois", on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return f"{self.title} at {self.location.name}"
