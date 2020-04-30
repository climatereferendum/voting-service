const config = require('./config')

function voteUrl (vote) {
  return `${config.appUrl}/${vote._id}`
}

function confirmedPreamble (vote) {
  if (vote.pending) {
    return `
Your vote has been successfully registered. Rock & roll! Your university is not currently listed on our website but we will add it shortly and send you an update. 
    `
  } else {
    return `
Congratulations on being part of this climate referendum.
    `
  }
}
const footer = `
---------

Twitter: https://twitter.com/climate_r
Estonian Address Kiriku 6, Tallinn, 10130, Estonia

`
module.exports = {
  doneEmailText: function (vote) {
    return `
${confirmedPreable(vote)}

You can always find your vote here: ${voteUrl(vote)}

If you wish to read more about climate referendum and how to get involved please visit: ${config.appUrl}

${footer}
`
  },
  confirmEmailText: function (vote) {
    return `
Thank you for being part of this climate referendum. By including your voice, you are joining an amazing group of students influencing how universities think (and act!) on climate change.

To confirm your vote please follow this link: ${voteUrl(vote)}

${footer}
`
  }
}
