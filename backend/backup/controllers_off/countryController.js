import Country from "../models/Country.js";

// ➤ Get all countries
export const getCountries = async (req, res) => {
  try {
    const countries = await Country.find();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ➤ Get single country by ID
export const getCountryById = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).json({ message: "Country not found" });
    res.json(country);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a new country
export const addCountry = async (req, res) => {
  try {
    const { name, code, cities } = req.body;
    const newCountry = new Country({ name, code, cities });
    await newCountry.save();
    res.status(201).json({ message: "Country added", newCountry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ➤ Add a city to a country
export const addCityToCountry = async (req, res) => {
  try {
    const { name, population } = req.body;
    const country = await Country.findById(req.params.id);

    if (!country) return res.status(404).json({ message: "Country not found" });

    country.cities.push({ name, population });
    await country.save();

    res.json({ message: "City added", country });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ➤ Delete a country
export const deleteCountry = async (req, res) => {
  try {
    await Country.findByIdAndDelete(req.params.id);
    res.json({ message: "Country deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCitybycountry = async (req, res) => {
  const { country } = req.body;

  if (!country) {
    return res.status(400).json({ error: "Country name is required" });
  }

  console.log("🔎 Country to search:", country);

  try {
    // Case-insensitive match so "united arab emirates" also works
    const foundCountry = await Country.findOne({
      name: { $regex: new RegExp("^" + country + "$", "i") },
    }).lean();

    if (!foundCountry) {
      return res.status(404).json({ error: "Country not found" });
    }

    return res.status(200).json({ cities: foundCountry.cities });
  } catch (error) {
    console.error("❌ Error fetching cities:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


