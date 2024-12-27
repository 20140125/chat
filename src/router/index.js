import Vue from "vue";
import Router from "vue-router";
import ChatMessage from "@/components/Chat-Message.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/chat",
      name: "ChatMessage",
      component: ChatMessage,
    },
    // ...existing routes...
  ],
});
