# 本项目已停止维护，你仍可以继续使用本项目，但建议尽快迁移至功能更丰富、文档更完善的 [go-cqhttp](https://github.com/Mrs4s/go-cqhttp)、[go-cqhttp-jsbot](https://github.com/xiluotop/go-cqhttp-jsbot) 等框架

# 小栗子 http 插件 node.js API更新记录

  更新内容 api 示例使用方法见 test.js 代码

  基本使用方式：

  ```javascript
  // 引入平台 SDK
  const BotSDK = require('./xiaolizi-http-sdk.js').BotSDK
  // 实例化一个平台，框架插件监听地址、用户名、密码、事件上传路径、上传监听端口，不写则默认80
  const botSDK = new BotSDK('http://localhost:52566','test','test','botmsg',8888)
  // 创建一个监听 bot 对象（已挂载至框架内的 qq）
  let bot = botSDK.createBot(123456789);
  // -------------
  可在 test.js 里参照 api 示例使用 bot.xxx 形式注册或调用相关指令功能。
  // -------------
  ```

## v1.2.5

* 更新 index.js

## v1.2.4

* 稳定 ws 连接，增强异常重连，优化解析代码，目前插件已支持至2.1.0.1 与 2.2.0.1

## v1.2.3

* 修复事件上传特殊信息发送错误原因（插件问题）

## v1.2.2

* 优化部分代码增加稳定性，已测试最新版api功能，授权可正常使用

## v1.2.1

* 修复 ws 端口写死问题
* 发送信息 api 添加 type 类型

## v1.2.0

* 插件支持到 1.1.2.2
* 支持 ws 监听操作且ws插件版本应为 1.1.2.2
* 开放 http 请求接口，示例请看 test.js
* 不久将测试最新版本稳定性

## v1.1.0

* 从 v1.1.0 版本开始，当前xzfc插件支持1.1.1.3~1.1.1.7,之前版本支持1.0.3b
* 删除礼物功能（框架不再支持）
* 更新初始化方式，xzfc 插件消息传递改变
* 更新接口数据结构，xzfc 插件接口参数改变

## v1.0.4

* 修改 onPrivateMsg、onGroupMsg、onEventMsg 监听方法，使其能添加多个监听函数

## v1.0.1~v1.0.3

* 修复初始化传参类型容错性的失误

## v1.0.0
  
* 完成主程序框架的逻辑封装，封装轮询消息并实现消息分发
* 封装 bot 操作 api 支持统一事件、私聊、群聊消息监听
* 支持快速鉴定指定群消息，自定义快捷指令
* 实现发送私聊，群私聊，群聊，快捷发送图片（已失效）
