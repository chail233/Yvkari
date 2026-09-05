import config from "../../../config";
import axios from "axios";
import recorder from "../history";
export interface MemoryNode{
    memory_node_id:string;
    content:string;
    created_at:number;
    updated_at:number;
}
const client = axios.create({
    baseURL: config.baseURL+"/api/v2/apps/memory",
    headers: {
        "Authorization":`Bearer ${config.apikey}`,
        "Content-Type": "application/json",
    },
    timeout: 60000
});
export async function addMemory(){
    try {
        const body = {
            messages:recorder.buffer,
            user_id: config.userid,
            memory_library_id:"5745f810bd324ae0894137da51dc57bf"
        }
        // console.log("请求体",body);
        let res = await client.post("/add",body);
        res = res.data;
        console.log("添加记忆片段",res);
    }
    catch (err: any) {
        if (err.response) {
            console.log("状态码：", err.response.status);
            console.log("完整错误响应体：", err.response.data);
        } else if (err.request) {
            console.log("已经发出请求，但是服务器没有返回");
        } else {
            console.log("请求配置阶段出错：", err.message);
        }
    }
}
export async function getMemory(){
    try {
        const body = {
            user_id: config.userid,
            messages:recorder.get(),
            memory_library_id:"5745f810bd324ae0894137da51dc57bf"
        }
        // console.log("请求体",body);
        let res = await client.post("/memory_nodes/search",body);
        const data = res.data;
        console.log("召回结果",data);
        return data.memory_nodes as Array<MemoryNode>;
    }
    catch (err: any) {
        if (err.response) {
            console.log("状态码：", err.response.status);
            console.log("完整错误响应体：", err.response.data);
        } else if (err.request) {
            console.log("已经发出请求，但是服务器没有返回");
        } else {
            console.log("请求配置阶段出错：", err.message);
        }
    }
}