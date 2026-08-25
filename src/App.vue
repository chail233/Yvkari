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
import axios from "axios";
import {ref} from "vue";
import type {UserMsg} from "./context.ts";
import type {AIMsg} from "./context.ts";

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
    try {
      const res = await axios({
        url: "http://localhost:1145/chater/api",
        method: "post",
        data: { content: data },
        timeout: 30000
      });
      const resMsg:AIMsg = res.data.data;
      for(const msg of resMsg.content){
        const perMsg:Message = {
          role:"ai",
          id:idCounter++,
          content:msg.content
        }
        messageList.value.push(perMsg);
      }
    }
    catch (err){
      console.error("请求失败", err);
      messageList.value.push({
        id: idCounter++,
        role: 'ai',
        content: '网络请求出错，请检查后端服务'
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