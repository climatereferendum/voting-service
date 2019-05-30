const faker = require('faker')
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')

const db = levelup(encode(leveldown('./db'), { valueEncoding: 'json' }))

function fakeData () {
  return {
    name: faker.name.findName(),
    nationality: faker.address.countryCode(),
    description: faker.company.catchPhrase(),
    opinion: faker.lorem.paragraph(5)

  }
}

;(async function () {
  try {
    for (const i of new Array(100)) {
      await db.put(faker.internet.email(), fakeData())
    }
  } catch (e) {
    console.log('something went wrong')
  }
})()
