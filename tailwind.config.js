/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 启用class策略的暗色模式
  theme: {
    extend: {
      colors: {
        // 暗色模式颜色
        'chat-bg': '#1e1e1e',
        'message-bg': '#2d2d2d',
        'input-bg': '#2d2d2d',
        // 亮色模式颜色
        'light-chat-bg': '#f5f5f5',
        'light-message-bg': '#ffffff',
        'light-input-bg': '#f0f0f0',
      },
    },
  },
  plugins: [],
}