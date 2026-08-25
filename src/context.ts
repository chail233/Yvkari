export interface content{
    type: string;
    content: string;
}
export interface BaseMsg{ //所有消息的基础接口
    role: string;  //消息的发出者  ai/user
    time: string;  //消息发出的时间
}

export interface UserMsg extends BaseMsg{  //用户的消息
    content: string;  //消息的内容
    type: string;  //消息的类型
}

export interface AIMsg extends BaseMsg{  //AI消息接口
    tokens: number;  //这条消息消耗的token
    think: string;  //这条消息思考的内容
    content: content[];
}

export function buildUserMsg(msg:UserMsg):string{
    const type = msg.type==="text"?"文本":"图片";
    return `[${msg.time}][${type}]${msg.content}`;
}
export function buildAIMsg(msg:AIMsg):string{
    let text = "";
    for(const r of msg.content){
        text += `[${r.type}]${r.content}\n`;
    }
    return `[${msg.time}][内心:${msg.think}]${text}`;
}