import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'
import { MongoClient, ObjectId } from 'mongodb'
import Queue from 'bee-queue'

import { universities, solutions } from '@aliceingovernment/data'
import { populateCache,
         addToCache,
         extractPublicPart,
         createStats,
         determineUniversity } from './common'
import config from './config'

const mongoClient = new MongoClient(config.mongo.url)
const votesQueue = new Queue('votes', { redis: config.redis })

let votes, cache, stats
const internals = {}

async function refreshCacheAndStats () {
  cache = populateCache(await votes.find({
    confirmed: { $exists: true, $ne: null },
    pending: false,
    disabled: false
  }).sort('confirmed', -1).toArray())
  stats = createStats(cache)
  return 'done'
}

internals.start = async function () {
  try {
    await mongoClient.connect()
    console.debug("Connected to mongodb")

    const db = mongoClient.db(config.mongo.database)
    votes = db.collection(config.mongo.collection)
  } catch (err) {
    console.error(err.stack)
  }
  await refreshCacheAndStats () 

  const server = Hapi.server({
    port: config.port,
    routes: { cors: { credentials: true } },
    state: { isSameSite: false } // required for CORS
  })

  server.route({
    method: 'GET',
    path: '/countries/{countryCode}',
    options: {
      handler: listVotes
    }
  })

  server.route({
    method: 'GET',
    path: '/votes/{id}',
    options: {
      handler: showVote
    }
  })

  server.route({
    method: 'GET',
    path: '/',
    options: {
      handler: listStats
    }
  })

  server.route({
    method: 'GET',
    path: `/${config.flushSecret}`,
    options: {
      handler: refreshCacheAndStats
    }
  })

  server.route({
    method: 'POST',
    path: '/',
    options: {
      handler: vote
    }
  })

  await server.start()
}

internals.start()

// PUT
// TODO: check if two solutions and both from solutions list
// TODO: check if email not from well know non-university provicer
async function vote (request, h) {
  // check if vote existis
  let vote
  try {
    vote = await votes.findOne({ email: request.payload.email })
  } catch (err) { console.log(err) }
  if (vote) {
    // respond with conflict
    return Boom.conflict()
  } else if (!request.payload.policiesAgreement) {
    // respond with Not Acceptable
    return Boom.notAcceptable()
  } else {
    vote = {
      ...request.payload,
      created: new Date().toISOString(),
      confirmed: null,
      pending: !determineUniversity(request.payload.email),
      disabled: false
    }
    try {
      await votes.insertOne(vote)
    } catch (err) {
      console.log(err)
    }
    // create delayed job
    try {
      await votesQueue.createJob(vote).save()
    } catch (err) {
      console.log(err)
    }
    // respond with 204
    return null
  }
}

async function showVote (request, h) {
  // find vote
  const _id = ObjectId(request.params.id)
  let vote = await votes.findOne(_id)
  if (!vote) return Boom.notFound()
  // confirm if needed
  if (!vote.confirmed) {
    // set confirmed data
    try {
      const result  = await votes.findOneAndUpdate(
        { _id },
        {
          $set: {
            confirmed: new Date().toISOString()
          }
        },
        { returnOriginal: false }
      )
      vote = result.value
    } catch (err) {
      console.log(err)
    }
    // create delayed job
    try {
      await votesQueue.createJob(vote).save()
    } catch (err) {
      console.log(err)
    }
    // update cache and stats unless pending
    if (!vote.pending) {
      cache = addToCache(vote, cache)
      stats = createStats(cache)
    }
  }

  // respond with public part
  return extractPublicPart(vote)
}

async function listVotes (request, h) {
  return cache.find(c => c.code === request.params.countryCode)
}

async function listStats (request, h) {
  return stats
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})
