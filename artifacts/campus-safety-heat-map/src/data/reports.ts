export const CATEGORIES = [
  'Fraud', 'Forgery', 'Forgery — Bad Checks', 'Fraudulent Use of Credit/Debit Card',
  'Harassing Communications', 'Identity Theft', 'Lost Property', 'Non-Injury Traffic Accident',
  'Theft', 'Theft from Vehicle', 'Vandalism', 'Vandalism of Vehicle',
  'Fighting / Violence', 'Harassment', 'Suspicious Activity', 'Property Damage', 'Medical Concern',
  'Other Safety Concern',
] as const;
export type Category = typeof CATEGORIES[number];
export type Coordinates = { latitude: number; longitude: number };
export type ModerationStatus = 'pending' | 'approved' | 'denied' | 'removed';
export type PriorityStatus = 'Critical' | 'High' | 'Normal' | 'Low' | 'Unknown';
export type LocationSource = 'exif' | 'manual' | 'address' | 'description' | 'device';
export interface ReportRecord {
  urgent?: boolean;
  analystComment?: string;
  reviewedBy?: string;
  triage?: import('@workspace/api-client-react').SafemapTriage | null;
  id: string;
  isDemo: boolean;
  reporterType: 'student' | 'resident';
  privacyMode: 'anonymous' | 'identified';
  displayName?: string;
  image?: string;
  coordinates: Coordinates;
  locationSource: LocationSource;
  locationAddress?: string;
  locationConfirmed: boolean;
  location: string;
  incidentDate: string;
  incidentTime: string;
  description: string;
  incidentType: Category;
  moderationStatus: ModerationStatus;
  priorityStatus: PriorityStatus;
  moderationReason: string;
  moderatedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  submittedAt: string;
}

/** Records saved by earlier prototypes retain their original decision when loaded. */
export function normalizeReport(record: ReportRecord): ReportRecord {
  const status = record.moderationStatus as string;
  const moderationStatus: ModerationStatus = status === 'Accepted' ? 'approved'
    : status === 'Suspected spam' ? 'denied'
    : status === 'Pending review' ? 'pending'
    : record.moderationStatus;
  return { ...record, moderationStatus };
}

const sample = (n: number, location: string, latitude: number, longitude: number, incidentType: Category, incidentDate: string, incidentTime: string, description: string): ReportRecord => ({
  id: `SJSU-${String(n).padStart(4, '0')}`, isDemo: true, reporterType: n % 2 ? 'student' : 'resident',
  privacyMode: 'anonymous', coordinates: { latitude, longitude }, locationSource: 'manual',
  locationConfirmed: true, location, incidentDate, incidentTime,
  description: description.replace(/^Fictional example:\s*/i, '').replace(/This (?:example|sample)[^.]*\./gi, '').trim(), incidentType,
  moderationStatus: 'approved', priorityStatus: 'Normal', moderationReason: '',
  submittedAt: `${incidentDate}T${incidentTime}:00`,
});

export const SAMPLE_REPORTS: ReportRecord[] = [
  sample(1, 'Student Union', 37.3365, -121.8806, 'Lost Property', '2025-03-12', '14:20', 'Fictional example: a backpack was reported missing after a study session.'),
  sample(2, 'MLK Library', 37.3355, -121.8840, 'Harassing Communications', '2025-03-14', '18:45', 'Fictional example: repeated unwanted messages were reported near the library.'),
  sample(3, 'Paseo de San Antonio', 37.3339, -121.8907, 'Theft', '2025-03-16', '12:10', 'Fictional example: a bicycle was reported missing from a public rack.'),
  sample(4, 'San Pedro Square', 37.3367, -121.8937, 'Fraud', '2025-03-17', '20:30', 'Fictional example: a visitor described a suspicious payment request.'),
  sample(5, 'South First Street', 37.3305, -121.8864, 'Vandalism', '2025-03-19', '09:15', 'Fictional example: damage to a public-facing fixture was noticed.'),
  sample(6, 'Washington Square', 37.3330, -121.8835, 'Other Safety Concern', '2025-03-20', '16:05', 'Fictional example: a pathway light was reported out.'),
  sample(7, 'Campus Village', 37.3310, -121.8769, 'Theft from Vehicle', '2025-03-21', '22:40', 'Fictional example: an item was reported missing from a parked vehicle.'),
  sample(8, 'Downtown transit area', 37.3363, -121.8882, 'Lost Property', '2025-03-23', '07:50', 'Fictional example: a wallet was reported missing after a transit trip.'),
  sample(9, 'SJSU east campus walkway', 37.3350, -121.8786, 'Vandalism of Vehicle', '2025-03-24', '11:25', 'Fictional example: damage to a parked vehicle was described.'),
  sample(10, 'Paseo de San Carlos', 37.3326, -121.8803, 'Identity Theft', '2025-03-25', '15:35', 'Fictional example: a student reported a suspicious account notification.'),
  sample(11, 'Student Union area', 37.33632, -121.88010, 'Lost Property', '2025-03-26', '10:05', 'Fictional example: a reusable bottle was left behind.'),
  sample(12, 'Central campus walkway', 37.33675, -121.88090, 'Vandalism', '2025-03-27', '21:15', 'Fictional example: a sign along a walkway was found scratched. The reporter did not see who caused the damage or know when it happened.'),
  sample(13, 'Central campus plaza', 37.33600, -121.88110, 'Medical Concern', '2025-03-28', '13:40', 'Fictional example: someone asked for help after feeling faint in an outdoor gathering space. Staff were notified; no diagnosis or outcome is implied.'),
  sample(14, 'West campus edge', 37.33570, -121.88350, 'Theft', '2025-03-29', '17:20', 'Fictional example: a bicycle accessory was missing when its owner returned to a rack. The bicycle itself remained there.'),
  sample(15, 'Library-area sidewalk', 37.33535, -121.88435, 'Harassment', '2025-03-30', '19:05', 'Fictional example: a pedestrian described repeated unwelcome remarks while walking past the library area. They could not identify the person involved.'),
  sample(16, 'West campus pathway', 37.33505, -121.88390, 'Suspicious Activity', '2025-03-31', '08:30', 'Fictional example: a person noticed an unattended bag near a pathway and informed staff. This example does not claim an actual threat.'),
  sample(17, 'Downtown north plaza', 37.33648, -121.89330, 'Property Damage', '2025-04-01', '11:10', 'Fictional example: a public-facing fixture was found with chipped glass. The time and cause of the damage were unknown.'),
  sample(18, 'Downtown west blocks', 37.33695, -121.89422, 'Fraudulent Use of Credit/Debit Card', '2025-04-02', '16:35', 'Fictional example: a cardholder noticed an unfamiliar small purchase after visiting the area. They checked their transaction history and contacted their card provider; the cause was not established.'),
  sample(19, 'South campus edge', 37.33270, -121.88220, 'Non-Injury Traffic Accident', '2025-04-03', '09:05', 'Fictional example: two cyclists described a minor collision near a crossing. Neither reported an injury.'),
  sample(20, 'South campus walkway', 37.33240, -121.88300, 'Vandalism', '2025-04-04', '07:45', 'Fictional example: graffiti was noticed on a wall. The reporter did not know when it appeared.'),
  sample(21, 'East campus plaza', 37.33535, -121.87815, 'Harassing Communications', '2025-04-05', '15:25', 'Fictional example: a student described unwanted messages and asked staff where to document them. The reporter did not identify a suspect, and no conclusion was reached.'),
  sample(22, 'East campus area', 37.33480, -121.87765, 'Theft from Vehicle', '2025-04-06', '22:00', 'Fictional example: a car window was found damaged and a bag was missing from a parked vehicle. The time of the damage was unknown.'),
  sample(23, 'Downtown south block', 37.33015, -121.88600, 'Vandalism of Vehicle', '2025-04-07', '14:10', 'Fictional example: a parked car mirror was found damaged. No one reported seeing the damage occur.'),
  sample(24, 'South First corridor', 37.32995, -121.88570, 'Other Safety Concern', '2025-04-08', '20:25', 'Fictional example: several lamps along a walkway were described as dim. This sample illustrates reporting an environmental concern, not a documented hazard.'),
];