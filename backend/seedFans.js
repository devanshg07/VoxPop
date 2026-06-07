import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const populationWeights = {
  'Canada': 60, 'USA': 80, 'Mexico': 60, 'Brazil': 50, 'France': 50, 'Argentina': 50,
  'Germany': 50, 'England': 50, 'Spain': 50, 'Netherlands': 50, 'Portugal': 50,
  'South Africa': 15, 'Colombia': 40, 'Belgium': 30, 'Morocco': 30, 'Korea': 30,
  'Japan': 30, 'Saudi Arabia': 30, 'Iran': 30, 'Uruguay': 40, 'Türkiye': 40,
  'Sweden': 40, 'Switzerland': 40, 'Senegal': 15, 'Ghana': 15, 'Ivory Coast': 15,
  'Algeria': 15, 'Ecuador': 15, 'Czechia': 30, 'Australia': 15, 'Scotland': 30,
  'Paraguay': 15, 'Iraq': 15, 'Cabo Verde': 5, 'Qatar': 5, 'Tunisia': 5, 'Haiti': 5,
  'Curaçao': 5, 'Bosnia and Herzegovina': 5, 'Jordan': 5, 'DR Congo': 5, 'Uzbekistan': 5,
  'Austria': 5, 'Norway': 5, 'Panama': 5, 'default': 10
};

const names = {
  'Canada': { first: ["Liam","Noah","Emma","Ava","Oliver","Sophia"], last: ["Smith","Brown","Wilson","Taylor"] },
  'USA': { first: ["James","John","Michael","David","Emily","Sarah"], last: ["Johnson","Williams","Brown","Jones"] },
  'Mexico': { first: ["Jose","Luis","Carlos","Juan","Miguel","Sofia"], last: ["Hernandez","Lopez","Gomez","Perez"] },
  'Costa Rica': { first: ["Andres","Diego","Luis","Maria","Sofia","Carlos"], last: ["Jimenez","Rojas","Vargas","Morales"] },
  'Panama': { first: ["Jose","Carlos","Luis","Ana","Maria","David"], last: ["Gonzalez","Rodriguez","Martinez","Perez"] },
  'Jamaica': { first: ["Dwayne","Andre","Shane","Tyrone","Aaliyah","Keisha"], last: ["Williams","Brown","Campbell","Johnson"] },
  'Brazil': { first: ["Joao","Lucas","Pedro","Gabriel","Maria","Ana"], last: ["Silva","Santos","Costa","Lima"] },
  'Argentina': { first: ["Juan","Mateo","Lautaro","Santiago","Valentina","Camila"], last: ["Gonzalez","Rodriguez","Fernandez","Lopez"] },
  'Uruguay': { first: ["Diego","Nicolas","Facundo","Martin","Lucia","Sofia"], last: ["Silva","Perez","Gomez","Rios"] },
  'Colombia': { first: ["Juan","Sebastian","Andres","Carlos","Maria","Valeria"], last: ["Rodriguez","Gomez","Martinez","Lopez"] },
  'Chile': { first: ["Diego","Matias","Javier","Nicolas","Sofia","Isidora"], last: ["Sanchez","Perez","Diaz","Torres"] },
  'Ecuador': { first: ["Luis","Carlos","Jose","Andres","Maria","Gabriela"], last: ["Morales","Castro","Reyes","Vera"] },
  'England': { first: ["James","Oliver","Harry","Jack","Emily","Grace"], last: ["Smith","Jones","Taylor","Brown"] },
  'France': { first: ["Pierre","Louis","Hugo","Emma","Chloe","Julien"], last: ["Martin","Bernard","Dubois","Moreau"] },
  'Germany': { first: ["Lukas","Leon","Noah","Emma","Mia","Paul"], last: ["Muller","Schmidt","Fischer","Weber"] },
  'Spain': { first: ["Carlos","Javier","Diego","Sofia","Lucia","Miguel"], last: ["Garcia","Lopez","Martinez","Sanchez"] },
  'Portugal': { first: ["Joao","Miguel","Tiago","Andre","Ana","Ines"], last: ["Silva","Santos","Ferreira","Pereira"] },
  'Italy': { first: ["Luca","Marco","Giovanni","Alessio","Sofia","Giulia"], last: ["Rossi","Russo","Ferrari","Esposito"] },
  'Netherlands': { first: ["Daan","Lars","Jesse","Emma","Sophie","Noah"], last: ["De Jong","Jansen","De Vries","Bakker"] },
  'Belgium': { first: ["Lucas","Louis","Mathis","Emma","Louise","Mila"], last: ["Dubois","Lambert","Dupont","Peeters"] },
  'Croatia': { first: ["Ivan","Luka","Marko","Nikola","Ana","Ivana"], last: ["Horvat","Kovac","Maric","Peric"] },
  'Denmark': { first: ["Frederik","Mikkel","Oliver","Emma","Sofia","Lucas"], last: ["Jensen","Nielsen","Hansen","Larsen"] },
  'Switzerland': { first: ["Luca","Noah","Leon","Emma","Mia","Sofia"], last: ["Muller","Meier","Schneider","Weber"] },
  'Sweden': { first: ["Liam","Oscar","Elias","Alma","Maja","Ella"], last: ["Johansson","Andersson","Karlsson","Nilsson"] },
  'Poland': { first: ["Jan","Piotr","Adam","Kacper","Zofia","Anna"], last: ["Nowak","Kowalski","Wisniewski","Wojcik"] },
  'Austria': { first: ["Lukas","Paul","David","Emma","Anna","Sophie"], last: ["Gruber","Huber","Bauer","Wagner"] },
  'Serbia': { first: ["Marko","Nikola","Luka","Stefan","Ana","Mila"], last: ["Jovanovic","Petrovic","Nikolic","Markovic"] },
  'Ukraine': { first: ["Oleksandr","Dmytro","Andrii","Ivan","Olena","Maria"], last: ["Shevchenko","Kovalenko","Bondarenko","Tkachenko"] },
  'Norway': { first: ["Liam","Oliver","Emil","Emma","Sofie","Noah"], last: ["Hansen","Johansen","Olsen","Larsen"] },
  'Scotland': { first: ["Jack","James","Callum","Eilidh","Hannah","Logan"], last: ["Smith","Brown","MacLeod","Campbell"] },
  'Japan': { first: ["Haruto","Yuto","Sota","Yuki","Ren","Aiko"], last: ["Sato","Suzuki","Takahashi","Tanaka"] },
  'South Korea': { first: ["Minho","Jisoo","Seojun","Jiho","Yuna","Sora"], last: ["Kim","Lee","Park","Choi"] },
  'Iran': { first: ["Ali","Reza","Amir","Mohammad","Sara","Neda"], last: ["Hosseini","Ahmadi","Mohammadi","Karimi"] },
  'Saudi Arabia': { first: ["Fahad","Omar","Saad","Yousef","Aisha","Noor"], last: ["Al-Saud","Al-Harbi","Al-Qahtani","Al-Dosari"] },
  'Australia': { first: ["Liam","Noah","Oliver","Jack","Charlotte","Amelia"], last: ["Smith","Brown","Wilson","Taylor"] },
  'Qatar': { first: ["Mohammed","Ahmed","Hassan","Ali","Fatima","Noor"], last: ["Al-Thani","Al-Kuwari","Al-Mahmoud","Al-Hassan"] },
  'Iraq': { first: ["Ali","Hassan","Omar","Youssef","Sara","Zainab"], last: ["Hussein","Abdullah","Hadi","Karim"] },
  'Uzbekistan': { first: ["Aziz","Bek","Rustam","Javohir","Malika","Dilnoza"], last: ["Karimov","Abdullayev","Tursunov","Ismailov"] },
  'Morocco': { first: ["Youssef","Omar","Rayan","Achraf","Fatima","Sara"], last: ["El Amrani","Bennani","Zahir","Haddad"] },
  'Senegal': { first: ["Mamadou","Ibrahima","Ousmane","Cheikh","Awa","Fatou"], last: ["Ndiaye","Diop","Sow","Ba"] },
  'Nigeria': { first: ["Chinedu","Emeka","Tunde","Adebayo","Aisha","Zainab"], last: ["Okafor","Ibe","Balogun","Oluwaseun"] },
  'Egypt': { first: ["Ahmed","Mohamed","Omar","Hassan","Nour","Mona"], last: ["Ali","Hassan","Ibrahim","Mahmoud"] },
  'Algeria': { first: ["Yacine","Karim","Rachid","Mohamed","Lina","Sara"], last: ["Benali","Haddad","Bouzid","Khelifi"] },
  'Ghana': { first: ["Kwame","Kofi","Yaw","Kojo","Ama","Akosua"], last: ["Mensah","Boateng","Osei","Addo"] },
  'Tunisia': { first: ["Mohamed","Ali","Youssef","Amine","Ines","Sarra"], last: ["Trabelsi","Haddad","Ben Ali","Mansour"] },
  'Cameroon': { first: ["Samuel","Andre","Eric","Jean","Amina","Grace"], last: ["Eto","Ngassa","Mbappe","Tchouameni"] },
  'South Africa': { first: ["Sipho","Thabo","Lerato","Andile","Zanele","Nomsa"], last: ["Nkosi","Dlamini","Mokoena","Zuma"] },
  'New Zealand': { first: ["Liam","Noah","Oliver","Ella","Sophie","Jack"], last: ["Smith","Brown","Wilson","Taylor"] }
};

function generateUniqueName(country) {
  const pool = names[country] || names['Canada'];
  const first = pool.first[Math.floor(Math.random() * pool.first.length)];
  const last = pool.last[Math.floor(Math.random() * pool.last.length)];
  
  // Naming strategies to create human-readable variation
  const strategies = [
    () => `${first} ${last}`,
    () => `${first} ${last.charAt(0)}.${last}`,
    () => `${first} ${last} ${['Jr', 'Sr', 'III'][Math.floor(Math.random() * 3)]}`,
    () => `${first} ${['van', 'de', 'del'][Math.floor(Math.random() * 3)]} ${last}`,
    () => `${['Ultra', 'Casual', 'Pro'][Math.floor(Math.random() * 3)]} ${first} ${last}`
  ];

  return strategies[Math.floor(Math.random() * strategies.length)]();
}

async function seedFans() {
  const countries = Object.keys(populationWeights).filter(c => c !== 'default');
  
  for (const country of countries) {
    const baseCount = populationWeights[country] || populationWeights.default;
    
    // We fetch archetypes from OpenAI once per country to provide a "mood" for that local crowd
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Return JSON {archetypes: [{archetypeName, traitKeywords, emotionalVolatility}]}" },
                 { role: "user", content: `Create 5 fan archetypes for ${country} football fans.` }],
      response_format: { type: "json_object" }
    });

    const { archetypes } = JSON.parse(completion.choices[0].message.content);

    const fans = Array.from({ length: baseCount * 5 }, () => {
      const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
      return {
        name: generateUniqueName(country),
        country_loyalty: country,
        archetype: arch.archetypeName,
        traits: arch.traitKeywords,
        current_mood_intensity: Math.floor(Math.random() * 9) + 1,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        race: 'Human',
        age: Math.floor(Math.random() * 47) + 18,
        current_city: country === 'Canada' ? 'Toronto' : 'Unknown',
        current_hub_id: Math.floor(Math.random() * 16) + 1,
        current_goal: 'Explore',
        last_speech: '...',
        status_activity: 'idle',
        memories: []
      };
    });

    const { error } = await supabase.from('agents').insert(fans);
    if (error) console.error(`Error for ${country}: ${error.message}`);
    else console.log(`Seeded ${fans.length} fans for ${country}`);
  }
}

seedFans();