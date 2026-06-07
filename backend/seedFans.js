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
const countries = Object.keys(populationWeights).filter(c => c !== 'default');

async function seedFans() {
  const totalWeight = Object.values(populationWeights).reduce((a, b) => a + b, 0);
  const TARGET_TOTAL = 1000;

  console.log(`Starting seeding process for 1,000 agents...`);

  for (const country of countries) {
    const weight = populationWeights[country] || populationWeights.default;
    const baseCount = Math.round((weight / totalWeight) * TARGET_TOTAL);

    if (baseCount === 0) continue;

    console.log(`Generating ${baseCount} fans for ${country}...`);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Generate a JSON object for ${country} football fans. 
          Return strictly this structure: { 
            "fans": [{"fullName": "string", "gender": "Male" or "Female"}], 
            "language": "string", 
            "archetypes": [{"archetypeName": "string", "traitKeywords": ["string"]}] 
          }. Generate 20 distinct, unique full names for the fans array.`
        }],
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(completion.choices[0].message.content);

      if (!parsed.fans || parsed.fans.length < 5) {
        throw new Error(`AI returned incomplete data for ${country}`);
      }

      const { fans: fanPool, language, archetypes } = parsed;

      const fans = Array.from({ length: baseCount }, (_, i) => {
        const fanData = fanPool[i % fanPool.length];
        const arch = archetypes[Math.floor(Math.random() * archetypes.length)];

        return {
          name: fanData.fullName,
          country,
          language: language || "Unknown",
          gender: fanData.gender,
          age: Math.floor(Math.random() * 47) + 18,
          archetype: arch.archetypeName,
          traits: arch.traitKeywords,
          current_city: "Unknown",
          current_hub_id: Math.floor(Math.random() * 16) + 1,
          current_goal: "Explore",
          status_activity: "idle",
          memories: [],
          last_speech: "..."
        };
      });

      const { error } = await supabase.from("agents").insert(fans);
      if (error) throw new Error(error.message);

      // API Rate limit safety delay
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (err) {
      console.error(`Failed to process ${country}: ${err.message}`);
    }
  }
  console.log("Seeding complete. Database population successful.");
}

seedFans();