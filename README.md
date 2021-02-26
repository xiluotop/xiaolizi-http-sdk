# 小栗子 http 插件 node.js API更新记录

  更新内容 api 示例使用方法见 test.js 代码

  基本使用方式：

  ```javascript
  // 引入平台 SDK
  const BotSDK = require('./xiaolizi-http-sdk.js').BotSDK
  // 实例化一个平台
  const botSDK = new BotSDK(http监听地址,授权密码)
  // 创建一个监听 bot 对象（已挂载至框架内的 qq）
  let bot = botSDK.createBot(123456789);
  // -------------
  ... 参照 api 示例使用 bot.xxx 形式注册或调用相关指令功能。
  // -------------
  ```

## v1.0.1

* 修复初始化传参类型容错性的失误

## v1.0.0
  
* 完成主程序框架的逻辑封装，封装轮询消息并实现消息分发
* 封装 bot 操作 api 支持统一事件、私聊、群聊消息监听
* 支持快速鉴定指定群消息，自定义快捷指令
* 实现发送私聊，群私聊，群聊，快捷发送图片，发送礼物（当前仅三朵鲜花）
