exports.getTopicOrChannel = msg => {
  if(!msg.content) return `#${msg.channel.name}`
  if(msg.content.split(' ')[1].startsWith('<#')) {
    // this is hacky but if the user makes the topic a real channel, it'll be replaced with e.g. <#566930249036857364>
    let channelID = msg.content.split(' ')[1]
    channelID = channelID.replace('<', '').replace('>', '').replace('#', '')
    return `#${msg.guild.channels.cache.find(guildChannel => guildChannel.id === channelID).name}`
  }
  return msg.content.split(' ').filter(word => word.startsWith("#"))[0] || `#${msg.channel.name}`
}