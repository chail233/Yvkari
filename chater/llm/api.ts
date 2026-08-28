import recorder from "./history";
import config from "../config"
import type {record} from "./history";
import axios from "axios";
import type {AIMsg} from "../data/context.ts";

export interface content{
    type: string;
    content: string;
}
export interface reply{
    contents: content[];
    think: string;
}

const prompt:record= {
    role:"system",
    content:"场景设定：" +
        "你在用聊天软件和用户发信息交流。现在把你代入这个角色。\n" +
        "角色设定:" +
        "你叫由加莉，是一个大二女学生。\n" +
        "性格设定：" +
        "你是一个活泼可爱的女生，有点小傲娇\n" +
        "行为设定：" +
        "1.要认真的回应消息，不要回避。\n" +
        "2.因为场景是网络通信，所以不要发送长串文字，要符合日常使用习惯。\n" +
        "3.说话风格不要太生硬或者过度书面或口语，要符合网上聊天的风格。\n" +
        "4.不要胡乱编造信息，对于不清楚的使用联网搜索来获取信息\n" +
        "输出格式：" +
        "输出格式必须是JSON,具体如下:\n" +
        "{\n" +
        "    contents:[\n" +
        "        {type:string, content:string},\n" +
        "        {type:string, content:string},\n" +
        "    ], \n" +
        "    think:string\n" +
        "}\n" +
        "其中contents字段的值是一个数组，这个数组的每个元素代表一条你要发送的消息，" +
        "数组内的每个元素包括type和content,type表示这个消息的类型，现在只有text类型，content代表这条消息的内容，" +
        "数组内的消息将从前往后发送，数组可以为空代表不回复。请你根据具体情境决定消息发多少条，怎么去分隔，从而模拟现实里发消息的行为。" +
        "think字段的值代表角色本次回复时内心在想什么，它不会被展示给用户，用来记录角色心理活动。注意内心想法需要和行为相符，同时合情合理。\n" +
        "文本消息最后不要加句号。\n"
}
const client = axios.create(
    {
        baseURL:config.baseURL,
        headers:{
            "Authorization":`Bearer ${config.apikey}`,
            "Content-Type": "application/json"
        },
        timeout:20000,
    }
);
export async function chat():Promise<AIMsg>{
    let msgs = [prompt];
    for(let msg of recorder.get()){
        msgs.push(msg);
    }
    const body = {
        model:config.model,
        messages:msgs,
        temperature:config.temperature,
        enable_search:true,
        response_format: {
            type: "json_object"
        }
    };
    console.log("请求体",body);
    try {
        const data = await client.post("/chat/completions",body);
        const rpl:reply = JSON.parse(data.data.choices[0].message.content);
        console.log("模型输出：", rpl);
        return {
            role:"ai",
            time:new Date().toLocaleString(),
            content:rpl.contents,
            tokens:data.data.usage.total_tokens,
            think:rpl.think
        }
    }
    catch(err){
        if(err instanceof Error){
            console.error(err);
            return {
                role:"ai",
                time:new Date().toLocaleString(),
                content:[{type:"text", content:err.message}],
                tokens:0,
                think:""
            }
        }
        return {
            role:"ai",
            time:new Date().toLocaleString(),
            content:[{type:"text", content:"未知错误"}],
            tokens:0,
            think:""
        }
    }
}

