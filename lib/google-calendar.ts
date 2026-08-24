import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state?: string) {
  const oauthClient = getOAuthClient();
  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

export async function getTokensFromCode(code: string) {
  const oauthClient = getOAuthClient();
  const { tokens } = await oauthClient.getToken(code);
  return tokens;
}

export function getCalendarClient(accessToken: string, refreshToken?: string) {
  const oauthClient = getOAuthClient();
  oauthClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.calendar({ version: 'v3', auth: oauthClient });
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry_date: number | null }> {
  const oauthClient = getOAuthClient();
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauthClient.refreshAccessToken();
  return {
    access_token: credentials.access_token!,
    expiry_date: credentials.expiry_date ?? null,
  };
}

export async function getValidCalendarClient(refreshToken: string, accessToken?: string, expiryDate?: number) {
  let token = accessToken;
  const now = Date.now();

  if (!token || (expiryDate && expiryDate <= now)) {
    const refreshed = await refreshAccessToken(refreshToken);
    token = refreshed.access_token;
  }

  return getCalendarClient(token!, refreshToken);
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  attendees?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

export async function createCalendarEvent(
  calendar: ReturnType<typeof google.calendar>,
  event: CalendarEventInput,
): Promise<string> {
  const isAllDay = Boolean(event.startDate);
  const startObj = isAllDay
    ? { date: event.startDate }
    : { dateTime: event.startDateTime, timeZone: 'Europe/Paris' };
  const endObj = isAllDay
    ? { date: event.endDate || event.startDate }
    : { dateTime: event.endDateTime, timeZone: 'Europe/Paris' };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: startObj,
      end: endObj,
      location: event.location,
      attendees: event.attendees?.map((email) => ({ email })),
      reminders: event.reminders || {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  });
  return res.data.id!;
}

export async function updateCalendarEvent(
  calendar: ReturnType<typeof google.calendar>,
  eventId: string,
  event: CalendarEventInput,
): Promise<void> {
  const isAllDay = Boolean(event.startDate);
  const startObj = isAllDay
    ? { date: event.startDate }
    : { dateTime: event.startDateTime, timeZone: 'Europe/Paris' };
  const endObj = isAllDay
    ? { date: event.endDate || event.startDate }
    : { dateTime: event.endDateTime, timeZone: 'Europe/Paris' };

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: startObj,
      end: endObj,
      location: event.location,
      attendees: event.attendees?.map((email) => ({ email })),
      reminders: event.reminders || {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  });
}

export async function deleteCalendarEvent(
  calendar: ReturnType<typeof google.calendar>,
  eventId: string,
): Promise<void> {
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });
}
