import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
  name: { type: String, required: true },
  population: { type: Number, required: true },
});

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  cities: [citySchema], // Embedded array of cities
});

const Country = mongoose.model("Country", countrySchema);

export default Country;
