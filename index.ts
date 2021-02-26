import axios, { AxiosInstance } from "axios";
import qs from 'qs'
import { Robot } from "./bot/Robot";
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
  if (!dataPack || !dataPack.Type) {
    return null
  }
  let formatData = new Object()
  switch (dataPack.Type) {
    // 群组消息
    case 'GroupMsg':
      Object.assign(formatData, {
        fromUser: dataPack.FromQQ.UIN,
        fromGroup: dataPack.FromGroup.GIN,
        rawMessage: filterAt(dataPack.Msg.Text, dataPack.LogonQQ),
        robot: dataPack.LogonQQ,
        isAt: isAt(dataPack.Msg.Text, dataPack.LogonQQ),
        QQInfo: {
          card: dataPack.FromQQ.Card,
          nickname: dataPack.FromQQ.specTitle
        },
        success: true
      })
      break;
    // 私聊消息
    case 'PrivateMsg':
      Object.assign(formatData, {
        fromUser: dataPack.FromQQ.UIN,
        rawMessage: filterAt(dataPack.Msg.Text, dataPack.LogonQQ),
        robot: dataPack.LogonQQ,
        isAt: isAt(dataPack.Msg.Text, dataPack.LogonQQ),
        QQInfo: {
          card: dataPack.FromQQ.specTitle, // 群昵称
          nickname: dataPack.FromQQ.NickName // QQ 昵称
        },
        success: true
      })
      break;
    // 事件
    case 'EventMsg':
      let notice_type = '';
      let sub_type = ''
      switch (dataPack.Msg.Type) {
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
        robot: dataPack.LogonQQ,
        isAt: false,
        QQInfo: {},
        user_id: dataPack.FromQQ.UIN,
        group_id: dataPack.FromGroup.GIN,
        notice_type,
        nickname: dataPack.FromQQ.NickName,
        sub_type,
        success: true
      })
      break;
  }
  Object.assign(formatData, {
    type: dataPack.Type,
    originMsgType: dataPack.Msg.Type
  })
  return formatData
}

// 过滤 @ 机器人
function filterAt(str: string, loginQQ: string) {
  let reg = new RegExp(`\\[@${loginQQ}\\]`, 'g');
  return str.replace(reg, '').trim();
}

function isAt(str: string, loginQQ: string) {
  return (str.indexOf(`[@${loginQQ}]`) != -1)
}
/****************************************************************/
/**
 * 框架梁类，实例化以后以 create 方法传入 qq 号实例化一个机器人
 */
export class BotSDK {
  private http: AxiosInstance; // axios 请求的示例对象
  private botList: Map<string | number, Array<Robot>>; // bot 机器人的 map 表，方便获取机器人 
  private botID: number = 0; // bot ID
  /**
   * 初始化一个机器人框架
   * @param {string} url 框架所在服务器地址
   * @param {string} pass 是否需要密码连接验证
   */
  constructor(url: string, pass: string) {
    this.botList = new Map<string, Array<Robot>>();
    this.http = axios.create({
      baseURL: url,
      timeout: 1000 * 20 // 超时时间 20s
    })
    this.http.defaults.withCredentials = true
    // http.post['Content-Type'] = 'application/x-www-form-urlencoded'
    // 请求拦截器,本后台管理系统的所有请求均带上 token
    this.http.interceptors.request.use(function (config) {
      config.headers = {
        'Content-Type': 'text/html;charset=utf-8',
        'Cookie': 'pass=' + pass
      }
      return config
    }, function (error) {
      // axios发生错误的处理
      return Promise.reject(error)
    })

    // 响应拦截器,不要那么多复杂数据了直接返回 data 就行
    this.http.interceptors.response.use(function (response): any {
      if (response.data && 'string' == typeof response.data) {
        let res = response.data.split('\n')
        res.forEach((elm, index) => {
          res[index] = JSON.parse(unicode2string(elm))
        })
        return res
      }
      return response.data ? [JSON.parse(unicode2string(JSON.stringify(response.data)))] : []
    },
      function (error) {
        // axios请求服务器端发生错误的处理
        return Promise.reject(error)
      })

    //获取会话窗口，然后进行轮询,然后分发下去数据
    this.http.post('/allocsession').then((res) => {
      let session_id = res[0].session_id
      // 200 毫秒一轮询
      setInterval(() => {
        this.http.post('/getevent',
          qs.stringify({
            'sessid': session_id
          })
        ).then(res => {
          // 遍历数据包然后分发下去且过滤掉自己发送的消息
          (res as any).forEach(data => {
            let resData = (getFormatData(data) as any)
            if (resData && resData.success && resData.robot !== resData.fromUser) {
              // 获取 bot 对象并正确将消息分发下去
              let botArray = this.botList.get(String(resData.robot));
              if (botArray) {
                botArray.forEach(bot => {
                  bot.fire(resData.type, resData)
                })
              }
            }
          })
        }).catch(error => {
          console.log(error)
        })
      }, 200)
    })
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