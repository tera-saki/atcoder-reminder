const { Builder, By, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome')
const { DateTime, Settings } = require('luxon')

Settings.defaultZone = 'Asia/Tokyo'


async function createDriver() {
  const options = new Options().addArguments(['--headless', '--lang=ja'])
  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()
}

async function parseContest(tr) {
  const tds = await tr.findElements(By.css("td"))

  // check contest type
  // ignore Heuristic contests
  const span = await tds[1].findElement(By.css('span'))
  const contestType = await span.getAttribute('data-original-title')
  if (contestType === 'Heuristic') {
    return null
  }

  // contest date
  const td0 = await tds[0].findElement(By.css('a')).getText()
  const regex = /(\d{4}-\d{2}-\d{2}).*(\d{2}:\d{2})/
  const [_, date, hhmm] = regex.exec(td0)
  const start = `${date}T${hhmm}:00+09:00`

  // contest name
  const td1 = await tds[1].findElement(By.css('a'))
  const name = await td1.getText()
  const url = await td1.getAttribute('href')

  // contest duration
  const duration = await tds[2].getText()
  const [hours, minutes] = duration.split(':').map(s => parseInt(s))
  const end = DateTime.fromISO(start).plus({ hours, minutes }).toISO()

  // rated?
  const rated = await tds[3].getText()

  return { name, url, start, end, rated }
}

async function crawlAtCoder(driver) {
  await driver.get("https://atcoder.jp/contests/")
  await driver.wait(until.elementLocated(By.id("contest-table-upcoming")))

  const table = await driver.findElement(By.id("contest-table-upcoming"))
  const tbody = await table.findElement(By.css("tbody"))
  const trs = await tbody.findElements(By.css("tr"))

  contests = []
  for (const tr of trs) {
    try {
      const contest = await parseContest(tr)
      if (contest) {
        contests.push(contest)
      }
    } catch (e) {
      console.error("Failed to parse contest information", e)
    }
  }
  return contests
}

async function getContests() {
  const driver = await createDriver()

  let contests = []
  try {
    contests = await crawlAtCoder(driver)
  } catch (e) {
    console.error(e)
  } finally {
    await driver.quit()
  }
  return contests
}

module.exports = {
  getContests
}