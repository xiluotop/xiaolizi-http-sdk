"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("../core/Event");
const qs_1 = __importDefault(require("qs"));
/**
 * 机器人类，有回调事件，上发操作等功能。
 */
class Robot extends Event_1.Event {
    constructor(qq, http, botID) {
        super();
        this.qq = '';
        this.botID = '';
        this.http = null;
        this._onPrivateMsg = null;
        this._onGroupMsg = null;
        this._onEventMsg = null;
        this.groupFunMap = null;
        this.privateCmdAction = null;
        this.groupCmdAction = null;
        this.qq = qq;
        this.http = http;
        this.botID = botID;
        this.groupFunMap = new Map();
        this.privateCmdAction = new Map();
        this.groupCmdAction = new Map();
        this.on('PrivateMsg', pack => {
            if (this._onPrivateMsg) {
                this._onPrivateMsg(pack);
            }
            // 遍历注册指令
            this.privateCmdAction.forEach((doAction, cmdArray) => {
                if (cmdArray.includes(pack.rawMessage)) {
                    doAction(pack);
                }
            });
        });
        this.on('GroupMsg', pack => {
            if (this._onGroupMsg) {
                this._onGroupMsg(pack);
            }
            let groupFun = this.groupFunMap.get(String(pack.fromGroup));
            if (groupFun) {
                groupFun(pack);
            }
            // 遍历注册指令
            this.groupCmdAction.forEach((doAction, cmdArray) => {
                if (cmdArray.includes(pack.rawMessage) && (doAction.group == pack.fromGroup)) {
                    doAction(pack);
                }
            });
        });
        this.on('EventMsg', pack => {
            if (this._onEventMsg) {
                this._onEventMsg(pack);
            }
        });
    }
    get id() {
        return this.botID;
    }
    get QQ() {
        return this.qq;
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
    set onPrivateMsg(fun) {
        this._onPrivateMsg = fun;
    }
    get onPrivateMsg() {
        return this._onPrivateMsg;
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
    set onGroupMsg(fun) {
        this._onGroupMsg = fun;
    }
    get onGroupMsg() {
        return this._onGroupMsg;
    }
    /**
     * 绑定特定群组回调消息
     * @param group 群号
     * @param fun   回调函数，返回的参数为消息数据包
     */
    setOnGroupMsg(group, fun) {
        this.groupFunMap.set(String(group), fun);
    }
    getOnGroupMsg(group) {
        return this.groupFunMap.get(String(group));
    }
    /**
     * 当操作事件触发时，回调时带回消息包
     */
    set onEventMsg(fun) {
        this._onEventMsg = fun;
    }
    get onEventMsg() {
        return this._onEventMsg;
    }
    /**
     * 快速注册一个私聊指令并执行对应的方法
     * @param cmd       监听的指令
     * @param doAction  要执行的动作，回调参数为发送者相关信息
     */
    regPrivateCmd(cmd, doAction) {
        this.privateCmdAction.set(cmd, doAction);
    }
    /**
     * 快速注册一个群要使用的指令并执行对应的方法
     * @param group     监听的目标群
     * @param cmd       监听的指令
     * @param doAction  要执行的动作，回调参数为发送者相关信息
     */
    regGroupCmd(group, cmd, doAction) {
        Object.assign(doAction, {
            group
        });
        this.groupCmdAction.set(cmd, doAction);
    }
    /********************************************************** 工具 tools ************************************************************/
    /**
     * 发送好友私聊消息
     * @param toqq 目标 QQ
     * @param text 发送的文本
     */
    sendPrivateMsg(toqq, text) {
        this.http.post('/sendprivatemsg', qs_1.default.stringify({
            'fromqq': this.qq,
            toqq,
            text,
        }));
    }
    /**
     * 发送群临时会话消息
     * @param fromGroup 来自群号
     * @param toqq 目标 QQ
     * @param text 发送文本
     */
    sendGroupPrivateMsg(fromGroup, toqq, text) {
        this.http.post('/sendgrouptempmsg', qs_1.default.stringify({
            'fromqq': this.qq,
            'togroup': fromGroup,
            toqq,
            text,
        }));
    }
    /**
     * 发送群组消息
     * @param toGroup 目标群
     * @param text 文本
     * @param anonymous 是否匿名，默认：false
     */
    sendGroupMsg(toGroup, text, anonymous = false) {
        this.http.post('/sendgroupmsg', qs_1.default.stringify({
            'fromqq': this.qq,
            'togroup': toGroup,
            text,
            anonymous,
        }));
    }
    /**
     * 私聊发送图片
     * @param toqq      发送目标 qq
     * @param imgSrc    图片资源：url,base64,路径均可
     * @param flashpic  是否发送闪照，默认 false
     */
    sendPrivateImg(toqq, imgSrc, flashpic = false) {
        // fromtype 0 为 pic 格式 base64；2 为 url 网络图片
        if (imgSrc.indexOf('http:') != -1 || imgSrc.indexOf('https:') != -1) {
            this.http.post('/sendprivatepic', qs_1.default.stringify({
                'fromqq': this.qq,
                toqq,
                'fromtype': 2,
                'url': imgSrc,
                flashpic
            })).then(data => {
                data = data[0];
                this.sendPrivateMsg(toqq, data.ret);
            }).catch(data => {
                console.log(data);
            });
        }
        else {
            this.http.post('/sendprivatepic', qs_1.default.stringify({
                'fromqq': this.qq,
                toqq,
                'fromtype': 0,
                'pic': imgSrc,
                flashpic
            })).then(data => {
                data = data[0];
                this.sendPrivateMsg(toqq, data.ret);
            }).catch(data => {
                console.log(data);
            });
        }
    }
    /**
     * 发送群临时私聊图片
     * @param fromGroup 群号
     * @param toqq      目标 qq
     * @param imgSrc    图片资源
     * @param flashpic  是否闪照
     */
    sendGroupPrivateImg(fromGroup, toqq, imgSrc, flashpic = false) {
        // fromtype 0 为 pic 格式 base64；2 为 url 网络图片
        if (imgSrc.indexOf('http:') != -1 || imgSrc.indexOf('https:') != -1) {
            this.http.post('/sendprivatepic', qs_1.default.stringify({
                'fromqq': this.qq,
                toqq,
                'fromtype': 2,
                'url': imgSrc,
                flashpic
            })).then(data => {
                data = data[0];
                this.sendGroupPrivateMsg(fromGroup, toqq, data.ret);
            }).catch(data => {
                console.log(data);
            });
        }
        else {
            this.http.post('/sendprivatepic', qs_1.default.stringify({
                'fromqq': this.qq,
                toqq,
                'fromtype': 0,
                'pic': imgSrc,
                flashpic
            })).then(data => {
                data = data[0];
                this.sendGroupPrivateMsg(fromGroup, toqq, data.ret);
            }).catch(data => {
                console.log(data);
            });
        }
    }
    /**
     * 向群发送图片
     * @param togroup  目标群号
     * @param imgSrc   图片资源
     * @param flashpic 是否为闪照
     */
    sendGroupImg(togroup, imgSrc, flashpic = false) {
        // fromtype 0 为 pic 格式 base64；2 为 url 网络图片
        if (imgSrc.indexOf('http:') != -1 || imgSrc.indexOf('https:') != -1) {
            this.http.post('/sendgrouppic', qs_1.default.stringify({
                'fromqq': this.qq,
                togroup,
                'fromtype': 2,
                'url': imgSrc,
                flashpic
            })).then(data => {
                data = data[0];
                this.sendGroupMsg(togroup, data.ret);
            }).catch(data => {
                console.log(data);
            });
        }
        else {
            this.http.post('/sendgrouppic', qs_1.default.stringify({
                'fromqq': this.qq,
                togroup,
                'fromtype': 0,
                'pic': imgSrc,
                flashpic
            })).then(data => {
                data = data[0];
                this.sendGroupMsg(togroup, data.ret);
            }).catch(data => {
                console.log(data);
            });
        }
    }
    /**
     * 赠送群礼物
     * @param group   哪个群赠送礼物
     * @param toqq    目标 qq
     * @param pkgid   礼物 id，不传参数默认随机
     * @return {Promise} data[0].retcode 为 0 时执行成功
     */
    sendGroupGift(group, toqq, pkgid = 0) {
        let pkgList = [299, 302, 280, 281, 284, 285, 286, 289, 290, 313, 307, 312, 308];
        if (!pkgid) {
            let index = Math.floor(Math.random() * (pkgList.length - 1 - 0 + 1) + 0);
            pkgid = pkgList[index];
        }
        return this.http.post('/sendfreepackage', qs_1.default.stringify({
            'fromqq': this.qq,
            group,
            toqq,
            pkgid
        })).then(data => { data = data[0]; data.ret = JSON.parse(data.ret); return data.ret; });
    }
}
exports.Robot = Robot;
