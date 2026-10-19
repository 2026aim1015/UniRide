
export type CampusStation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  availableBicycles: number;
  status: "active" | "inactive";
};

export const campusStations: CampusStation[] = [
  {
    id: 1,
    name: "Demo Station A",
    latitude: 30.9660,
    longitude: 76.4730,
    availableBicycles: 5,
    status: "active",
  },
  {
    id: 2,
    name: "Demo Station B",
    latitude: 30.9680,
    longitude: 76.4760,
    availableBicycles: 3,
    status: "active",
  },
  {
    id: 3,
    name: "Demo Station C",
    latitude: 30.9640,
    longitude: 76.4790,
    availableBicycles: 0,
    status: "inactive",
  },
  {
    id: 4,
    name: "Library Station",
    latitude: 30.9670,
    longitude: 76.4740,
    availableBicycles: 4,
    status: "active",
  },
  {
    id: 5,
    name: "Hostel Station",
    latitude: 30.9650,
    longitude: 76.4770,
    availableBicycles: 6,
    status: "active",
  },
  {
    id: 6,
    name: "Academic Block Station",
    latitude: 30.9690,
    longitude: 76.4750,
    availableBicycles: 2,
    status: "active",
  },
];
