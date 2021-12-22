"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const Robot_1 = require("./bot/Robot");
const express_1 = __importDefault(require("express"));
const md5_1 = __importDefault(require("md5"));
const body_parser_1 = __importDefault(require("body-parser"));
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
function unicode2string(unicode) {
    let res = unicode.replace(/\\\\/g, '\\');
    return res ? res : '[]';
}
/**
 * @param {Object} dataPack 数据包
 * @描述 格式化数据包规范
 * @returns 如果找不到类型则返回null
 */
function getFormatData(dataPack) {
    if (!dataPack || !dataPack.type) {
        return null;
    }
    let formatData = new Object();
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
                    card: dataPack.fromqq.card,
                    nickname: dataPack.fromqq.spectitle
                },
                success: true
            });
            break;
        // 私聊消息
        case 'privatemsg':
            Object.assign(formatData, {
                fromUser: dataPack.fromqq.qq,
                rawMessage: filterAt(dataPack.msg.msg, dataPack.logonqq),
                robot: dataPack.logonqq,
                isAt: isAt(dataPack.msg.msg, dataPack.logonqq),
                QQInfo: {
                    card: dataPack.fromqq.card,
                    nickname: dataPack.fromqq.nickname // QQ 昵称
                },
                success: true
            });
            break;
        // 事件
        case 'eventmsg':
            let notice_type = '';
            let sub_type = '';
            switch (dataPack.msg.type) {
                case 2:
                case 25:
                    notice_type = 'group_increase';
                    break;
                case 5:
                    sub_type = 'leave';
                    notice_type = 'group_decrease';
                    break;
                case 6:
                    sub_type = 'kick';
                    notice_type = 'group_decrease';
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
            });
            break;
    }
    Object.assign(formatData, {
        type: dataPack.type,
        originMsgType: dataPack.msg.type
    });
    return formatData;
}
// 过滤 @ 机器人
function filterAt(str, loginQQ) {
    if (!str) {
        return '';
    }
    let reg = new RegExp(`\\[@${loginQQ}\\]`, 'g');
    return str.replace(reg, '').trim();
}
function isAt(str, loginQQ) {
    return (str.indexOf(`[@${loginQQ}]`) != -1);
}
/****************************************************************/
/**
 * 框架类，实例化以后以 create 方法传入 qq 号实例化一个机器人
 */
class BotSDK {
    /**
     * 初始化一个机器人框架
     * @param {string} url 框架所在服务器地址
     * @param {string} user 用户名
     * @param {string} pass 用户密码
     * @param {string} uploadPath 事件上传路径，如 http://localhost:3000/botmessage 这里填 botmessage
     * @param {number} uploadPort 事件上传端口,如 http://localhost:3000/botmessage 这里填 3000
     */
    constructor(url, user, pass, uploadPath, uploadPort = 80) {
        this.botID = 0; // bot ID
        this.botList = new Map();
        this.http = axios_1.default.create({
            baseURL: url,
            timeout: 1000 * 20 // 超时时间 20s
        });
        this.http.defaults.withCredentials = true;
        // 请求拦截器,本后台管理系统的所有请求均带上 token
        this.http.interceptors.request.use(function (config) {
            let timeStamp = Math.round(new Date().getTime() / 1000);
            config.headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'H-Auth-User': user,
                'H-Auth-Timestamp': timeStamp,
                'H-Auth-Signature': `${md5_1.default(user + config.url + md5_1.default(pass) + timeStamp.toString())}`
            };
            return config;
        }, function (error) {
            // axios发生错误的处理
            return Promise.reject(error);
        });
        // 响应拦截器,不要那么多复杂数据了直接返回 data 就行
        this.http.interceptors.response.use(function (response) {
            if (response.data && 'string' == typeof response.data) {
                let res = response.data.split('\n');
                res.forEach((elm, index) => {
                    res[index] = JSON.parse(unicode2string(elm));
                });
                return res;
            }
            return response.data ? [JSON.parse(unicode2string(JSON.stringify(response.data)))] : [];
        }, function (error) {
            // axios请求服务器端发生错误的处理
            return Promise.reject(error);
        });
        // 创建事件上报监听服务
        let app = express_1.default();
        app.use(body_parser_1.default({
            extended: false
        }));
        app.post('/' + uploadPath, (req, response) => {
            for (let key in req.body) {
                let res = key + req.body[key];
                res = res.replace(/\\\\/g, '\\');
                let obj = JSON.parse(res);
                // 排除掉来自机器人的消息
                if (obj.fromqq && obj.fromqq.qq == obj.logonqq) {
                    continue;
                }
                // console.log(obj)
                // 遍历数据包然后分发下去且过滤掉自己发送的消息
                let resData = getFormatData(obj);
                // console.log(resData)
                if (resData && resData.success && resData.robot !== resData.fromUser) {
                    // 获取 bot 对象并正确将消息分发下去
                    let botArray = this.botList.get(String(resData.robot));
                    if (botArray) {
                        botArray.forEach(bot => {
                            bot.fire(resData.type, resData);
                        });
                    }
                }
            }
            response.send();
        });
        app.listen(uploadPort, '0.0.0.0', () => {
            console.log('Event upload listen start for ' + uploadPort + '...');
        });
    }
    /**
     * 创建一个 bot
     * @param qq QQ号码
     */
    createBot(qq) {
        qq = String(qq);
        ++this.botID;
        const bot = new Robot_1.Robot(qq, this.http, this.botID);
        let botArray = this.botList.get(qq);
        if (!botArray) {
            botArray = [];
        }
        botArray.push(bot);
        this.botList.set(qq, botArray);
        return bot;
    }
    /**
     * 销毁一个 bot
     * @param botID bot的id
     */
    destroyBot(bot) {
        let botArray = this.botList.get(String(bot.QQ));
        if (!botArray) {
            return;
        }
    }
}
exports.BotSDK = BotSDK;
// 防止异常中断
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
