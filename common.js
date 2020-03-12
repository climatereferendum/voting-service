import { solutions } from '@aliceingovernment/data'

function calculateResults (votes) {
  const solutionVotes = votes.flatMap(v => v.solutions)
  return solutions.map(solution => ({
    solution: solution.slug,
    voteCount: solutionVotes.filter(sv => sv === solution.slug).length
  })).sort((a, b) => b.voteCount - a.voteCount)
}

export function extractPublicPart (vote) {
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

export function populateCache (votes) {
  let data = []

  for (const vote of votes) {
    let country
    ;({ country, data } = findOrAddCountry(vote, data))

    country.vote.push(vote)
  }

  // order data by amount of votes
  data.sort((a, b) => b.vote.length - a.vote.length)

  return data
}

export function addToCache (vote, cache) {
  let { country, data } = findOrAddCountry(vote, cache)
  country.vote = [vote, ...country.vote]
  data.sort((a, b) => b.vote.length - a.vote.length)
  return data
}

export function createStats (cache) {
  const newStats = {
    global: {
      count: 0,
      result: calculateResults(cache.flatMap(country => country.vote))
    },
    country: cache.map(country => {
      return {
        code: country.code,
        count: country.vote.length,
        vote: country.vote.slice(0, 5),
        result: calculateResults(country.vote)
      }
    })
  }
  for (const country of cache) {
    newStats.global.count += country.vote.length
  }
  return newStats
}
