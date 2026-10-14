import BreweryService from "@/api/breweries/breweryService";

export const fetchBreweries = () => BreweryService.getAll();
