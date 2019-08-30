const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const cuid = require('cuid')
const Queue = require('bee-queue')

const { populateCache, extractPublicPart } = require('./common')
const config = require('./config')

const votesQueue = new Queue('votes', {
  redis: { db: config.redis.db }
})

const db = levelup(encode(leveldown('./db'), { valueEncoding: 'json' }))
let cache, stats

const internals = {}

internals.start = async function () {
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
    method: 'POST',
    path: '/',
    options: {
      handler: vote
    }
  })

  cache = await populateCache(db.createValueStream())
  stats = createStats(cache)

  await server.start()
}

internals.start()

function createStats (cache) {
  const newStats = {
    global: {
      count: 0
    },
    country: cache.map(country => {
      return {
        code: country.code,
        count: country.vote.length,
        vote: country.vote.slice(0, 5)
      }
    })
  }
  for (const country of cache) {
    newStats.global.count += country.vote.length
  }
  return newStats
}

function getIndex (vote) {
  let country = cache.find(c => c.code === vote.nationality)
  if (!country) {
    country = {
      code: vote.nationality,
      vote: []
    }
    cache.push(country)
  }
  return country.vote.length + 1
}

// PUT
async function vote (request, h) {
  // check if vote existis
  let vote
  try {
    vote = await db.get(request.payload.email)
  } catch (e) { }
  if (vote) {
    // respond with conflict
    return Boom.conflict()
  } else if (request.payload['I accept privacy policy and terms of service'] !== 'on' ||
              request.payload['I am over 18 years old'] !== 'on') {
    // respond with Not Acceptable
    return Boom.notAcceptable()
  } else {
    vote = {
      id: cuid(),
      ...request.payload,
      created: new Date().toISOString()
    }
    try {
      await db.put(request.payload.email, vote)
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
  let vote
  let publicPart
  for await (const v of db.createValueStream()) {
    if (v.id === request.params.id) {
      vote = v
    }
  }
  if (!vote) return Boom.notFound()
  // confirm if needed
  if (!vote.confirmed) {
    vote.index = getIndex(vote)
    vote.confirmed = new Date().toISOString()
    await db.put(vote.email, vote)
    // create delayed job
    try {
      await votesQueue.createJob(vote).save()
    } catch (err) {
      console.log(err)
    }
    const country = cache.find(c => c.code === vote.nationality)
    publicPart = extractPublicPart(vote)
    country.vote = [publicPart, ...country.vote]
    cache.sort((a, b) => b.vote.length - a.vote.length)
    stats = createStats(cache)
  }
  if (!publicPart) publicPart = extractPublicPart(vote)

  // respond with public part
  return publicPart
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
