function extractPublicPart (vote) {
  return {
    index: vote.index,
    name: vote.name,
    nationality: vote.nationality,
    description: vote.description,
    opinion: vote.opinion
  }
}

async function populateCache (votes) {
  const stats = {
    global: {
      count: 0
    },
    country: []
  }

  for await (const vote of votes) {
    if (!vote.created) continue
    stats.global.count++
    // increment country count
    if (!stats.country.find(c => c.code === vote.nationality)) {
      stats.country.push({
        code: vote.nationality,
        count: 0,
        vote: []
      })
    }
    stats.country.find(c => c.code === vote.nationality).vote.push(vote)
  }

  for (const country of stats.country) {
    // set count
    country.count = country.vote.length

    // reverse order
    country.vote = country.vote.map(extractPublicPart)
    country.vote.sort((a, b) => b.index - a.index)
  }

  // order countries by amount of votes
  stats.country.sort((a, b) => b.count - a.count)

  return stats
}

module.exports = {
  populateCache,
  extractPublicPart
}
