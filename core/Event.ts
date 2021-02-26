export class Event {
  private _funList:Map<string,Function>

  constructor(){
    this._funList = new Map();
  }

  /**
   * 该模型仅支持一个名字同一个事件
   * @param event 事件名称
   * @param fun   触发函数 
   */
  public on(event:string,fun:Function){
    this._funList.set(event,fun);
  }

  /**
   * 解除该事件触发的功能
   * @param event 事件名称
   */
  public un(event:string){
    this._funList.delete(event);
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args  想要传递的额外参数 
   */
  public fire(event,args){
    let callFun = this._funList.get(event);
    if(callFun){
      callFun(args);
    }
  }
}