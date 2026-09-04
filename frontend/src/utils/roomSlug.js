export const ROOM_SLUGS = {
  "Deluxe Room": "deluxe",
  "Deluxe": "deluxe",

  "Suite Room": "suite",
  "Suite": "suite",

  "Suite with Balcony": "suite-with-balcony",
  "Suite With Balcony": "suite-with-balcony",
};

export const SLUG_TO_ROOM_TYPE = {
  deluxe: ["Deluxe Room", "Deluxe"],
  suite: ["Suite Room", "Suite"],
  "suite-with-balcony": [
    "Suite with Balcony",
    "Suite With Balcony",
  ],
};

export const getRoomSlug = (roomType = "") => {
  if (ROOM_SLUGS[roomType]) {
    return ROOM_SLUGS[roomType];
  }

  return roomType
    .toLowerCase()
    .replace(/\s+room$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};