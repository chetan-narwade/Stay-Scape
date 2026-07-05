require("dotenv").config();
const mongoose = require("mongoose");
const axios    = require("axios");
const Listing  = require("../models/listing");
const initData = require("./data");



// ─────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────
const MONGO_URL    = "mongodb://Chetan_Narwade:Chetan9156@ac-byga9iw-shard-00-00.zgyfc8j.mongodb.net:27017,ac-byga9iw-shard-00-01.zgyfc8j.mongodb.net:27017,ac-byga9iw-shard-00-02.zgyfc8j.mongodb.net:27017/?ssl=true&replicaSet=atlas-9k9uwk-shard-0&authSource=admin&appName=Cluster0";
const SEED_OWNER   = process.env.SEED_OWNER_ID || "64f1a2b3c4d5e6f7a8b9c0d1"; // ✅ replace with a real 24-char ObjectId from your DB
const NOMINATIM_UA = "StayScape-Seed-Script";
const DELAY_MS     = 1100;
console.log("MONGO_URL =", MONGO_URL);
// ─────────────────────────────────────────────────────────
//  VALIDATE OBJECT ID
// ─────────────────────────────────────────────────────────
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

// ─────────────────────────────────────────────────────────
//  GEOCODE HELPER
// ─────────────────────────────────────────────────────────
async function geocode(location, country, fallbackCoords) {
    const query = [location, country].filter(Boolean).join(", ");
    try {
        const res = await axios.get(
            "https://nominatim.openstreetmap.org/search",
            {
                params:  { q: query, format: "json", limit: 1 },
                headers: { "User-Agent": NOMINATIM_UA },
                timeout: 6000
            }
        );

        if (res.data && res.data.length > 0) {
            const lat = parseFloat(res.data[0].lat);
            const lon = parseFloat(res.data[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
                console.log(`  ✅  ${query} → [${lon}, ${lat}]`);
                return { type: "Point", coordinates: [lon, lat] };
            }
        }

        console.warn(`  ⚠️  No result for "${query}" — using sample coords`);
        return { type: "Point", coordinates: fallbackCoords };

    } catch (err) {
        console.error(`  ❌  Geocode failed for "${query}": ${err.message}`);
        return { type: "Point", coordinates: fallbackCoords };
    }
}

// ─────────────────────────────────────────────────────────
//  SLEEP HELPER
// ─────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────
//  SEED
// ─────────────────────────────────────────────────────────
async function initDB() {

    // ✅ Validate initData structure
    if (!initData || !Array.isArray(initData.data) || initData.data.length === 0) {
        throw new Error("data.js must export { data: [ ...listings ] } and must not be empty");
    }

    // ✅ Validate SEED_OWNER is a proper 24-char ObjectId
    if (!isValidObjectId(SEED_OWNER)) {
        throw new Error(`SEED_OWNER "${SEED_OWNER}" is not a valid 24-character MongoDB ObjectId`);
    }

    await Listing.deleteMany({});
    console.log("🗑️  Cleared existing listings\n");

    const total   = initData.data.length;
    const newData = [];
    const failed  = [];

    for (let i = 0; i < total; i++) {

        const obj = initData.data[i];
        console.log(`[${i + 1}/${total}] Processing: ${obj.title}`);

        // ✅ Safe fallback coords
        const fallback = Array.isArray(obj.geometry?.coordinates)
            ? obj.geometry.coordinates
            : [0, 0];

        const geometry = await geocode(obj.location, obj.country, fallback);

        const doc = {
            ...obj,
            owner:    new mongoose.Types.ObjectId(SEED_OWNER),
            geometry,
        };

        // ✅ Validate each doc before pushing — catch schema errors early
        try {
            await new Listing(doc).validate();
            newData.push(doc);
        } catch (validationErr) {
            console.error(`  ❌  Validation failed for "${obj.title}": ${validationErr.message}`);
            failed.push(obj.title);
        }

        if (i < total - 1) await sleep(DELAY_MS);
    }

    if (newData.length === 0) {
        throw new Error("No valid listings to insert. Check your data.js and Listing schema.");
    }

    // ✅ Use ordered: false so one bad doc doesn't block the rest
    await Listing.insertMany(newData, { ordered: false });

    console.log(`\n✅  ${newData.length} listings inserted successfully`);

    if (failed.length > 0) {
        console.warn(`⚠️  ${failed.length} listing(s) skipped due to validation errors:`);
        failed.forEach(title => console.warn(`   - ${title}`));
    }
}

// ─────────────────────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────────────────────
mongoose
    .connect(MONGO_URL)
    .then(() => {
        console.log("✅  MongoDB connected");
        return initDB();
    })
    .then(() => {
        mongoose.connection.close();
        console.log("✅  Connection closed. Done.");
    })
    .catch(err => {
        console.error("\n❌  Fatal error:", err.message);
        mongoose.connection.close();
        process.exit(1);
    });
    