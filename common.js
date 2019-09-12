function extractPublicPart (vote) {
  return {
    name: vote.name,
    nationality: vote.nationality,
    description: vote.description,
    opinion: vote.opinion,
    confirmed: vote.confirmed
  }
}

function findOrAddCountry(vote, data) {
  let country = data.find(c => c.code === vote.nationality)
  if (!country) {
    country = {
      code: vote.nationality,
      vote: []
    }
    data.push(country)
  }
  return { country, data }
}

function populateCache (votes) {
  let data = []

  for (const vote of votes) {
    let country
    ;({ country, data } = findOrAddCountry(vote, data))

    country.vote.push(vote)
  }

  for (const country of data) {
    country.vote = country.vote.map(extractPublicPart)
  }

  // order data by amount of votes
  data.sort((a, b) => b.vote.length - a.vote.length)

  return data
}

function addToCache (vote, cache) {
  let { country, data } = findOrAddCountry(vote, cache)
  publicPart = extractPublicPart(vote)
  country.vote = [publicPart, ...country.vote]
  data.sort((a, b) => b.vote.length - a.vote.length)
  return data
}

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


module.exports = {
  populateCache,
  addToCache,
  extractPublicPart,
  createStats
}
