import graphene
from graphene_django.types import DjangoObjectType
from mapdata.models import Location, PointOfInterest

class LocationType(DjangoObjectType):
    class Meta:
        model = Location
        fields = ("id", "name", "x", "y", "pois")

class PointOfInterestType(DjangoObjectType):
    class Meta:
        model = PointOfInterest
        fields = ("title", "description")

class CreateLocation(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        x = graphene.Float(required=True)
        y = graphene.Float(required=True)

    location = graphene.Field(LocationType)

    def mutate(self, info, name, x, y):
        loc = Location(name=name, x=x, y=y)
        loc.save()
        return CreateLocation(location=loc)

class Query(graphene.ObjectType):
    all_locations = graphene.List(LocationType)

    def resolve_all_locations(self, info):
        return Location.objects.all()

class Mutation(graphene.ObjectType):
    create_location = CreateLocation.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
