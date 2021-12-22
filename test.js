const BotSDK = require('./index.js').BotSDK
/**
 * 框架监听地址如：http://localhost:52566
 * 用户名如 user：test
 * 密码如 pass：test
 * 事件上报地址：框架插件地址如 'http://localhost:8888/botmsg'
 * 路径就是 botmsg
 * 端口就是 8888
 */
const botSDK = new BotSDK('http://localhost:52566','test','test','botmsg',8888);
let bot = botSDK.createBot(123456789);

// 监听所有私聊消息
bot.onPrivateMsg(pack => {
  // console.log('private',pack)
})

// 监听所有群消息
bot.onGroupMsg(pack => {
  // console.log('group',pack)
})

// 监听所有事件消息
bot.onEventMsg(pack => {
  // console.log('event',pack)
})

setTimeout(() => {
  // 私聊消息
  // bot.sendPrivateMsg(321654987,'[bigFace,Id=11415,name=[猜拳]1,hash=83C8A293AE65CA140F348120A77448EE,flag=7de39febcf45e6db]')

  // 群临时消息
  // bot.sendGroupPrivateMsg(321654987,1231565,'[bigFace,Id=11415,name=[猜拳]1,hash=83C8A293AE65CA140F348120A77448EE,flag=7de39febcf45e6db]')

  // 发送群消息
  // bot.sendGroupMsg(321654987,'总有云开日出世时候',false)

  // 好友私聊图片
  // bot.sendPrivateImg(321654987,"https://localhost.com/favicon.ico")

  // 群私聊图片
  // bot.sendGroupPrivateImg(321654987,321654987,"https://localhost.com/favicon.ico")

  // 群发送图片
  // bot.sendGroupImg(321654987,"https://localhost.com/favicon.ico",true)

  // 监听指定群消息
  // bot.setOnGroupMsg('321654987', (data) => {
  //   console.log(data)
  // })

  // 注册私聊指令
  // bot.regPrivateCmd(["你好","哈喽","hello","233"],(data)=>{
  //   bot.sendPrivateImg(data.fromUser,"https://localhost.com/favicon.ico")
  // })

  // 注册群聊指令
  // bot.regGroupCmd(321654987,["新年好","666"],(data)=>{
  //   console.log(data)
  // })

  console.log('执行成功')
}, 2000)