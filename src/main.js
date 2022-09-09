const { DateTime, Settings } = require('luxon')

const { createClient } = require('./client')
const { getContests } = require('./crawl')

Settings.defaultZone = 'Asia/Tokyo'

const CALENDAR_TITLE = 'AtCoder Calendar'

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
      timeZone: 'Asia/Tokyo'
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

async function registerContests(client, contests) {
  const calendarId = await getCalendarId(client)
  const events = await getEvents(client, calendarId)
  const alreadyRegisteredContests = new Set(events.map(event => event.summary))
  const colorCode = { ABC: "9", ARC: "6", AGC: "4", OTHER: "11" }

  for (const contest of contests) {
    if (alreadyRegisteredContests.has(contest.name)) {
      continue
    }
    try {
      await client.events.insert({
        calendarId,
        resource: {
          summary: contest.name,
          start: {
            dateTime: contest.start,
            timeZone: "Asia/Tokyo"
          },
          end: {
            dateTime: contest.end,
            timeZone: "Asia/Tokyo"
          },
          colorId: colorCode[contest.code],
          description: `${contest.url} (${contest.rated})`
        }
      })
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