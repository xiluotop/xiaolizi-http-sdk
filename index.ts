import axios, { AxiosInstance } from "axios";
import qs from 'qs'
import { Robot } from "./bot/Robot";
import express from 'express'
import md5 from 'md5'
import bp from 'body-parser'
import WebSocket from 'ws'
import { time } from "console";

/* **************************************************************
 * 机器人的主类
 *    使用工厂模式实例化一个机器人视为开启一个机器人的操控，改机器人的
 *    动作、事件均由此类的公共方法实现，通过其他各模块进行扩展维护。
 * 开发思路
 *    1、机器人实例化的机器人通过 Map 存储，主控信息轮询获取获消息的
 *        qq 然后通过 Map 查询并分发下去
 *    2、可以通过机器人配置默认类，仅在构造函数传入 qq 号即可完成一个
 *        机器人的实例化。
 *    3、通过 SDK 首先实例化一个平台对象，传入框架服务器的相关信息
 ***************************************************************/
/********************** Tools Functions *************************/
function unicode2string(unicode: string) {
  let res = unicode.replace(/\\\\/g, '\\');
  return res ? res : '[]';
}

/**
 * @param {Object} dataPack 数据包
 * @描述 格式化数据包规范
 * @returns 如果找不到类型则返回null
 */
function getFormatData(dataPack: any) {
  if (!dataPack || !dataPack.type) {
    return null
  }
  let formatData = new Object()
  switch (dataPack.type) {
    // 群组消息
    case 'groupmsg':
      Object.assign(formatData, {
        fromUser: dataPack.fromqq.qq,
        fromGroup: dataPack.fromgroup.group,
        rawMessage: filterAt(dataPack.msg.msg, dataPack.logonqq),
        robot: dataPack.logonqq,
        isAt: isAt(dataPack.msg.msg, dataPack.logonqq),
        QQInfo: {
          card: dataPack.fromqq.card, // 群里的自定义名称
          nickname: dataPack.fromqq.spectitle
        },
        success: true
      })
      break;
    // 私聊消息
    case 'privatemsg':
      Object.assign(formatData, {
        fromUser: dataPack.fromqq.qq,
        rawMessage: filterAt(dataPack.msg.msg, dataPack.logonqq),
        robot: dataPack.logonqq,
        isAt: isAt(dataPack.msg.msg, dataPack.logonqq),
        QQInfo: {
          card: dataPack.fromqq.card, // 群昵称
          nickname: dataPack.fromqq.nickname // QQ 昵称
        },
        success: true
      })
      break;
    // 事件
    case 'eventmsg':
      let notice_type = '';
      let sub_type = ''
      switch (dataPack.msg.type) {
        case 2:
        case 25:
          notice_type = 'group_increase'
          break;
        case 5:
          sub_type = 'leave'
          notice_type = 'group_decrease'
          break;
        case 6:
          sub_type = 'kick'
          notice_type = 'group_decrease'
          break;
      }
      Object.assign(formatData, {
        fromUser: {},
        fromGroup: {},
        rawMessage: '',
        robot: dataPack.logonqq,
        isAt: false,
        QQInfo: {},
        user_id: dataPack.fromqq.qq,
        group_id: dataPack.fromgroup.group,
        notice_type,
        nickname: dataPack.fromqq.nickname,
        sub_type,
        success: true
      })
      break;
  }
  Object.assign(formatData, {
    type: dataPack.type,
    originMsgType: dataPack.msg.type
  })
  return formatData
}

// 过滤 @ 机器人
function filterAt(str: string, loginQQ: string) {
  if (!str) {
    return '';
  }
  let reg = new RegExp(`\\[@${loginQQ}\\]`, 'g');
  return str.replace(reg, '').trim();
}

function isAt(str: string, loginQQ: string) {
  return (str.indexOf(`[@${loginQQ}]`) != -1)
}
/****************************************************************/
/**
 * 框架类，实例化以后以 create 方法传入 qq 号实例化一个机器人
 */
export class BotSDK {
  private http: AxiosInstance; // axios 请求的示例对象
  private botList: Map<string | number, Array<Robot>>; // bot 机器人的 map 表，方便获取机器人 
  private botID: number = 0; // bot ID
  /**
   * 初始化一个机器人框架
   * @param {string} url 框架所在服务器地址
   * @param {string} user 用户名
   * @param {string} pass 用户密码
   * @param {string} uploadPath 事件上传路径，如 http://localhost:3000/botmessage 这里填 botmessage
   * @param {number} uploadPort 事件上传端口,如 http://localhost:3000/botmessage 这里填 3000
   */
  constructor(url: string, user: string = "", pass: string = "", uploadPath: string, uploadPort: number = 80) {
    this.botList = new Map<string, Array<Robot>>();
    this.http = axios.create({
      baseURL: url,
      timeout: 1000 * 20 // 超时时间 20s
    })
    this.http.defaults.withCredentials = true
    // 请求拦截器,本后台管理系统的所有请求均带上 token
    this.http.interceptors.request.use(function (config) {
      let timeStamp = Math.round(new Date().getTime() / 1000)
      config.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'H-Auth-User': user,
        'H-Auth-Timestamp': timeStamp,
        'H-Auth-Signature': `${md5(user + config.url + md5(pass) + timeStamp.toString())}`,
      }
      return config
    }, function (error) {
      // axios发生错误的处理
      return Promise.reject(error)
    })

    // 响应拦截器,不要那么多复杂数据了直接返回 data 就行
    this.http.interceptors.response.use(function (response): any {
      let returnData = null
      try {
        if (response.data && 'string' == typeof response.data) {
          let res = response.data.split('\n');
          res.forEach((elm, index) => {
            res[index] = JSON.parse(unicode2string(elm));
          });
          return res;
        }
        returnData = response.data ? [JSON.parse(unicode2string(JSON.stringify(response.data)))] : [];
        if (returnData.length == 1) {
          returnData = returnData[0];
        }
      } catch (error) {
        returnData = response.data
      }
      return returnData;
    },
      function (error) {
        // axios请求服务器端发生错误的处理
        return Promise.reject(error)
      })

    // 有设置上报地址则采用
    if (uploadPath && uploadPort) {
      // 创建事件上报监听服务
      let app = express();
      app.use(bp({
        extended: false
      }))
      app.post('/' + uploadPath, (req, response) => {
        for (let key in req.body) {
          let res = key + req.body[key];
          res = res.replace(/\\\\/g, '\\')
          let obj = JSON.parse(res);
          // 排除掉来自机器人的消息
          if (obj.fromqq && obj.fromqq.qq == obj.logonqq) {
            continue
          }
          // console.log(obj)
          // 遍历数据包然后分发下去且过滤掉自己发送的消息
          let resData = (getFormatData(obj) as any)
          // console.log(resData)
          if (resData && resData.success && resData.robot !== resData.fromUser) {
            // 获取 bot 对象并正确将消息分发下去
            let botArray = this.botList.get(String(resData.robot));
            if (botArray) {
              botArray.forEach(bot => {
                bot.fire(resData.type, resData)
              })
            }
          }
        }
        response.send();
      })

      app.listen(uploadPort, '0.0.0.0', () => {
        console.log('Event upload listen start for ' + uploadPort + '...')
      })
    } else {
      let timeStamp = Math.round(new Date().getTime() / 1000)
      let ws: WebSocket = null;
      let timeCount = 0;
      // 没有上报地址则使用 ws
      let initWs = () => {
        timeCount = 0;
        ws = new WebSocket(`ws://localhost:${url.split(':')[2]}/ws?user=${user}&timestamp=${timeStamp}&signature=${md5(user + "/ws" + md5(pass) + timeStamp.toString())}`)
        console.log('ws started ...');
      }
      initWs();
      // 接受信息
      ws.on('message', (message: String) => {
        if (message.toString() == '{"type":"heartbeatreply"}') {
          // 返回的心跳检测数据
          return;
        }
        let data = message.toString().replace(/\\\\/g, '\\');
        let originData: Array<any> = null;
        if (data && 'string' == typeof data) {
          let res = data.split('\n')
          res.forEach((elm, index) => {
            res[index] = JSON.parse(unicode2string(elm))
          })
          originData = res
        } else {
          originData = data ? [JSON.parse(unicode2string(JSON.stringify(data)))] : [];
        }
        for (let key in originData) {
          let obj = originData[key];
          // 排除掉来自机器人的消息
          if (obj.fromqq && obj.fromqq.qq == obj.logonqq) {
            continue
          }
          // console.log(obj)
          // 遍历数据包然后分发下去且过滤掉自己发送的消息
          let resData = (getFormatData(obj) as any)
          // console.log(resData)
          if (resData && resData.success && resData.robot !== resData.fromUser) {
            // 获取 bot 对象并正确将消息分发下去
            let botArray = this.botList.get(String(resData.robot));
            if (botArray) {
              botArray.forEach(bot => {
                bot.fire(resData.type, resData)
              })
            }
          }
        }
      })
      ws.on('error', error => {
        console.log('Error:', error)
        console.log('connect closed and will reconnect ws...');
        if (ws.CLOSED) {
          initWs();
        }
      })
      ws.on('close', info => {
        console.log('connect closed ... info:' + info + ' , will reconnect ws...');
        initWs();
      })

      setInterval(() => {
        timeCount += 5;
        if (ws.readyState == ws.OPEN) {
          ws.send(`method=heartbeat&user=${user}&timestamp=${timeStamp}&signature=${md5(user + "/ws" + md5(pass) + timeStamp.toString())}`)
          // console.log('send heart , ws hold '+ timeCount + 's ...')
        }
      }, 5000)
    }
  }

  /**
   * 创建一个 bot 
   * @param qq QQ号码
   */
  public createBot(qq: string | number) {
    qq = String(qq);
    ++this.botID;
    const bot = new Robot(qq, this.http, this.botID);
    let botArray = this.botList.get(qq);
    if (!botArray) {
      botArray = [];
    }
    botArray.push(bot);
    this.botList.set(qq, botArray);
    return bot
  }

  /**
   * 销毁一个 bot
   * @param botID bot的id
   */
  public destroyBot(bot: Robot) {
    let botArray = this.botList.get(String(bot.QQ));
    if (!botArray) {
      return;
    }
  }
}

// 防止异常中断
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});