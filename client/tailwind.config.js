/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 【可配置】全局配色 — 修改此处统一调整网站颜色
      colors: {
        apple: {
          black: '#1d1d1f',     // 主文字色
          gray: '#86868b',      // 次要文字色
          light: '#f5f5f7',     // 浅灰背景
          border: '#e5e5e7',    // 边框色
          white: '#ffffff',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont',
          '"PingFang SC"', '"Microsoft YaHei"',
          '"Helvetica Neue"', 'Arial', 'sans-serif'
        ]
      },
      borderRadius: {
        'apple': '12px',       // 按钮圆角
        'apple-lg': '16px',    // 卡片圆角
        'apple-full': '9999px' // 圆形按钮
      },
      // 毛玻璃效果
      backdropBlur: {
        'glass': '20px'
      }
    }
  },
  plugins: []
};
