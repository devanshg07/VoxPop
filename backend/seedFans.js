import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const populationWeights = {
  Canada: 60, USA: 80, Mexico: 60, Brazil: 50, France: 50, Argentina: 50,
  Germany: 50, England: 50, Spain: 50, Netherlands: 50, Portugal: 50,
  SouthAfrica: 15, Colombia: 40, Belgium: 30, Morocco: 30,
  Korea: 30, Japan: 30, SaudiArabia: 30, Iran: 30, Uruguay: 40,
  Türkiye: 40, Sweden: 40, Switzerland: 40, Senegal: 15, Ghana: 15,
  IvoryCoast: 15, Algeria: 15, Ecuador: 15, Czechia: 30, Australia: 15,
  Scotland: 30, Paraguay: 15, Iraq: 15, CaboVerde: 5, Qatar: 5,
  Tunisia: 5, Haiti: 5, Curaçao: 5, BosniaAndHerzegovina: 5,
  Jordan: 5, DRCongo: 5, Uzbekistan: 5, Austria: 5, Norway: 5,
  Panama: 5,
  default: 10
};

// Map based on your database hub table
const locationMap = [
  { id: 1, city: "Toronto", country: "Canada" },
  { id: 2, city: "Vancouver", country: "Canada" },
  { id: 3, city: "Mexico City", country: "Mexico" },
  { id: 4, city: "Guadalajara", country: "Mexico" },
  { id: 5, city: "Monterrey", country: "Mexico" },
  { id: 6, city: "Atlanta", country: "USA" },
  { id: 7, city: "Boston", country: "USA" },
  { id: 8, city: "Dallas", country: "USA" },
  { id: 9, city: "Houston", country: "USA" },
  { id: 10, city: "Kansas City", country: "USA" },
  { id: 11, city: "Los Angeles", country: "USA" },
  { id: 12, city: "Miami", country: "USA" },
  { id: 13, city: "New York/NJ", country: "USA" },
  { id: 14, city: "Philadelphia", country: "USA" },
  { id: 15, city: "San Francisco", country: "USA" },
  { id: 16, city: "Seattle", country: "USA" }
];

function getLocationForCountry(country) {
  const validHubs = locationMap.filter(h => h.country === country);
  if (validHubs.length > 0) {
    return validHubs[Math.floor(Math.random() * validHubs.length)];
  }
  return locationMap[Math.floor(Math.random() * locationMap.length)];
}

async function seedFans() {
  const totalWeight = Object.values(populationWeights).reduce((a, b) => a + b, 0);
  const TARGET_TOTAL = 100; // Scaled to 100

  console.log(`Starting seeding process for ${TARGET_TOTAL} agents...`);

  for (const country in populationWeights) {
    if (country === 'default') continue;
    
    // Ensure at least 1 fan, otherwise distribute by weight
    const weight = populationWeights[country];
    const baseCount = Math.max(1, Math.round((weight / totalWeight) * TARGET_TOTAL));

    console.log(`Generating ${baseCount} fans for ${country}...`);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Generate a JSON object for ${country} football fans. 
          Return: { "fans": [{"fullName": "string", "gender": "Male" | "Female"}], "language": "string", "archetypes": [{"archetypeName": "string", "traitKeywords": ["string"]}] }. 
          Generate 20 unique full names.`
        }],
        response_format: { type: "json_object" }
      });

      const { fans: fanPool, language, archetypes } = JSON.parse(completion.choices[0].message.content);

      const fans = Array.from({ length: baseCount }, (_, i) => {
        const fanData = fanPool[i % fanPool.length];
        const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
        const loc = getLocationForCountry(country);

        return {
          name: fanData.fullName,
          country,
          language: language || "English",
          gender: fanData.gender,
          age: Math.floor(Math.random() * 47) + 18,
          archetype: arch.archetypeName,
          traits: arch.traitKeywords,
          current_city: loc.city,
          current_hub_id: loc.id,
          current_goal: "Explore",
          status_activity: "idle",
          memories: [],
          last_speech: "..."
        };
      });

      const { error } = await supabase.from("agents").insert(fans);
      if (error) console.error(`Error inserting ${country}:`, error.message);

      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      console.error(`Failed to process ${country}: ${err.message}`);
    }
  }
  console.log("Seeding complete. Database population successful.");
}

seedFans();