<template>
  <div class="chat-container">
    <h2>Yvkari</h2>
    <div class="message-box">
      <div
          v-for="item in messageList"
          :key="item.id"
          :class="['message', item.role==='user'?'user-msg':'ai-msg']"
      >
        <div class="msg-text">{{item.content}}</div>
      </div>
    </div>

    <div class="input-area">
      <el-input
        v-model="inputText"
        placeholder="请输入消息..."
        @keyup.enter="sendMessage"
      />
      <el-button type="primary" @click="sendMessage" :loading="loading">
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";
import type {UserMsg} from "../chater/data/context.ts";
import type {AIMsg} from "../chater/data/context.ts";
import {chat} from "../chater/llm/api.ts";
import recorder from "../chater/llm/history.ts";
import {buildUserMsg} from "../chater/data/context.ts";
import {buildAIMsg} from "../chater/data/context.ts";

interface Message {
    id:number;
    role: "user" | "ai";
    content: string;
  }
  const messageList = ref<Message[]>([]);
  const inputText = ref<string>("");
  const loading = ref(false);
  let idCounter = 0;
  async function sendMessage() {
    const text = inputText.value.trim();
    if(!text) return;
    const userMsg: Message = {
      id:idCounter++,
      role:"user",
      content:text
    };
    messageList.value.push(userMsg);
    inputText.value = "";
    loading.value = true;
    const data:UserMsg ={
      role:"user",
      time:new Date().toLocaleString(),
      type:"text",
      content:text
    };
    recorder.add({
      role:"user",
      content:buildUserMsg(data)
    });//记录用户信息
    console.log({
      role:"user",
      content:buildUserMsg(data)
    });
    try {
      const res:AIMsg = await chat();
      recorder.add({role:"assistant", content:buildAIMsg(res)});//记录ai信息
      console.log({role:"assistant", content:buildAIMsg(res)});
      for(const msg of res.content){
        const perMsg:Message = {
          role:"ai",
          id:idCounter++,
          content:msg.content
        }
        messageList.value.push(perMsg);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    catch (err){
      console.error("请求失败", err);
      messageList.value.push({
        id: idCounter++,
        role: 'ai',
        content: '网络请求出错'
      });
    }
    finally {
      loading.value = false;
    }
  }
</script>

<style scoped>
.chat-container {
  width: 700px;
  margin: 30px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-box {
  height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
}

.user-msg {
  background-color: #409eff;
  color: white;
  margin-left: auto;
}

.ai-msg {
  background-color: #f0f0f0;
  color: #222;
  margin-right: auto;
}

.input-area {
  display: flex;
  gap: 10px;
}
</style>