const request = require('request');

exports.getMedia = (query, callback) => {
  if(!process.env.GIPHY_KEY) {
    console.log('Skipping media, no giphy key')
    callback(null)
    return
  }

  const parameters = {
    url: 'https://api.giphy.com/v1/gifs/search',
    qs: {
      api_key: process.env.GIPHY_KEY,
      q: query,
      limit: 50
    },
    encoding: 'binary'
  }

  console.log('Getting media...')

  request.get(parameters, (err, res, body) => {
    body = JSON.parse(body)
    let rand = getRandomInt(body.data.length)
    let media = body.data[rand].images.fixed_height.url

    callback(media)
  })
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max))
}