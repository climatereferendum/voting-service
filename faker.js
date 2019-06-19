const faker = require('faker')
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')

const { populateCache } = require('./common')

const db = levelup(encode(leveldown('./db'), { valueEncoding: 'json' }))

function fakeData () {
  return {
    name: faker.name.findName(),
    nationality: faker.address.countryCode().toLowerCase(),
    description: faker.company.catchPhrase(),
    opinion: faker.lorem.paragraph(5),
    created: new Date().toISOString()
  }
}

const votes = new Array(500).fill(null).map(fakeData)

;(async function () {
  const cache = await populateCache(votes)
  try {
    for (const country of cache) {
      for (const [index, vote] of country.vote.entries()) {
        vote.index = index + 1 // we want to start with 1
        vote.created = new Date().toISOString()
        vote.email = faker.internet.email()
        await db.put(vote.email, vote)
      }
    }
  } catch (e) {
    console.log('something went wrong', e)
  }
})()
