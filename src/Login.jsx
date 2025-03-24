import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

function Login() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // 处理表单提交
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // 简单的表单验证
        if (!username.trim() || !password.trim()) {
            setError("用户名和密码不能为空");
            return;
        }

        // 注册时验证邮箱
        if (isRegistering) {
            if (!email.trim()) {
                setError("邮箱不能为空");
                return;
            }

            // 简单的邮箱格式验证
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError("请输入有效的邮箱地址");
                return;
            }
        }

        // 这里应该有真实的登录/注册逻辑
        if (isRegistering) {
            // 真实的注册逻辑
            setIsLoading(true);
            try {
                const response = await fetch("/api/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "注册失败，请稍后重试");
                }

                // 注册成功
                console.log("注册成功:", data);
                // 切换到登录模式
                setIsRegistering(false);
                setError("");
                // 清空密码和邮箱
                setPassword("");
                setEmail("");
            } catch (error) {
                console.error("注册错误:", error);
                setError(error.message || "注册失败，请稍后重试");
            } finally {
                setIsLoading(false);
            }
        } else {
            // 真实的登录逻辑
            setIsLoading(true);
            try {
                const response = await fetch("/api/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "登录失败，请检查用户名和密码"
                    );
                }

                // 登录成功
                console.log("登录成功:", data);
                // 存储token到localStorage
                if (data.token) {
                    localStorage.setItem("auth_token", data.token);
                    console.log("Token已保存到localStorage");
                }
                // 跳转到聊天页面
                navigate("/chat");
            } catch (error) {
                console.error("登录错误:", error);
                setError(error.message || "登录失败，请稍后重试");
            } finally {
                setIsLoading(false);
            }
        }
    };

    // 获取主题上下文
    const { isDarkMode, toggleTheme } = useTheme();
    
    return (
        <div className={`flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-chat-bg' : 'bg-light-chat-bg'}`}>
            <div className={`w-full max-w-md p-8 space-y-8 ${isDarkMode ? 'bg-message-bg' : 'bg-light-message-bg'} rounded-lg shadow-md`}>
                {/* 主题切换按钮 */}
                <div className="absolute top-4 right-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                        title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
                    >
                        {isDarkMode ? (
                            <SunIcon className="h-5 w-5 text-yellow-300" />
                        ) : (
                            <MoonIcon className="h-5 w-5 text-gray-700" />
                        )}
                    </button>
                </div>
                <div className="text-center">
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {isRegistering ? "注册账号" : "登录"}
                    </h1>
                    <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {isRegistering
                            ? "创建您的账号以开始使用"
                            : "登录您的账号以继续"}
                    </p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-100/10 rounded-md">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="username"
                                className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                            >
                                用户名
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="请输入用户名"
                            />
                        </div>

                        {/* 邮箱输入框，仅在注册模式下显示 */}
                        {isRegistering && (
                            <div>
                                <label
                                    htmlFor="email"
                                    className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                                >
                                    邮箱
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`mt-1 block w-full px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="请输入邮箱"
                                />
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="password"
                                className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                            >
                                密码
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`mt-1 block w-full px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                placeholder="请输入密码"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError(""); // 清除错误信息
                            }}
                            className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                        >
                            {isRegistering
                                ? "已有账号？登录"
                                : "没有账号？注册"}
                        </button>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                        >
                            {isLoading
                                ? "处理中..."
                                : isRegistering
                                ? "注册"
                                : "登录"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
