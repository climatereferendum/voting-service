import faker from 'faker'
import { MongoClient } from 'mongodb'

import { universities, solutions } from '@aliceingovernment/data'
import config from './config'

const FAKES_COUNT = 50

const mongoClient = new MongoClient(config.mongo.url)
const universitySlugs = universities.map(u => u.slug)
const solutionSlugs =  solutions.map(s => s.slug)

function fakeVote () {
    let votedSolutions = [
      faker.random.arrayElement(solutionSlugs)
    ]
    votedSolutions.push(
      faker.random.arrayElement(
        solutionSlugs.filter(slug => slug !== votedSolutions[1])
      )
    )
    return {
      // TODO rename to university
      nationality: faker.random.arrayElement(universitySlugs),
      name: faker.name.findName(),
      desciption: faker.company.catchPhrase(),
      opinion: faker.lorem.paragraphs(5),
      email: faker.internet.email(),
      created: new Date().toISOString(),
      confirmed: new Date().toISOString(),
      disabled: false,
      solutions: votedSolutions
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