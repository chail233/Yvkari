<template>
  <div class="app-shell">
    <!-- Header -->
    <header class="chat-header">
      <div class="header-bg"></div>
      <div class="header-inner">
        <div class="header-brand">
          <div class="header-icon-ring">
            <span class="header-icon">✦</span>
          </div>
          <h1>Yvkari</h1>
        </div>
        <div class="header-right">
          <div class="header-status">
            <span class="status-dot"></span>
            <span class="status-text">{{ loading ? '输入中...' : '在线' }}</span>
          </div>
          <button class="menu-btn" @click="showSidebar = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Messages -->
    <main class="chat-main" ref="chatMainRef">
      <div class="chat-main-inner">
        <div class="messages-container">
          <div
            v-for="item in messageList"
            :key="item.id"
            :class="['message', item.role === 'user' ? 'message--user' : 'message--ai']"
          >
            <div class="message-avatar-wrapper">
              <div class="message-avatar">
                {{ item.role === 'user' ? 'U' : 'Y' }}
              </div>
            </div>
            <div class="message-body">
              <div class="message-bubble">
                <div class="message-content">{{ item.content }}</div>
              </div>
              <span class="message-time">{{ item.role === 'ai' ? 'Yvkari' : item.read ? "已读" : "未读" }} · {{ item.time }}</span>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="messageList.length === 0 && !loading" class="empty-state">
            <div class="empty-graphic">
              <div class="empty-ring"></div>
              <span class="empty-icon">✦</span>
            </div>
            <p class="empty-title">开始对话</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Input -->
    <footer class="chat-footer">
      <div class="footer-bg"></div>
      <div class="input-area">
        <el-input
          v-model="inputText"
          placeholder="输入消息..."
          clearable
          class="chat-input"
          @keyup.enter="sendMessage"
        />
        <el-button
          type="primary"
          @click="sendMessage"
          :disabled="!inputText.trim()"
          class="send-btn"
          circle
        >
          ↑
        </el-button>
      </div>
      <p class="footer-hint">按 Enter 发送</p>
    </footer>
  </div>

  <!-- Sidebar -->
  <Transition name="sidebar-slide">
    <aside v-if="showSidebar" class="sidebar-panel">
      <div class="sidebar-header">
        <h3>菜单</h3>
        <button class="sidebar-close" @click="showSidebar = false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sidebar-body">
        <div class="sidebar-tabs">
          <button :class="['tab-btn', { active: sidebarTab === 'stats' }]" @click="sidebarTab = 'stats'">总消耗</button>
          <button :class="['tab-btn', { active: sidebarTab === 'settings' }]" @click="sidebarTab = 'settings'">设置</button>
        </div>

        <div v-show="sidebarTab === 'stats'" class="tab-content">
          <div class="cost-card">
            <div class="cost-label">总消耗</div>
            <div class="cost-value">{{ total_cost.toLocaleString() }}</div>
            <div class="cost-unit">Tokens</div>
          </div>
        </div>

        <div v-show="sidebarTab === 'settings'" class="tab-content">
          <div class="settings-group">
            <label class="setting-label">API 地址</label>
            <input class="setting-input" v-model="settings.baseURL" @input="saveSettings" placeholder="https://api.example.com/v1" />
          </div>
            <div class="settings-group">
                <label class="setting-label">API Key</label>
                <input class="setting-input" type="password" v-model="settings.apikey" @input="saveSettings" placeholder="••••••••••••••••" />
            </div>
          <div class="settings-group">
            <label class="setting-label">模型</label>
            <input class="setting-input" v-model="settings.model" @input="saveSettings" placeholder="model-name" />
          </div>
            <div class="settings-group">
                <label class="setting-label">UserId</label>
                <input class="setting-input" v-model="settings.userid" @input="saveSettings" placeholder="Name" />
            </div>
          <div class="settings-group">
            <label class="setting-label">温度 ({{ settings.temperature }})</label>
            <input class="setting-range" type="range" min="0" max="2" step="0.1" v-model.number="settings.temperature" @input="saveSettings" />
          </div>
            <div class="settings-group">
                <label class="setting-label">响应延时 ({{ settings.resp_delay }}ms)</label>
                <input class="setting-range" type="range" min="3000" max="15000" step="1000" v-model.number="settings.resp_delay" @input="saveSettings" />
            </div>
          <div class="settings-group">
            <label class="setting-label">历史对话轮数上限</label>
            <input class="setting-input" type="number" min="10" max="100" v-model.number="settings.historyLim" @input="saveSettings" />
          </div>

        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import {ref, nextTick, watch} from "vue";
import type {UserMsg} from "../chater/data/context.ts";
import type {AIMsg} from "../chater/data/context.ts";
import {chat} from "../chater/llm/api.ts";
import recorder from "../chater/llm/history.ts";
import {buildUserMsg} from "../chater/data/context.ts";
import {buildAIMsg} from "../chater/data/context.ts";
import config from "../config.ts";
import {addMemory} from "../chater/llm/memory/api.ts";

const showSidebar = ref(false);
const sidebarTab = ref<"stats" | "settings">("stats");
let total_cost = ref<number>(0);

const settings = ref({
    baseURL: localStorage.getItem("cfg_baseURL") || "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com",
    model: localStorage.getItem("cfg_model") || "deepseek-v4-flash",
    temperature: Number(localStorage.getItem("cfg_temperature")) || 0.2,
    historyLim: Number(localStorage.getItem("cfg_historyLim")) || 100,
    resp_delay: Number(localStorage.getItem("cfg_delay")) || 7000,
    apikey: "",
    userid:localStorage.getItem("cfg_userId") || ""
});

function saveSettings() {
  localStorage.setItem("cfg_baseURL", settings.value.baseURL);
  localStorage.setItem("cfg_model", settings.value.model);
  localStorage.setItem("cfg_temperature", String(settings.value.temperature));
  localStorage.setItem("cfg_historyLim", String(settings.value.historyLim));
  localStorage.setItem("cfg_delay", String(settings.value.resp_delay));
  localStorage.setItem("cfg_userId", settings.value.userid);
  if (settings.value.apikey) {
    localStorage.setItem("cfg_apikey", settings.value.apikey);
  }
}
const cost_data = localStorage.getItem("cost_data");
total_cost.value = cost_data ? Number(cost_data) : 0;
interface Message {
    id:number;
    role: "user" | "ai";
    content: string;
    time:string;
    read:boolean;
  }
  const messageList = ref<Message[]>([]);
function save_msgL(){
    localStorage.setItem("msgL", JSON.stringify(messageList.value));
}
function load_msgL(){
    const msgL_data = localStorage.getItem("msgL");
    if (msgL_data) messageList.value = JSON.parse(msgL_data);
}
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
  let timer: number | null = null;
  async function sendMessage() {
    const text = inputText.value.trim();
    if(!text) return;
    const userMsg: Message = {
        id:idCounter++,
        role:"user",
        content:text,
        time:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read:false
    };
    messageList.value.push(userMsg);
    inputText.value = "";
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
    // console.log({
    //   role:"user",
    //   content:buildUserMsg(data)
    // });


      if(recorder.buffer.length>=20){
          //添加记忆片段
          await addMemory();
          recorder.buffer = [];
      }


    if(timer){
        clearTimeout(timer);
    }
    timer = setTimeout(getReply, config.delay);
  }
  async function getReply() {
      try {
          const res:AIMsg = await chat();
          if(res.tokens===0){
              throw new Error("api err");
          }
          recorder.add({role:"assistant", content:buildAIMsg(res)});//记录ai信息
          // console.log({role:"assistant", content:buildAIMsg(res)});
          total_cost.value += res.tokens;
          localStorage.setItem("cost_data",total_cost.value.toString());
          loading.value = true;

          //标记已读
          for(let i=messageList.value.length-1;i>=0;i--){
              if(messageList.value[i].role==="ai") continue;
              if(messageList.value[i].read) continue;
              messageList.value[i].read = true;
          }


          for(const msg of res.content){
              const perMsg:Message = {
                  role:"ai",
                  id:idCounter++,
                  content:msg.content,
                  time:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  read:true,
              }
              await new Promise(resolve => setTimeout(resolve, Math.min(5000, 100*perMsg.content.length)));
              messageList.value.push(perMsg);
          }
          save_msgL();
          recorder.save();
      }
      catch (err){
          console.error("请求失败", err);
          // messageList.value.push({
          //     id: idCounter++,
          //     role: 'ai',
          //     content: '网络请求出错',
          //     time:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          // });
      }
      finally {
          loading.value = false;
      }
  }
  recorder.load();
  load_msgL();
  while (messageList.value.length>=100) messageList.value.shift();
</script>

<style scoped>
/* ══════════════════════════════════════════════
   Shell – 最外层容器
   ══════════════════════════════════════════════ */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 900px;
  margin: 0 auto;
  padding: 0;
  background: var(--bg);
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

/* ══════════════════════════════════════════════
   Header – 第一层：顶部卡片
   ══════════════════════════════════════════════ */
.chat-header {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  padding: 16px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--accent-bg) 0%, transparent 80%);
  opacity: 0.4;
  pointer-events: none;
}

.header-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon-ring {
  position: relative;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon-ring::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: var(--accent);
  border-right-color: var(--accent);
  animation: icon-ring-spin 1.8s linear infinite;
  opacity: 0.6;
}

.header-icon-ring::after {
  content: '';
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 1px solid transparent;
  border-bottom-color: var(--accent);
  border-left-color: var(--accent);
  animation: icon-ring-spin 2.6s linear infinite reverse;
  opacity: 0.35;
}

@keyframes icon-ring-spin {
  to { transform: rotate(360deg); }
}

.header-icon {
  font-size: 16px;
  color: var(--accent);
  line-height: 1;
  position: relative;
  z-index: 1;
}

.chat-header h1 {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text-h);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
  opacity: 0.7;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ══════════════════════════════════════════════
   Chat Main – 第二层：消息区域（下沉平面）
   ══════════════════════════════════════════════ */
.chat-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  z-index: 5;
  scroll-behavior: smooth;
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.chat-main::-webkit-scrollbar {
  width: 6px;
}

.chat-main::-webkit-scrollbar-track {
  background: transparent;
}

.chat-main::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.chat-main::-webkit-scrollbar-thumb:hover {
  background: var(--text);
  opacity: 0.5;
}

.chat-main-inner {
  min-height: 100%;
  padding: 28px 28px 20px;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, var(--accent-bg) 0%, transparent 70%),
    var(--chat-bg);
  position: relative;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* ══════════════════════════════════════════════
   Message Bubbles – 第三层：浮动气泡
   ══════════════════════════════════════════════ */
.message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: msg-enter 0.3s ease-out;
}

@keyframes msg-enter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message--user {
  flex-direction: row-reverse;
}

/* Avatar */
.message-avatar-wrapper {
  flex-shrink: 0;
  position: relative;
}

.message-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.message--user .message-avatar {
  background: linear-gradient(135deg, #409eff 0%, #2d7fd3 100%);
}

.message--ai .message-avatar {
  background: linear-gradient(135deg, #f472b6 0%, #db2777 100%);
}

.message-avatar::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid transparent;
}

.message--user .message-avatar::after {
  border-color: rgba(64, 158, 255, 0.2);
}

.message--ai .message-avatar::after {
  border-color: rgba(244, 114, 182, 0.3);
}

/* Body (bubble + time) */
.message-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 70%;
}

.message--user .message-body {
  align-items: flex-end;
}

/* Bubble */
.message-bubble {
  padding: 11px 17px;
  border-radius: 18px;
  line-height: 1.6;
  font-size: 14.5px;
  word-break: break-word;
  position: relative;
  transition: box-shadow 0.2s;
}

.message-bubble:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
}

.message--user .message-bubble:hover {
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.3) !important;
}

.message--ai .message-bubble:hover {
  box-shadow: 0 4px 14px rgba(244, 114, 182, 0.15) !important;
}

.message--user .message-bubble {
  background: linear-gradient(135deg, #409eff 0%, #2d7fd3 100%);
  color: #fff;
  border-bottom-right-radius: 5px;
  box-shadow: 0 3px 10px rgba(64, 158, 255, 0.25);
}

.message--ai .message-bubble {
  background: rgb(204 41 127 / 0.32);
  color: var(--text-h);
  border: 1px solid rgba(244, 114, 182, 0.2);
  border-bottom-left-radius: 5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.message-content {
  white-space: pre-wrap;
}

/* Timestamp */
.message-time {
  font-size: 11px;
  color: var(--text);
  opacity: 0.45;
  padding: 0 4px;
  user-select: none;
}

/* ══════════════════════════════════════════════
   Empty State
   ══════════════════════════════════════════════ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 60px 20px 40px;
  text-align: center;
}

.empty-graphic {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--border);
  animation: ring-spin 8s linear infinite;
}

.empty-ring::before,
.empty-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
}

.empty-ring::before {
  inset: 4px;
  border-top-color: var(--accent);
  border-right-color: var(--accent);
  animation: ring-spin 4s linear infinite reverse;
}

.empty-ring::after {
  inset: 10px;
  border-bottom-color: var(--accent);
  border-left-color: var(--accent);
  animation: ring-spin 3s linear infinite;
}

@keyframes ring-spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 24px;
  color: var(--accent);
  position: relative;
  z-index: 1;
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
  margin-bottom: 24px;
}

.empty-suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.suggestion-chip {
  display: inline-block;
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-h);
  background: var(--bg);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.suggestion-chip:hover {
  border-color: var(--accent-border);
  background: var(--accent-bg);
  color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(170, 59, 255, 0.12);
}

/* ══════════════════════════════════════════════
   Footer / Input – 第四层：底部卡片
   ══════════════════════════════════════════════ */
.chat-footer {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  padding: 14px 28px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.03);
}

.footer-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, var(--accent-bg) 0%, transparent 60%);
  opacity: 0.3;
  pointer-events: none;
}

.input-area {
  position: relative;
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
  padding: 4px 20px;
  background: var(--chat-bg);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04) !important;
  border: 1px solid var(--border);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.chat-input :deep(.el-input__wrapper:hover) {
  border-color: var(--accent-border);
  background: var(--bg);
}

.chat-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent);
  background: var(--bg);
  box-shadow: 0 0 0 3px var(--accent-bg), inset 0 1px 3px rgba(0, 0, 0, 0.04) !important;
}

.chat-input :deep(.el-input__inner) {
  font-size: 14px;
  height: 42px;
}

.chat-input :deep(.el-input__clear) {
  color: var(--text);
  opacity: 0.4;
  transition: opacity 0.2s;
}

.chat-input :deep(.el-input__clear:hover) {
  opacity: 0.8;
}

.send-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  font-size: 20px;
  font-weight: 700;
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.06);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.35);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.footer-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--text);
  opacity: 0.4;
  text-align: center;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}

/* ══════════════════════════════════════════════
   Header Right & Menu Button
   ══════════════════════════════════════════════ */
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.menu-btn:hover:not(:disabled) {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent);
}

.menu-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════
   Sidebar – 侧边菜单
   ══════════════════════════════════════════════ */
.sidebar-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 340px;
  z-index: 2000;
  background: #fff;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: -6px 0 32px rgba(0, 0, 0, 0.15);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
}

.sidebar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.sidebar-close:hover {
  background: var(--accent-bg);
  color: var(--accent);
}

.sidebar-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* Cost Card */
.cost-card {
  background: linear-gradient(135deg, rgba(244, 114, 182, 0.1), rgba(168, 85, 247, 0.08));
  border: 1px solid rgba(244, 114, 182, 0.2);
  border-radius: 14px;
  padding: 22px 20px;
  text-align: center;
  transition: box-shadow 0.2s;
}

.cost-card:hover {
  box-shadow: 0 4px 16px rgba(244, 114, 182, 0.12);
}

.cost-label {
  font-size: 13px;
  color: var(--text);
  opacity: 0.7;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.cost-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-h);
  letter-spacing: -0.5px;
  line-height: 1.2;
  background: linear-gradient(135deg, #f472b6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cost-unit {
  font-size: 12px;
  color: var(--text);
  opacity: 0.5;
  margin-top: 6px;
}

/* ── Sidebar Tabs ── */
.sidebar-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 3px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #fff;
  color: #08060d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.tab-btn:hover:not(.active) {
  color: #374151;
}

.tab-content {
  animation: tab-fade 0.15s ease-out;
}

@keyframes tab-fade {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

/* ── Settings Form ── */
.settings-group {
  margin-bottom: 16px;
}

.setting-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 6px;
}

.setting-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e5e4e7;
  border-radius: 8px;
  font-size: 13px;
  color: #08060d;
  background: #fff;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.setting-input:focus {
  border-color: #aa3bff;
  box-shadow: 0 0 0 3px rgba(170, 59, 255, 0.1);
}

.setting-input::placeholder {
  color: #9ca3af;
}

.setting-input[type="password"] {
  letter-spacing: 2px;
}

.setting-input[type="number"] {
  -moz-appearance: textfield;
}

.setting-range {
  width: 100%;
  height: 6px;
  appearance: none;
  background: #e5e4e7;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.setting-range::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #aa3bff;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(170, 59, 255, 0.3);
  transition: transform 0.15s;
}

.setting-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.setting-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #aa3bff;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 4px rgba(170, 59, 255, 0.3);
}

/* ── Panel slide ── */
.sidebar-slide-enter-active {
  transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.sidebar-slide-leave-active {
  transition: right 0.2s ease-in;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  right: -340px;
}

/* ══════════════════════════════════════════════
   Responsive
   ══════════════════════════════════════════════ */
@media (max-width: 768px) {
  .app-shell {
    height: 100dvh;
    box-shadow: none;
    max-width: 100%;
  }

  .chat-header {
    padding: 12px 16px;
  }

  .chat-header h1 {
    font-size: 17px;
  }

  .header-status {
    font-size: 11px;
  }

  .chat-main-inner {
    padding: 20px 14px 16px;
  }

  .messages-container {
    gap: 16px;
  }

  .message-body {
    max-width: 82%;
  }

  .message-bubble {
    font-size: 14px;
    padding: 9px 14px;
  }

  .message-time {
    font-size: 10px;
  }

  .empty-state {
    padding: 40px 16px 30px;
  }

  .empty-suggestions {
    display: none;
  }

  .chat-footer {
    padding: 10px 14px 14px;
  }

  .footer-hint {
    display: none;
  }
}

@media (max-width: 480px) {
  .message-body {
    max-width: 88%;
  }

  .message-avatar {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }
}
</style>