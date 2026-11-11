import { Booking, Room, ChannelSource } from '../types';

/**
 * Format a Date object to YYYYMMDD string for iCalendar VALUE=DATE format
 */
export function formatDateToICalDate(dateStr: string): string {
  // input: YYYY-MM-DD -> output: YYYYMMDD
  return dateStr.replace(/-/g, '');
}

/**
 * Parse an iCalendar date string (YYYYMMDD, YYYYMMDDTHHMMSSZ, YYYY-MM-DD, or with parameters like TZID / VALUE=DATE)
 */
export function parseICalDate(icalDateStr: string): string {
  if (!icalDateStr) return new Date().toISOString().split('T')[0];

  // If there are colons from parameters, extract the last component which is the actual date/time value
  let cleaned = icalDateStr.trim();
  if (cleaned.includes(':')) {
    cleaned = cleaned.split(':').pop()!.trim();
  }

  // Remove any remaining prefix if present
  cleaned = cleaned.replace(/^VALUE=DATE:/i, '').trim();

  // If already standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.substring(0, 10);
  }

  // Format YYYYMMDD or YYYYMMDDTHHMMSS...
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
  }

  // Fallback to Date parser
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Add days to a YYYY-MM-DD date string
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Calculate difference in nights between check-in and check-out
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  try {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

/**
 * Generate RFC 5545 compliant iCalendar content for a specific room or entire homestay
 */
export function generateICalFeed(room: Room, bookings: Booking[], homestayName: string): string {
  const roomBookings = bookings.filter((b) => b.roomId === room.id);
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StaySync Homestay Channel Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${homestayName} - ${room.name}`,
    `X-WR-CALDESC:Real-time availability feed for ${room.name}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const b of roomBookings) {
    const dtstart = formatDateToICalDate(b.checkIn);
    const dtend = formatDateToICalDate(b.checkOut);
    const uid = b.externalBookingId || `staysync-${b.id}@homestay.local`;

    let summary = 'Reserved';
    if (b.isOfflineBlock) {
      summary = b.source === 'block' ? 'Blocked - Maintenance' : `Direct Booking - ${b.guestName}`;
    } else {
      summary = `${b.source.toUpperCase()} - ${b.guestName}`;
    }

    const description = `Homestay: ${homestayName}\\nRoom: ${room.name}\\nGuest: ${b.guestName}\\nSource: ${b.source}\\nNights: ${b.nights}`;

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${uid}`);
    ics.push(`DTSTAMP:${nowUtc}`);
    ics.push(`DTSTART;VALUE=DATE:${dtstart}`);
    ics.push(`DTEND;VALUE=DATE:${dtend}`);
    ics.push(`SUMMARY:${summary}`);
    ics.push(`DESCRIPTION:${description}`);
    ics.push('STATUS:CONFIRMED');
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

/**
 * Trigger file download for an iCal feed
 */
export function downloadICalFile(room: Room, bookings: Booking[], homestayName: string): void {
  const icsContent = generateICalFeed(room, bookings, homestayName);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${room.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_calendar.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedICalEvent {
  uid: string;
  summary: string;
  description?: string;
  checkIn: string;
  checkOut: string;
  status?: string;
}

/**
 * Ultra-resilient RFC 5545 parser for iCalendar .ics format
 * Handles Airbnb, MakeMyTrip, Booking.com, VRBO, Agoda, and Google Calendar formats
 */
export function parseICalFeed(icsContent: string): ParsedICalEvent[] {
  if (!icsContent || typeof icsContent !== 'string') {
    return [];
  }

  const events: ParsedICalEvent[] = [];

  // 1. Strip UTF-8 Byte Order Mark (BOM)
  let cleanContent = icsContent.replace(/^\uFEFF/, '');

  // 2. Unfold RFC 5545 multi-line folded values (CRLF or LF followed by a single space or tab)
  cleanContent = cleanContent.replace(/\r?\n[ \t]/g, '');

  // 3. Split into lines handling CRLF, LF, or CR
  const rawLines = cleanContent.split(/\r\n|\r|\n/);

  let inEvent = false;
  let currentUid = '';
  let currentSummary = '';
  let currentDescription = '';
  let currentStart = '';
  let currentEnd = '';
  let currentStatus = '';
  let currentDuration = '';

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect BEGIN:VEVENT (case-insensitive, permits whitespace or trailing chars)
    if (/^BEGIN:VEVENT/i.test(trimmed)) {
      inEvent = true;
      currentUid = '';
      currentSummary = '';
      currentDescription = '';
      currentStart = '';
      currentEnd = '';
      currentStatus = '';
      currentDuration = '';
      continue;
    }

    // Detect END:VEVENT
    if (/^END:VEVENT/i.test(trimmed)) {
      if (inEvent) {
        // Skip explicitly cancelled reservations
        if (currentStatus.toUpperCase() === 'CANCELLED') {
          inEvent = false;
          continue;
        }

        if (currentStart) {
          const parsedCheckIn = parseICalDate(currentStart);
          let parsedCheckOut = currentEnd ? parseICalDate(currentEnd) : '';

          // If no DTEND specified, inspect DURATION or default to next day
          if (!parsedCheckOut) {
            const durMatch = currentDuration.match(/P(?:(\d+)W)?(?:(\d+)D)?/i);
            const daysFromDur =
              (durMatch?.[1] ? parseInt(durMatch[1], 10) * 7 : 0) +
              (durMatch?.[2] ? parseInt(durMatch[2], 10) : 0);

            parsedCheckOut = addDaysToDateStr(parsedCheckIn, daysFromDur > 0 ? daysFromDur : 1);
          }

          // In standard iCal all-day events, if checkOut equals or precedes checkIn, guarantee minimum 1 night
          if (parsedCheckOut <= parsedCheckIn) {
            parsedCheckOut = addDaysToDateStr(parsedCheckIn, 1);
          }

          events.push({
            uid: currentUid || `ical-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            summary: currentSummary || 'Reserved',
            description: currentDescription,
            checkIn: parsedCheckIn,
            checkOut: parsedCheckOut,
            status: currentStatus,
          });
        }
      }
      inEvent = false;
      continue;
    }

    if (inEvent) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const propWithParams = trimmed.substring(0, colonIndex).toUpperCase().trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      // Property name without parameters (e.g. 'DTSTART;VALUE=DATE' -> 'DTSTART')
      const propName = propWithParams.split(';')[0].trim();

      if (propName === 'UID') {
        currentUid = value;
      } else if (propName === 'SUMMARY') {
        currentSummary = value;
      } else if (propName === 'DESCRIPTION') {
        currentDescription = value;
      } else if (propName === 'DTSTART') {
        currentStart = value;
      } else if (propName === 'DTEND') {
        currentEnd = value;
      } else if (propName === 'STATUS') {
        currentStatus = value;
      } else if (propName === 'DURATION') {
        currentDuration = value;
      }
    }
  }

  return events;
}

/**
 * Generate realistic sample OTA iCal data for testing/demoing sync
 */
export function getSampleOtaFeed(channel: ChannelSource, roomName: string): string {
  const today = new Date();
  
  // Create 2 upcoming dates
  const d1 = new Date(today);
  d1.setDate(today.getDate() + 3);
  const d1End = new Date(d1);
  d1End.setDate(d1.getDate() + 3);

  const d2 = new Date(today);
  d2.setDate(today.getDate() + 9);
  const d2End = new Date(d2);
  d2End.setDate(d2.getDate() + 2);

  const start1Str = d1.toISOString().split('T')[0].replace(/-/g, '');
  const end1Str = d1End.toISOString().split('T')[0].replace(/-/g, '');
  const start2Str = d2.toISOString().split('T')[0].replace(/-/g, '');
  const end2Str = d2End.toISOString().split('T')[0].replace(/-/g, '');

  let prefix = 'Airbnb';
  let sampleGuest1 = 'Sarah Jenkins';
  let sampleGuest2 = 'David Miller';

  if (channel === 'makemytrip') {
    prefix = 'MakeMyTrip';
    sampleGuest1 = 'Rahul Sharma';
    sampleGuest2 = 'Ananya Roy';
  } else if (channel === 'booking') {
    prefix = 'Booking.com';
    sampleGuest1 = 'Marco Rossi';
    sampleGuest2 = 'Sophie Dubois';
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${prefix} iCalendar Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${prefix} - ${roomName}
BEGIN:VEVENT
UID:${channel}-res-${Date.now()}-01@ota.com
DTSTAMP:20261009T120000Z
DTSTART;VALUE=DATE:${start1Str}
DTEND;VALUE=DATE:${end1Str}
SUMMARY:${prefix} Reservation - ${sampleGuest1}
DESCRIPTION:Listing: ${roomName}\\nChannel: ${prefix}\\nConfirmation: ${channel.toUpperCase()}-948120
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:${channel}-res-${Date.now()}-02@ota.com
DTSTAMP:20261009T120000Z
DTSTART;VALUE=DATE:${start2Str}
DTEND;VALUE=DATE:${end2Str}
SUMMARY:${prefix} Reservation - ${sampleGuest2}
DESCRIPTION:Listing: ${roomName}\\nChannel: ${prefix}\\nConfirmation: ${channel.toUpperCase()}-771923
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

/**
 * Generate real Airbnb-styled iCalendar feed for immediate testing
 */
export function getAirbnbSampleFeed(roomName: string): string {
  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(today.getDate() + 4);
  const d1End = new Date(d1);
  d1End.setDate(d1.getDate() + 4);

  const d2 = new Date(today);
  d2.setDate(today.getDate() + 11);
  const d2End = new Date(d2);
  d2End.setDate(d2.getDate() + 3);

  const s1 = d1.toISOString().split('T')[0].replace(/-/g, '');
  const e1 = d1End.toISOString().split('T')[0].replace(/-/g, '');
  const s2 = d2.toISOString().split('T')[0].replace(/-/g, '');
  const e2 = d2End.toISOString().split('T')[0].replace(/-/g, '');

  return `BEGIN:VCALENDAR
PRODID;X-RICAL-TZOFFSET=+0000:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Airbnb - ${roomName}
X-WR-TIMEZONE:UTC
BEGIN:VEVENT
DTEND;VALUE=DATE:${e1}
DTSTART;VALUE=DATE:${s1}
UID:49201948-res-airbnb-01@airbnb.com
DESCRIPTION:CHECKIN: ${d1.toISOString().split('T')[0]}\\nCHECKOUT: ${d1End.toISOString().split('T')[0]}\\nNIGHTS: 4\\nPHONE: +1 (555) 392-1084\\nEMAIL: liam.traveler@example.com
SUMMARY:Reserved - Liam Watson
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:${e2}
DTSTART;VALUE=DATE:${s2}
UID:49201948-res-airbnb-02@airbnb.com
DESCRIPTION:Reservation URL: https://www.airbnb.com/reservation/itinerary?code=HM94812\\nNIGHTS: 3
SUMMARY:Airbnb (Not available)
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}
