const { DateTime, Settings } = require('luxon')

const { createClient } = require('./client')
const { getContests } = require('./crawl')

const tz = 'Asia/Tokyo'
Settings.defaultZone = tz

const CALENDAR_TITLE = 'AtCoder Calendar'
const colorCode = { ABC: "9", ARC: "6", AGC: "4", OTHER: "11" }

async function getCalendarId(client) {
  let pageToken = null

  do {
    res = await client.calendarList.list({ pageToken })
    for (const calendar of res.data.items) {
      if (calendar?.summary === CALENDAR_TITLE) {
        return calendar.id
      }
    }
    pageToken = res.nextPageToken
  } while (pageToken)
  return createCalendar(client)
}

async function createCalendar(client) {
  const res = await client.calendars.insert({
    requestBody: {
      summary: CALENDAR_TITLE,
      timeZone: tz
    }
  })
  return res.data.id
}

async function getEvents(client, calendarId) {
  let events = []
  let pageToken = null
  do {
    res = await client.events.list({
      calendarId,
      timeMin: DateTime.now().toISO(),
      pageToken
    })
    events = [...events, ...res.data.items]
    pageToken = res.nextPageToken
  } while (pageToken)
  return events
}

function createEventResource(contest) {
  return {
    summary: contest.name,
    start: {
      dateTime: contest.start,
      timeZone: tz
    },
    end: {
      dateTime: contest.end,
      timeZone: tz
    },
    colorId: colorCode[contest.code],
    description: `${contest.url} (${contest.rated})`
  }
}

async function createEvent(client, calendarId, contest) {
  await client.events.insert({
    calendarId,
    resource: createEventResource(contest)
  })
}

async function updateEvent(client, calendarId, eventId, contest) {
  await client.events.update({
    calendarId,
    eventId,
    resource: createEventResource(contest)
  })
}

async function registerContests(client, contests) {
  const calendarId = await getCalendarId(client)
  const events = await getEvents(client, calendarId)
  const registeredEvents = {}
  for (const event of events) {
    registeredEvents[event.summary] = {
      id: event.id,
      start: event.start.dateTime,
      end: event.end.dateTime
    }
  }

  for (const contest of contests) {
    try {
      const regEvent = registeredEvents[contest.name]
      if (regEvent) {
        if (regEvent.start === contest.start && regEvent.end === contest.end) {
          continue
        }
        await updateEvent(client, calendarId, regEvent.id, contest)
        console.log(`Schedule of ${contest.name} is updated.`)
      } else {
        await createEvent(client, calendarId, contest)
        console.log(`Registered ${contest.name}.`)
      }
    } catch (e) {
      console.error("Failed to regsiter contest.", e)
    }
  }
}

async function main() {
  try {
    const client = createClient()

    const contests = await getContests(client)
    await registerContests(client, contests)
  } catch (e) {
    console.error(e)
  }
}

main().then(() => process.exit(0))