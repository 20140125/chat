<template>
  <div class="chat-container" @dragover.prevent @drop="handleDrop">
    <div class="header">
      在线聊天
      <span v-if="otherUserTyping">{{ typingMessage }}</span>
    </div>
    <div class="content">
      <div class="messages-container">
        <div class="messages">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['message', message.type]"
            ref="message"
          >
            <i
              v-if="message.type === 'received'"
              class="el-icon-user user-icon-left"
            ></i>
            <div>
              <div
                class="message-content"
                :class="{
                  'message-file':
                    message.file &&
                    (message.file.type.startsWith('image/') ||
                      message.file.type.startsWith('video/')),
                }"
              >
                <div v-if="message.file" class="message-file">
                  <div
                    v-if="
                      message.file.type.startsWith('image/') ||
                      message.file.type.startsWith('video/')
                    "
                  >
                    <el-image
                      v-if="message.file.type.startsWith('image/')"
                      :src="message.file.url"
                      :preview-src-list="[message.file.url]"
                      fit="cover"
                      style="width: 100px; height: 100px"
                    ></el-image>
                    <video
                      v-if="message.file.type.startsWith('video/')"
                      :src="message.file.url"
                      controls
                      autoplay
                      style="width: auto; height: 400px"
                    ></video>
                  </div>
                  <a
                    v-else
                    :href="message.file.url"
                    target="_blank"
                    class="file-link"
                  >
                    {{ message.file.name }}
                  </a>
                </div>
                <div v-else class="message-text">{{ message.text }}</div>
              </div>
              <div :class="['message-time', message.type]">
                {{ formatTime(message.timestamp) }}
              </div>
            </div>
            <i
              v-if="message.type === 'sent'"
              class="el-icon-user user-icon-right"
            ></i>
          </div>
        </div>
        <div class="input-container">
          <el-input
            type="textarea"
            v-model="newMessage"
            placeholder="Type a message"
            class="input-box"
            :autosize="{ minRows: 3, maxRows: 3 }"
            @input="handleTyping"
            @keyup.enter.native="sendMessage"
            @keydown.enter.native.prevent="sendMessage"
            resize="none"
          ></el-input>
          <el-button
            type="success"
            @click="sendMessage"
            :disabled="!newMessage.trim()"
            >Send</el-button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CryptoJS from "crypto-js";
import { mapState, mapMutations } from "vuex";

export default {
  computed: {
    ...mapState(["messages"]),
  },
  data() {
    return {
      newMessage: "",
      ws: null,
      userId: null,
      isTyping: false,
      otherUserTyping: false,
      typingMessage: "",
      typingInterval: null,
    };
  },
  methods: {
    ...mapMutations({
      addMessage: "addMessage",
    }),
    sendMessage() {
      if (this.newMessage.trim() !== "") {
        const message = {
          text: this.newMessage,
          type: "sent",
          userId: this.userId,
          timestamp: Date.now(),
        };
        this.addMessage(message);
        this.ws.send(JSON.stringify(message));
        this.newMessage = "";
        this.isTyping = false;
        this.ws.send(
          JSON.stringify({
            type: "typing",
            userId: this.userId,
            isTyping: false,
          })
        );

        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    handleTyping() {
      if (!this.isTyping) {
        this.isTyping = true;
        this.ws.send(
          JSON.stringify({
            type: "typing",
            userId: this.userId,
            isTyping: true,
          })
        );
        this.startTypingAnimation();
      }
      clearTimeout(this.typingTimeout);
      // 告诉服务器输入完成，1 秒后停止
      this.typingTimeout = setTimeout(() => {
        this.isTyping = false;
        this.ws.send(
          JSON.stringify({
            type: "typing",
            userId: this.userId,
            isTyping: false,
          })
        );
      }, 1000);
    },
    startTypingAnimation() {
      let dots = 0;
      this.typingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        this.typingMessage = `有人正在输入${".".repeat(dots)}`;
      }, 300);
    },
    setupWebSocket() {
      this.ws = new WebSocket("ws://localhost:3000");
      this.ws.onopen = () => {
        console.log("WebSocket connected");
        if (!this.userId) {
          this.userId = CryptoJS.MD5(Math.random().toString()).toString();
        }
      };
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);
        if (message.type === "typing" && message.userId !== this.userId) {
          this.otherUserTyping = message.isTyping;
          if (this.otherUserTyping) {
            this.startTypingAnimation();
          } else {
            clearInterval(this.typingInterval);
          }
        } else if (
          message.type !== "typing" &&
          message.userId !== this.userId
        ) {
          this.addMessage({
            text: message.text,
            type: "received",
            timestamp: message.timestamp,
            file: message.file,
          });
        }

        this.$nextTick(() => {
          this.scrollToBottom();
        });
      };
    },
    scrollToBottom() {
      const lastMessage = this.$refs.message?.length
        ? this.$refs.message[this.$refs.message.length - 1]
        : null;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth" });
      }
    },
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    },
    handleDrop(event) {
      event.preventDefault();
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        this.uploadFile(file);
      }
    },
    uploadFile(file) {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const message = {
            file: {
              name: file.name,
              url: response.url,
              type: file.type,
            },
            type: "sent",
            userId: this.userId,
            timestamp: Date.now(),
          };
          this.addMessage(message);
          this.ws.send(JSON.stringify(message));
        }
      };

      xhr.send(formData);
    },
  },
  mounted() {
    this.setupWebSocket();

    this.$nextTick(() => {
      this.scrollToBottom();
    });
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  border: 1px solid #ccc;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.9);
  position: relative;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.6);
}

.header {
  font-size: 22px;
  text-align: center;
  padding: 10px;
  border-bottom: 1px solid #ccc;
  background-color: #f9f9f9;
}

.header span {
  font-size: 14px;
  font-style: italic;
}

.content {
  display: flex;
  flex: 1;
  overflow: scroll;
  scrollbar-width: none;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  padding-bottom: 10px;
  background-color: #f9f9f9;
}

.message {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.message-content {
  padding: 10px 15px;
  border-radius: 20px;
  word-wrap: break-word;
  position: relative;
  flex: 1;
}

.message-content::before {
  content: "";
  position: absolute;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: inherit;
}

.message-text {
  margin-bottom: 5px;
}

.message-file {
  display: flex;
  align-items: center;
  background: none !important;
}

.message-time {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  margin-top: 5px;
  text-align: end;
}

.user-icon-left {
  margin-right: 10px;
}

.user-icon-right {
  margin-left: 10px;
}

.message.sent {
  align-self: flex-end;
  justify-content: flex-end;
  margin-left: auto;
  margin-right: 10px;
  width: fit-content;
}

.message.sent .message-content {
  background: linear-gradient(135deg, #67c23a 0%, #a4e56d 100%);
}

.message.sent .message-content::before {
  right: -5px;
}

.message.received {
  align-self: flex-start;
  justify-content: flex-start;
  margin-left: 10px;
  width: fit-content;
}

.message.received .message-content {
  background: linear-gradient(135deg, #e0e4e1 0%, #f1f1f1 100%);
}

.message.received .message-content::before {
  left: -5px;
}

.input-container {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #ccc;
  width: 100%;
  box-sizing: border-box;
  height: 120px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

.input-box {
  flex: 1;
  margin-right: 10px;
}

.file-link {
  text-decoration: none;
  color: rgb(3, 84, 14);
}

.file-link:visited {
  color: rgb(3, 84, 14);
}
</style>
