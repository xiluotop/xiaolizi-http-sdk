import { Event } from '../core/Event'
import { AxiosInstance } from 'axios';
import qs from 'qs';

// qq,group 消息结构体
interface InfoDataPack {
  fromUser: number,
  fromGroup: number,
  rawMessage: string,
  robot: number,
  isAt: boolean,
  QQInfo: {
    card: string,
    nickname: string
  },
  success: boolean,
  type: string,
  originMsgType: number
}

// 事件消息结构体
interface EventDataPack {
  fromUser: {},
  fromGroup: {},
  rawMessage: '',
  robot: number,
  isAt: boolean,
  QQInfo: {},
  user_id: number,
  group_id: number,
  notice_type: string,
  nickname: string,
  sub_type: string,
  success: boolean,
  type: string,
  originMsgType: number
}

/**
 * 机器人类，有回调事件，上发操作等功能。
 */
export class Robot extends Event {
  private qq: string | number = '';
  private botID: string = '';
  private http: AxiosInstance = null;
  private _onPrivateMsg: Array<Function> = [];
  private _onGroupMsg: Array<Function> = [];
  private _onEventMsg: Array<Function> = [];
  private groupFunMap: Map<string | number, Function> = null;
  private privateCmdAction: Map<Array<string | number>, Function> = null;
  private groupCmdAction: Map<Array<string | number>, Function> = null;

  constructor(qq: string | number, http: AxiosInstance, botID) {
    super();
    this.qq = String(qq);
    this.http = http;
    this.botID = botID;
    this.groupFunMap = new Map();
    this.privateCmdAction = new Map();
    this.groupCmdAction = new Map();
    this.on('PrivateMsg', pack => {
      if (this._onPrivateMsg) {
        this._onPrivateMsg.forEach(fun=>{
          if(fun){
            fun(pack);
          }
        })
      }

      // 遍历注册指令
      this.privateCmdAction.forEach((doAction, cmdArray) => {
        if (cmdArray.includes(pack.rawMessage)) {
          doAction(pack);
        }
      })
    })

    this.on('GroupMsg', pack => {
      if (this._onGroupMsg) {
        this._onGroupMsg.forEach(fun=>{
          if(fun){
            fun(pack);
          }
        })
      }
      let groupFun = this.groupFunMap.get(String(pack.fromGroup));
      if (groupFun) {
        groupFun(pack);
      }

      // 遍历注册指令
      this.groupCmdAction.forEach((doAction, cmdArray) => {
        if (cmdArray.includes(pack.rawMessage) && ((doAction as any).group == pack.fromGroup)) {
          doAction(pack);
        }
      })
    })

    this.on('EventMsg', pack => {
      if (this._onEventMsg) {
        this._onEventMsg.forEach(fun=>{
          if(fun){
            fun(pack);
          }
        })
      }
    })
  }

  public get id() {
    return this.botID
  }

  public get QQ() {
    return this.qq
  }

  /**
   * 当私聊信息触发时，回调时带回消息包
   * @param resPack 参数包
   * ```
   * {
   *  fromUser:   发送者QQ
   *  rawMessage：接收的消息
   *  robot：     框架QQ
   *  isAt：      机器人是否被 at 的
   *  OOInfo：{card,nickname} // 昵称，群昵称
   *  success：   成功状态
   * }
   * ```
   */
  public onPrivateMsg(fun: (pack: InfoDataPack) => void) {
    this._onPrivateMsg.push(fun);
  }

  /**
   * 当群聊消息触发时，回调时带回消息包
   * @param resPack 参数包
   * ```
   * {
   *  fromUser:   发送者QQ
   *  fromGroup:  接收群
   *  rawMessage：接收的消息
   *  robot：     框架QQ
   *  isAt：      机器人是否被 at 的
   *  OOInfo：{card,nickname} // 昵称，群昵称
   *  success：   成功状态
   * }
   * ```
   */
  public onGroupMsg(fun: (pack: InfoDataPack) => void) {
    this._onGroupMsg.push(fun);
  }

  /**
   * 绑定特定群组回调消息
   * @param group 群号
   * @param fun   回调函数，返回的参数为消息数据包
   */
  public setOnGroupMsg(group: string | number, fun: (pack: InfoDataPack) => void) {
    this.groupFunMap.set(String(group), fun);
  }
  public getOnGroupMsg(group: string | number) {
    return this.groupFunMap.get(String(group))
  }

  /**
   * 当操作事件触发时，回调时带回消息包
   */
  public onEventMsg(fun: (pack: EventDataPack) => void) {
    this._onEventMsg.push(fun);
  }

  /**
   * 快速注册一个私聊指令并执行对应的方法
   * @param {Array<string>} cmd       监听的指令
   * @param doAction  要执行的动作，回调参数为发送者相关信息
   */
  public regPrivateCmd(cmd: Array<string | number>, doAction: (pack: InfoDataPack) => void) {
    this.privateCmdAction.set(cmd, doAction);
  }

  /**
   * 快速注册一个群要使用的指令并执行对应的方法
   * @param group     监听的目标群
   * @param {Array<string>} cmd       监听的指令
   * @param doAction  要执行的动作，回调参数为发送者相关信息
   */
  public regGroupCmd(group: string | number, cmd: Array<string | number>, doAction: (pack: InfoDataPack) => void) {
    Object.assign(doAction, {
      group
    })
    this.groupCmdAction.set(cmd, doAction);
  }

  /********************************************************** 工具 tools ************************************************************/
  /**
   * 发送好友私聊消息
   * @param toqq 目标 QQ
   * @param text 发送的文本
   */
  public sendPrivateMsg(toqq: string | number, text: string) {
    this.http.post('/sendprivatemsg',
      qs.stringify({
        'fromqq': this.qq,
        toqq,
        text,
      })
    )
  }

  /**
   * 发送群临时会话消息
   * @param fromGroup 来自群号
   * @param toqq 目标 QQ
   * @param text 发送文本
   */
  public sendGroupPrivateMsg(fromGroup: string | number, toqq: string | number, text: string) {
    this.http.post('/sendgrouptempmsg',
      qs.stringify({
        'fromqq': this.qq,
        'togroup': fromGroup,
        toqq,
        text,
      })
    )
  }

  /**
   * 发送群组消息
   * @param toGroup 目标群
   * @param text 文本
   * @param anonymous 是否匿名，默认：false
   */
  public sendGroupMsg(toGroup: string | number, text: string, anonymous: boolean = false) {
    this.http.post('/sendgroupmsg',
      qs.stringify({
        'fromqq': this.qq,
        'togroup': toGroup,
        text,
        anonymous,
      })
    )
  }

  /**
   * 私聊发送图片
   * @param toqq      发送目标 qq
   * @param imgSrc    图片资源：url,base64,路径均可
   * @param flashpic  是否发送闪照，默认 false
   */
  public sendPrivateImg(toqq: string | number, imgSrc: string, flashpic: boolean = false) {
    // fromtype 0 为 pic 格式 base64；2 为 url 网络图片
    if (imgSrc.indexOf('http:') != -1 || imgSrc.indexOf('https:') != -1) {
      this.http.post('/sendprivatepic',
        qs.stringify({
          'fromqq': this.qq,
          toqq,
          'fromtype': 2,
          'url': imgSrc,
          flashpic
        })
      ).then(data => {
        data = data[0]
        this.sendPrivateMsg(toqq, (data as any).ret);
      }).catch(data => {
        console.log(data)
      })
    } else {
      this.http.post('/sendprivatepic',
        qs.stringify({
          'fromqq': this.qq,
          toqq,
          'fromtype': 0,
          'pic': imgSrc,
          flashpic
        })
      ).then(data => {
        data = data[0]
        this.sendPrivateMsg(toqq, (data as any).ret);
      }).catch(data => {
        console.log(data)
      })
    }
  }

  /**
   * 发送群临时私聊图片
   * @param fromGroup 群号
   * @param toqq      目标 qq
   * @param imgSrc    图片资源
   * @param flashpic  是否闪照
   */
  public sendGroupPrivateImg(fromGroup: string | number, toqq: string | number, imgSrc: string, flashpic: boolean = false) {
    // fromtype 0 为 pic 格式 base64；2 为 url 网络图片
    if (imgSrc.indexOf('http:') != -1 || imgSrc.indexOf('https:') != -1) {
      this.http.post('/sendprivatepic',
        qs.stringify({
          'fromqq': this.qq,
          toqq,
          'fromtype': 2,
          'url': imgSrc,
          flashpic
        })
      ).then(data => {
        data = data[0]
        this.sendGroupPrivateMsg(fromGroup, toqq, (data as any).ret);
      }).catch(data => {
        console.log(data)
      })
    } else {
      this.http.post('/sendprivatepic',
        qs.stringify({
          'fromqq': this.qq,
          toqq,
          'fromtype': 0,
          'pic': imgSrc,
          flashpic
        })
      ).then(data => {
        data = data[0]
        this.sendGroupPrivateMsg(fromGroup, toqq, (data as any).ret);
      }).catch(data => {
        console.log(data)
      })
    }
  }

  /**
   * 向群发送图片
   * @param togroup  目标群号
   * @param imgSrc   图片资源
   * @param flashpic 是否为闪照
   */
  public sendGroupImg(togroup: string | number, imgSrc: string, flashpic: boolean = false) {
    // fromtype 0 为 pic 格式 base64；2 为 url 网络图片
    if (imgSrc.indexOf('http:') != -1 || imgSrc.indexOf('https:') != -1) {
      this.http.post('/sendgrouppic',
        qs.stringify({
          'fromqq': this.qq,
          togroup,
          'fromtype': 2,
          'url': imgSrc,
          flashpic
        })
      ).then(data => {
        data = data[0]
        this.sendGroupMsg(togroup, (data as any).ret)
      }).catch(data => {
        console.log(data)
      })
    } else {
      this.http.post('/sendgrouppic',
        qs.stringify({
          'fromqq': this.qq,
          togroup,
          'fromtype': 0,
          'pic': imgSrc,
          flashpic
        })
      ).then(data => {
        data = data[0]
        this.sendGroupMsg(togroup, (data as any).ret)
      }).catch(data => {
        console.log(data)
      })
    }
  }

  /**
   * 赠送群礼物：此接口当前为更新，仅能送出三个鲜花
   * @param group   哪个群赠送礼物
   * @param toqq    目标 qq
   * @param pkgid   礼物 id，不传参数默认随机
   * @return {Promise} data.retcode 为 0 时执行成功
   */
  public sendGroupGift(group: string | number, toqq: string | number, pkgid: number = 0) {
    let pkgList = [299, 302, 280, 281, 284, 285, 286, 289, 290, 313, 307, 312, 308]
    if (!pkgid) {
      let index = Math.floor(Math.random() * (pkgList.length - 1 - 0 + 1) + 0)
      pkgid = pkgList[index]
    }

    return this.http.post('/sendfreepackage',
      qs.stringify({
        'fromqq': this.qq,
        group,
        toqq,
        pkgid
      })
    ).then(data => { data = data[0]; (data as any).ret = JSON.parse((data as any).ret); return (data as any).ret })
  }
}