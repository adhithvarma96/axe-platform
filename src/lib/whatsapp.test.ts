import { describe, expect, it } from "vitest";
import { rentText, saleText, whatsappWriteup, type WriteupInput } from "./whatsapp";

const apt: WriteupInput = {
  listing_no: "AX260011", property_type: "apartment", listing_types: ["rent_long_term", "sale"],
  beds: 2, baths: 2, square_feet: 1250, furnished: "fully", asking_rent: 325000, rent_currency: "LKR",
  asking_sale_price: 95_000_000, sale_currency: "LKR", public_notes: "Sea facing, high floor.",
  development: "Altair", tower: "Sky Tower", location: "Colombo 02", features: ["Penthouse", "Sea View"],
};

describe("whatsapp write-up", () => {
  it("formats prices the SPEC way", () => {
    expect(rentText(325000, "LKR")).toBe("LKR 325,000/month");
    expect(saleText(95_000_000, "LKR")).toBe("LKR 95M");
    expect(saleText(1_250_000_000, "LKR")).toBe("LKR 1.25B");
    expect(saleText(450000, "USD")).toBe("USD 450,000");
  });

  it("builds the apartment write-up with agent footer and gallery link", () => {
    const text = whatsappWriteup(apt, { galleryUrl: "https://axerealty.lk/g/abc", contact: { name: "Nimal Perera", title: "Property Consultant", phone: "+94 77 000 0000" } });
    expect(text).toBe([
      "*AX260011*",
      "*2 Bed Penthouse Apartment For Rent & Sale In Colombo 02*",
      "-Altair - Sky Tower",
      "-2 Beds / 2 Baths",
      "-1,250 Sq. Ft.",
      "-Furnished Status - Fully Furnished",
      "-Features - Penthouse, Sea View",
      "-Asking Rental - LKR 325,000/month",
      "-Asking Sale Price - LKR 95M",
      "",
      "*Additional Property Notes:*",
      "Sea facing, high floor.",
      "",
      "Property Pictures Link - https://axerealty.lk/g/abc",
      "",
      "For more information please Call/WhatsApp :",
      "Nimal Perera | Property Consultant",
      "Axe Realty",
      "+94 77 000 0000",
      "www.axerealty.lk",
    ].join("\n"));
  });

  it("omits empty lines and falls back to the company line", () => {
    const text = whatsappWriteup({ ...apt, tower: null, square_feet: null, furnished: "unknown", features: [], public_notes: " ", asking_sale_price: null, listing_types: ["rent_long_term"] },
      { galleryUrl: null, contact: null });
    expect(text).toContain("*2 Bed Apartment For Rent In Colombo 02*\n-Altair\n-2 Beds / 2 Baths\n-Asking Rental");
    expect(text).not.toContain("Notes");
    expect(text).toContain("Property Pictures Link - Available on request");
    expect(text.endsWith("Call/WhatsApp :\nAxe Realty\n+94 77 791 8396\nwww.axerealty.lk")).toBe(true);
  });

  it("uses the land layout", () => {
    const text = whatsappWriteup({ ...apt, property_type: "land", listing_types: ["sale"], beds: null, baths: null, land_extent_perches: 20, frontage_ft: 60, electricity_available: true }, { galleryUrl: null, contact: null });
    expect(text).toContain("*Land For Sale In Colombo 02*\n-20 Perches\n-Frontage - 60 ft\n-Electricity Available\n-Asking Sale Price - LKR 95M");
  });
});
