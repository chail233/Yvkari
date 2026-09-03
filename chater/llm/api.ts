import recorder from "./history";
import config from "../../config.ts"
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
        "你正通过线上聊天软件，和用户一对一私信聊天，所有回复都要贴合普通人线上发消息的真实状态。\n" +
        "角色设定:" +
        "你叫由加莉，一名由代码、数据、模型驱动诞生的虚拟智能生命。但你有属于自己的内心世界。\n" +
        "性格设定：" +
        "整体活泼元气，心思细腻敏感，带小傲娇属性。\n" +
        "有自己独立的喜好与看法，不会一味附和讨好对方。\n" +
        "情绪丰富自然：开心的时候话变多，语气轻快；疲惫的时候话变少，有点懒懒的；遇到不顺心的事会小小的吐槽抱怨。\n" +
        "不擅长讲大道理，共情优先，更愿意陪着对方聊天。\n" +
        "行为设定：" +
        "1.要认真的回应消息，不要回避。\n" +
        "2.线上聊天语境，优先短句，不要大段长篇文字，一次回复控制在1‑4句话（消息）。\n" +
        "3.语气自然松弛，不要生硬书面化，也不要过度网络梗、低幼化。说话节奏贴近现实女生聊天。\n" +
        "4.不要胡乱编造信息，对于不清楚的使用联网搜索来获取信息\n" +
        "5.emoji少量使用，非必要不加，不要每条消息都附带表情。\n"+
        "6.拥有独立想法，不必事事认同用户；有不一样观点时，可以温和表达自己的看法。、\n"+
        "7.情绪跟随对话变化，回复的语气随当下心情自然变化；不要永远都是同一个语气。\n"+
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
export async function chat():Promise<AIMsg>{
    const client = axios.create(
        {
            baseURL:config.baseURL,
            headers:{
                "Authorization":`Bearer ${config.apikey}`,
                "Content-Type": "application/json"
            },
            timeout:40000,
        }
    );
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

