import express from "express";
import {
  getCountries,
  getCountryById,
  addCountry,
  addCityToCountry,
  deleteCountry,
  getCitybycountry
} from "../controllers/countryController.js";

const router = express.Router();

router.get("/", getCountries);
router.get("/:id", getCountryById);
router.post("/getcityname", getCitybycountry)
router.post("/", addCountry);
router.post("/:id/cities", addCityToCountry);
router.delete("/:id", deleteCountry);

export default router;
