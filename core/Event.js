"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Event {
    constructor() {
        this._funList = new Map();
    }
    /**
     * 该模型仅支持一个名字同一个事件
     * @param event 事件名称
     * @param fun   触发函数
     */
    on(event, fun) {
        this._funList.set(event, fun);
    }
    /**
     * 解除该事件触发的功能
     * @param event 事件名称
     */
    un(event) {
        this._funList.delete(event);
    }
    /**
     * 触发事件
     * @param event 事件名称
     * @param args  想要传递的额外参数
     */
    fire(event, args) {
        let callFun = this._funList.get(event);
        if (callFun) {
            callFun(args);
        }
    }
}
exports.Event = Event;
