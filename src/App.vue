<template>
  <div id="app">
    <ChatMessage />
  </div>
</template>

<script>
import ChatMessage from "./components/Chat-Message.vue";

export default {
  name: "App",
  components: {
    ChatMessage,
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 对所有滚动条生效 */
::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 */
}

html,
body {
  background-color: #333;
  -ms-overflow-style: none; /* 适用于 IE 和 Edge */
  scrollbar-width: none; /* 适用于 Firefox */
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
