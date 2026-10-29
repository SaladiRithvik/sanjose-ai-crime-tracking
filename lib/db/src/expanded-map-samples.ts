import type { reportsTable } from './schema/reports';

type SeedReport = typeof reportsTable.$inferInsert;

/** Internal provenance remains demo; public descriptions use ordinary submissions. */
const submissions: Record<string, readonly string[]> = {
  'Fraud': [
    'Someone near {place} asked me to pay a delivery fee using a QR code. I checked the company website and the tracking number did not exist.',
    'I paid a deposit for a used laptop after meeting near {place}. The seller stopped responding and never brought the laptop.',
    'Several people near {place} were being directed to a payment page that copied a local charity. I saw two people enter card details.',
    'A person near {place} offered discounted event tickets. The ticket numbers were rejected when I checked with the organizer.',
  ],
  'Forgery': [
    'I was shown a parking permit near {place} with a date that had been changed by hand. I did not buy it.',
    'A rental application given to me near {place} had a signature that the listed contact said was not theirs.',
    'Someone near {place} was using a copied staff badge to ask people for payment information. I let the building staff know.',
    'A receipt provided after a sale near {place} used a store name that the store did not recognize.',
  ],
  'Forgery — Bad Checks': [
    'A buyer I met near {place} offered a check with mismatched printed and written amounts. I declined the payment.',
    'A check from a sale arranged near {place} was returned by my bank. The buyer has not answered my messages.',
    'A person near {place} offered to pay students by check and asked them to return part of the money immediately.',
    'The bank could not verify a check I received after meeting near {place}. I still have the messages about the sale.',
  ],
  'Fraudulent Use of Credit/Debit Card': [
    'I noticed a small card charge while sitting near {place}. I did not recognize the merchant and locked the card.',
    'After visiting {place}, I found two purchases I had not made. My card was still in my wallet.',
    'My card went missing near {place} and multiple charges appeared before I could freeze it.',
    'A payment notification arrived while I was near {place}, although I had not used that card that day.',
  ],
  'Harassing Communications': [
    'I received an unwanted message while near {place} after asking the sender not to contact me.',
    'The same number kept calling me during a visit to {place}. I blocked it, but calls continued from another number.',
    'Messages received near {place} included threats to confront me on campus. I saved screenshots and notified staff.',
    'A group chat kept sending insulting messages after I left it. I was near {place} when the latest messages arrived.',
  ],
  'Identity Theft': [
    'While near {place}, I received an account-opening email I had not requested. I contacted the provider before entering any information.',
    'I discovered an unfamiliar account using my information while checking my email at {place}.',
    'I received several alerts for new accounts in my name while near {place}. One included a balance I did not recognize.',
    'A service contacted me about an application I never submitted. I checked the notice while at {place}.',
  ],
  'Lost Property': [
    'I left a reusable water bottle on a bench near {place}. It was gone when I returned about twenty minutes later.',
    'My keys fell out of my pocket somewhere near {place}. I checked the path twice but could not find them.',
    'I lost a bag containing my medication and identification near {place}. I have checked with nearby staff.',
    'I may have left a dark blue umbrella near {place} after the afternoon rain.',
  ],
  'Non-Injury Traffic Accident': [
    'Two bicycles touched wheels near {place}. Both riders stopped and said they were not hurt.',
    'A car and a bicycle made contact at the crossing near {place}. They exchanged information and no one reported an injury.',
    'Two vehicles collided near {place} and blocked the crossing. The drivers said they were uninjured, but people had to walk into the road.',
    'A driver backed into another parked car near {place}. Both drivers were present and no injuries were reported.',
  ],
  'Theft': [
    'A small bicycle light was missing when I returned to the rack near {place}. The bike and lock were still there.',
    'I set my backpack beside me near {place} and noticed it was missing when I stood up.',
    'I saw someone take a bag from a seated person near {place} and run away. Staff were notified.',
    'My bicycle was gone from the public rack near {place}. The cut lock was left on the ground.',
  ],
  'Theft from Vehicle': [
    'A phone cable and loose change were missing from my car after I parked near {place}.',
    'I returned to my car near {place} and found a broken side window and my bag missing.',
    'I saw someone reach into two parked vehicles near {place} and leave with bags. I stayed back and notified staff.',
    'A tool bag was missing from the back of my vehicle after I visited {place}.',
  ],
  'Vandalism': [
    'Fresh marker writing appeared on a bench near {place}. I noticed it on my way to class.',
    'A public sign near {place} had been bent and its mounting bolts were on the ground.',
    'Someone was breaking the glass panels of a public fixture near {place}. I moved away and notified staff.',
    'A wall beside the walkway near {place} had new spray paint when I passed this morning.',
  ],
  'Vandalism of Vehicle': [
    'I found a scratch along my parked car near {place}. I did not see when it happened.',
    'My car mirror was broken when I returned from {place}. Pieces were on the sidewalk.',
    'I saw someone strike the windows of parked cars near {place}. I kept my distance and notified staff.',
    'The tires on my bicycle were cut while it was parked near {place}.',
  ],
  'Fighting / Violence': [
    'Two people were pushing and striking each other near {place}. People nearby moved away and staff were alerted.',
    'I saw a fight break out near {place}. One person fell before others separated the group.',
    'A person near {place} was repeatedly hitting someone who was trying to leave. Staff were notified immediately.',
    'An argument near {place} turned into punches. I stayed away from the group and alerted nearby staff.',
  ],
  'Harassment': [
    'A person near {place} made an unwanted comment to me. I moved away and they did not follow.',
    'Someone followed me through the area near {place} while making repeated unwanted remarks.',
    'A person near {place} blocked my path and threatened me after I asked them to stop following.',
    'I was repeatedly approached near {place} after saying I did not want to talk. I went toward other people.',
  ],
  'Suspicious Activity': [
    'I noticed an unattended bag near {place}. I did not touch it and told nearby staff.',
    'Someone near {place} was repeatedly trying locked doors and looking through windows.',
    'A person near {place} was trying car door handles while another person watched the street. I notified staff.',
    'Someone near {place} was photographing access keypads and walking away when people approached.',
  ],
  'Property Damage': [
    'A bench near {place} had a cracked slat. The rest of the seating was still usable.',
    'A public fixture near {place} had broken glass around its base. I let maintenance staff know.',
    'A large damaged panel near {place} was leaning into the walkway. People had to step around it.',
    'The railing beside the path near {place} was loose when I passed this afternoon.',
  ],
  'Medical Concern': [
    'Someone near {place} said they felt faint and sat down. Nearby staff came over to help.',
    'A person near {place} was having trouble breathing. Someone nearby called for emergency assistance.',
    'A person collapsed near {place}. People nearby called for emergency assistance and stayed with them.',
    'A visitor near {place} seemed disoriented and asked for help. Staff stayed with them while help was requested.',
  ],
  'Other Safety Concern': [
    'A walkway light near {place} was out after sunset. The adjacent lights were still working.',
    'Several loose paving stones near {place} made people stumble as they crossed the path.',
    'A fallen branch near {place} blocked most of the walkway and people were stepping into traffic to get around it.',
    'Water was pooling across the main path near {place}. I let nearby staff know.',
  ],
};

const landmarks = [
  { name: 'MLK Library', lat: 37.33547755, lng: -121.884997 },
  { name: 'Paseo de San Antonio', lat: 37.33293, lng: -121.88982 },
  { name: 'Diridon Station', lat: 37.3299203, lng: -121.902496 },
  { name: 'Student Union', lat: 37.33662082, lng: -121.88038896 },
  { name: 'San Pedro Square', lat: 37.3368467, lng: -121.894112 },
  { name: 'SoFA District', lat: 37.3295863, lng: -121.8858337 },
  { name: 'Washington Square', lat: 37.33465, lng: -121.88278 },
  { name: 'Campus Village', lat: 37.33335, lng: -121.8786 },
  { name: 'South First St', lat: 37.3307, lng: -121.88705 },
  { name: 'Convention Center', lat: 37.3292, lng: -121.8893 },
];

export function createExpandedMapSamples(now = new Date()): SeedReport[] {
const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});
const parts = calendar.formatToParts(now);
const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
const today = Date.UTC(part('year'), part('month') - 1, part('day'));

const expandedMapSamples: SeedReport[] = Object.entries(submissions).flatMap(([category, descriptions], categoryIndex) =>
  descriptions.map((description, variation): SeedReport => {
    const n = categoryIndex * 4 + variation;
    // Four groups of seven within ~20m, followed by 44 dispersed locations.
    const tight = n < 28;
    const place = landmarks[tight ? n % 4 : (n * 5 + 2) % landmarks.length];
    const angle = n * 2.3999632297;
    const distance = tight ? 7 + Math.floor(n / 4) * 2 : 55 + ((n * 67) % 200);
    const lat = place.lat + Math.sin(angle) * distance / 111195;
    const lng = place.lng + Math.cos(angle) * distance / (111195 * Math.cos(place.lat * Math.PI / 180));
    const age = (n * 11) % 60;
    const date = new Date(today - age * 86400000).toISOString().slice(0, 10);
    const time = `${String(8 + n % 14).padStart(2, '0')}:${String(n * 13 % 60).padStart(2, '0')}`;
    const created = new Date(`${date}T${time}:00-07:00`);
    const alwaysHigh = category === 'Medical Concern' || category === 'Fighting / Violence';
    return {
      id: `SJSU-${String(1001 + n).padStart(4, '0')}`,
      description: description.replace('{place}', place.name),
      incidentCategory: category, latitude: lat, longitude: lng,
      locationLabel: place.name, locationSource: 'manual', locationConfirmed: true,
      incidentDate: date, incidentTime: time, anonymous: true,
      reporterRole: n % 2 ? 'resident' : 'student',
      status: 'approved', isDemo: true, source: 'demo',
      priority: alwaysHigh || variation === 2 ? 'High' : variation === 0 ? 'Low' : 'Normal',
      analystNotes: '', reviewedBy: 'Analyst',
      createdAt: created, updatedAt: created, moderatedAt: created,
    };
  }),
);

if (expandedMapSamples.length !== 72 || Object.keys(submissions).length !== 18) {
  throw new Error('Expected four samples for each of 18 categories.');
}

// Separate stable IDs preserve all older data and reviewer decisions across restarts.
let state = 90210;
const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
const extra = Array.from({ length: 100 }, (_, i): SeedReport => {
  const base = expandedMapSamples[i % expandedMapSamples.length];
  const place = landmarks[i % 8 === 0 ? landmarks.length - 1 : Math.floor(random() * (i < 65 ? 6 : landmarks.length))];
  const angle = random() * Math.PI * 2;
  const distance = 8 + random() ** 2 * (i < 65 ? 110 : 330);
  return {
    ...base, id: `SJSU-DEMO-VOLUME-${i + 1}`, isDemo: true, source: 'sample',
    status: 'approved', anonymous: true, reporterDisplayName: null,
    latitude: place.lat + Math.sin(angle) * distance / 111195,
    longitude: place.lng + Math.cos(angle) * distance / (111195 * Math.cos(place.lat * Math.PI / 180)),
    locationLabel: place.name, locationConfirmed: true,
    description: i % 3 === 0 ? `Missing bicycle light near ${place.name}.`
      : i % 3 === 1 ? `At about ${base.incidentTime}, I noticed damage to a public sign near ${place.name}. The walkway was still accessible.`
      : `I left a bag beside a bench near ${place.name} in the afternoon. It was missing when I returned. I checked with nearby staff but it had not been handed in.`,
    incidentCategory: i % 3 === 1 ? 'Property Damage' : i % 3 === 0 ? 'Theft' : 'Lost Property',
    priority: 'Normal', resolvedAt: null, resolvedBy: '', resolutionNote: '',
  };
});
return [...expandedMapSamples, ...extra];
}
