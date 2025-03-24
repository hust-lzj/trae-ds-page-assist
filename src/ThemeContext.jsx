import { createContext, useState, useEffect, useContext } from 'react';

// 创建主题上下文
const ThemeContext = createContext();

// 主题提供者组件
export function ThemeProvider({ children }) {
  // 从localStorage获取保存的主题，如果没有则默认为暗色模式
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; // 默认为暗色模式
  });

  // 切换主题的函数
  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  // 当主题变化时，更新localStorage和文档类
  useEffect(() => {
    // 保存主题到localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // 更新文档类以应用Tailwind的暗色模式
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 提供主题上下文值
  const value = {
    isDarkMode,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 自定义钩子，方便组件使用主题上下文
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}