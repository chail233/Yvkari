<template>
  <div class="app-shell">
    <!-- Header -->
    <header class="chat-header">
      <div class="header-inner">
        <div class="header-brand">
          <span class="header-icon">✦</span>
          <h1>Yvkari</h1>
        </div>
        <p class="header-subtitle">awa</p>
      </div>
    </header>

    <!-- Messages -->
    <main class="chat-main" ref="chatMainRef">
      <div class="messages-container">
        <div
          v-for="item in messageList"
          :key="item.id"
          :class="['message', item.role === 'user' ? 'message--user' : 'message--ai']"
        >
          <div class="message-avatar">
            {{ item.role === 'user' ? 'U' : 'A' }}
          </div>
          <div class="message-bubble">
            <div class="message-content">{{ item.content }}</div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="messageList.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">💬</div>
          <p class="empty-title">开始对话</p>
          <p class="empty-desc">在下方输入</p>
        </div>
      </div>
    </main>

    <!-- Input -->
    <footer class="chat-footer">
      <div class="input-area">
        <el-input
          v-model="inputText"
          placeholder="输入消息..."
          :disabled="loading"
          clearable
          class="chat-input"
          @keyup.enter="sendMessage"
        />
        <el-button
          type="primary"
          @click="sendMessage"
          :loading="loading"
          :disabled="!inputText.trim()"
          class="send-btn"
          circle
        >
          <template v-if="!loading">↑</template>
        </el-button>
      </div>
      <p class="footer-hint">按 Enter 发送</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {ref, nextTick, watch} from "vue";
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
  const chatMainRef = ref<HTMLElement | null>(null);
  let idCounter = 0;

  async function scrollToBottom() {
    await nextTick();
    if (chatMainRef.value) {
      chatMainRef.value.scrollTop = chatMainRef.value.scrollHeight;
    }
  }

  watch(messageList, scrollToBottom, { deep: true });

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
        await new Promise(resolve => setTimeout(resolve, Math.max(10000, 600*perMsg.content.length)));
        messageList.value.push(perMsg);
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
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 860px;
  margin: 0 auto;
  padding: 0;
  background: var(--bg);
  box-shadow: var(--shadow-lg);
  position: relative;
}

/* ── Header ── */
.chat-header {
  flex-shrink: 0;
  padding: 18px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 22px;
  color: var(--accent);
  line-height: 1;
}

.chat-header h1 {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
}

.header-subtitle {
  font-size: 13px;
  color: var(--text);
  margin: 0;
  opacity: 0.7;
}

/* ── Messages ── */
.chat-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  background: var(--chat-bg);
  scroll-behavior: smooth;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

/* ── Message Bubbles ── */
.message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: msg-fade-in 0.25s ease-out;
}

@keyframes msg-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message--user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-top: 2px;
}

.message--user .message-avatar {
  background: linear-gradient(135deg, #409eff, #337ecc);
}

.message--ai .message-avatar {
  background: linear-gradient(135deg, var(--accent), #8b3fd4);
}

.message-bubble {
  max-width: 75%;
  padding: 10px 16px;
  border-radius: 16px;
  line-height: 1.55;
  font-size: 14.5px;
  word-break: break-word;
  position: relative;
}

.message--user .message-bubble {
  background: linear-gradient(135deg, #409eff, #337ecc);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.25);
}

.message--ai .message-bubble {
  background: var(--bg);
  color: var(--text-h);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.message-content {
  white-space: pre-wrap;
}

/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-h);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text);
  opacity: 0.7;
}

/* ── Footer / Input ── */
.chat-footer {
  flex-shrink: 0;
  padding: 16px 28px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.input-area {
  display: flex;
  gap: 10px;
  align-items: center;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.chat-input {
  flex: 1;
}

.chat-input :deep(.el-input__wrapper) {
  border-radius: 24px;
  padding: 4px 18px;
  box-shadow: var(--shadow-sm) !important;
  border: 1px solid var(--border);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input :deep(.el-input__wrapper:hover) {
  border-color: var(--accent-border);
}

.chat-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg) !important;
}

.chat-input :deep(.el-input__inner) {
  font-size: 14px;
  height: 40px;
}

.send-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: 700;
  transition: transform 0.15s, box-shadow 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.footer-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--text);
  opacity: 0.5;
  text-align: center;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .app-shell {
    height: 100dvh;
    box-shadow: none;
  }

  .chat-header {
    padding: 14px 18px;
  }

  .chat-header h1 {
    font-size: 17px;
  }

  .header-subtitle {
    display: none;
  }

  .chat-main {
    padding: 16px 14px;
  }

  .messages-container {
    gap: 14px;
  }

  .message-bubble {
    max-width: 85%;
    font-size: 14px;
    padding: 9px 13px;
  }

  .chat-footer {
    padding: 12px 14px 16px;
  }

  .footer-hint {
    display: none;
  }
}
</style>