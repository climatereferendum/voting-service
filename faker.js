import faker from 'faker'
import { MongoClient } from 'mongodb'

import { universities, solutions } from '@aliceingovernment/data'
import config from './config'

const FAKES_COUNT = 50

const mongoClient = new MongoClient(config.mongo.url)

function randomUniversityDomain() {
 return faker.random.arrayElement(universities.flatMap(u => u.domains))
}

function fakeVote () {
    const solutionSlugs =  solutions.map(s => s.slug)
    const firstSolution = faker.random.arrayElement(solutionSlugs)
    const secondSolution = faker.random.arrayElement(
      solutionSlugs.filter(slug => slug !== firstSolution)
    )
    return {
      // TODO rename to university
      name: faker.name.findName(),
      opinion: faker.lorem.paragraphs(1),
      email: `${faker.internet.userName()}@${randomUniversityDomain()}`,
      policiesAgreement: true,
      created: new Date().toISOString(),
      confirmed: new Date().toISOString(),
      disabled: false,
      pending: false,
      solutions: [firstSolution, secondSolution]
    }
}

;(async function () {
  let votes
  try {
    await mongoClient.connect()
    console.debug("Connected to mongodb")

    const db = mongoClient.db(config.mongo.database)
    votes = db.collection(config.mongo.collection)
  } catch (err) {
    console.error(err.stack)
  }

  const fakes = new Array(FAKES_COUNT).fill(null).map(fakeVote)
  for (const fake of fakes) {
    try {
      await votes.insertOne(fake)
      // console.log(fake)
    } catch (err) {
      console.log(err)
    }
  }
  mongoClient.close()
})()