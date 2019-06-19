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
  const countries = []

  for await (const vote of votes) {
    if (!vote.created) continue
    if (!countries.find(c => c.code === vote.nationality)) {
      countries.push({
        code: vote.nationality,
        vote: []
      })
    }
    countries.find(c => c.code === vote.nationality).vote.push(vote)
  }

  for (const country of countries) {
    country.vote = country.vote.map(extractPublicPart)
    country.vote.sort((a, b) => b.index - a.index)
  }

  // order countries by amount of votes
  countries.sort((a, b) => b.vote.length - a.vote.length)

  return countries
}

module.exports = {
  populateCache,
  extractPublicPart
}
