import { useState, useRef, useEffect } from "react";
import {
    FaceSmileIcon,
    PhotoIcon,
    PaperAirplaneIcon,
    ChevronDownIcon,
    PlusCircleIcon,
    ClockIcon,
    TrashIcon,
    Bars3Icon,
    SunIcon,
    MoonIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "./ThemeContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
    oneDark,
    oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

// API请求地址，通过Vite代理转发到本地Ollama服务
const DEEPSEEK_API_URL = "/api/stream-chat";
const MODELS_API_URL = "/api/models";
const HISTORIES_API_URL = "/api/chat-histories";

function App() {
    // 状态管理
    const [messages, setMessages] = useState([]); // 存储聊天消息记录
    const [messageHistory, setMessageHistory] = useState([]); // 存储API消息历史，格式为[{role:"xxx",content:"xxx"}]
    const [inputValue, setInputValue] = useState(""); // 输入框的值
    const [isLoading, setIsLoading] = useState(false); // 加载状态标识
    const [models, setModels] = useState([]); // 存储可用的模型列表
    const [selectedModel, setSelectedModel] = useState("deepseek-r1:7b"); // 当前选择的模型
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false); // 模型下拉框状态
    const [historyId, setHistoryId] = useState(""); // 存储当前聊天记录的ID
    const [chatHistories, setChatHistories] = useState([]); // 存储聊天历史记录列表
    const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true); // 控制历史记录侧边栏的显示状态
    const [abortController, setAbortController] = useState(null); // 用于终止API请求的控制器
    const messagesEndRef = useRef(null); // 用于自动滚动到最新消息

    // 滚动到消息列表底部的函数
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 当消息列表更新时，自动滚动到底部
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 组件挂载时获取可用的模型列表
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch(MODELS_API_URL);
                if (!response.ok) {
                    throw new Error("获取模型列表失败");
                }
                const data = await response.json();
                if (data.models && Array.isArray(data.models)) {
                    setModels(data.models);
                    // 如果有模型列表且当前选择的模型不在列表中，则选择第一个模型
                    if (
                        data.models.length > 0 &&
                        !data.models.includes(selectedModel)
                    ) {
                        setSelectedModel(data.models[0]);
                    }
                }
            } catch (error) {
                console.error("获取模型列表错误:", error);
            }
        };

        fetchModels();
    }, []);

    // 组件挂载时获取聊天历史记录列表
    useEffect(() => {
        const fetchChatHistories = async () => {
            try {
                const response = await fetch(HISTORIES_API_URL, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "auth_token"
                        )}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("获取聊天历史记录失败");
                }
                const data = await response.json();
                if (data.histories && Array.isArray(data.histories)) {
                    setChatHistories(data.histories);
                }
            } catch (error) {
                console.error("获取聊天历史记录错误:", error);
            }
        };

        fetchChatHistories();
    }, []);

    // 处理输入框内容变化
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    // 终止生成回复的函数
    const handleStopGeneration = () => {
        if (abortController) {
            abortController.abort(); // 终止请求
            setAbortController(null); // 重置控制器
        }
    };

    // 发送消息并处理API响应
    const handleSendMessage = async () => {
        // 如果输入为空或正在加载中，则不执行任何操作
        if (!inputValue.trim() || isLoading) return;

        // 格式化时间的函数
        const formatTime = () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, "0");
            const minutes = now.getMinutes().toString().padStart(2, "0");
            return `${hours}:${minutes}`;
        };

        // 获取两个时间戳的差值
        const getTimeDiff = (timestamp1, timestamp2) => {
            return Math.floor(
                (new Date(timestamp1).getTime() -
                    new Date(timestamp2).getTime()) /
                    1000
            );
        };

        // 创建用户消息对象
        const userMessage = {
            id: messages.length + 1,
            sender: "User",
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=2", // 使用Dicebear API生成头像
            content: inputValue,
            thinkingContent: "",
            thinkingTime: "",
            timestamp: formatTime(),
        };

        // 创建API消息对象并添加到历史记录
        const apiUserMessage = {
            role: "user",
            content: inputValue,
        };

        // 更新消息历史
        setMessageHistory((prev) => [...prev, apiUserMessage]);

        // 添加用户消息到消息列表
        setMessages((prev) => [...prev, userMessage]);
        setInputValue(""); // 清空输入框
        setIsLoading(true); // 设置加载状态

        try {
            // 准备完整的消息历史记录
            const fullMessageHistory = [...messageHistory, apiUserMessage];

            // 创建新的AbortController实例
            const controller = new AbortController();
            setAbortController(controller);

            // 发送API请求到DeepSeek模型
            const response = await fetch(DEEPSEEK_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem(
                        "auth_token"
                    )}`, // 添加认证token
                    Accept: "text/event-stream",
                },
                body: JSON.stringify({
                    messages: fullMessageHistory,
                    model: selectedModel, // 使用用户选择的模型
                    options: {},
                    history_id: historyId, // 添加聊天记录ID
                }),
                signal: controller.signal, // 添加信号以支持中断请求
            });

            if (!response.ok) {
                throw new Error("API请求失败");
            }

            // 设置流式读取响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            // 创建助手消息对象
            const assistantMessage = {
                id: messages.length + 2,
                sender: "Assistant",
                avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=1",
                content: "",
                thinkingContent: "",
                thinkingTime: "",
                timestamp: formatTime(),
                isThinkingExpanded: true, // 默认展开思考内容
            };

            // 添加初始的空助手消息到消息列表
            setMessages((prev) => [...prev, assistantMessage]);
            let isThinking = false;
            let thinkingStart = 0;
            let thinkingEnd = 0;
            let thinkingTime = 0;
            let assistantContent = "";

            // 循环读取流式响应
            while (true) {
                const { done, value } = await reader.read();
                if (done) break; // 如果读取完成，退出循环

                // 解码二进制数据为文本
                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;

                // 按行分割响应内容，处理可能的不完整行
                const lines = accumulatedContent.split("\n");
                accumulatedContent = lines.pop() || "";
                // 处理每一行数据
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            // 解析JSON响应
                            const data = JSON.parse(line);

                            // 如果响应中包含history_id，则更新状态
                            if (
                                data.history_id &&
                                data.history_id !== historyId
                            ) {
                                setHistoryId(data.history_id);
                            }

                            if (data.message?.content) {
                                const content = data.message.content;
                                // 检测思考标签的开始和结束
                                if (content === "<think>") {
                                    isThinking = true;
                                    thinkingStart = data.created_at;
                                } else if (content === "</think>") {
                                    isThinking = false;
                                    thinkingEnd = data.created_at;
                                }
                                if (isThinking) {
                                    thinkingTime = getTimeDiff(
                                        data.created_at,
                                        thinkingStart
                                    );
                                }
                                // 更新助手消息内容
                                setMessages((prev) => {
                                    const lastMessage = prev[prev.length - 1];
                                    if (
                                        lastMessage.id === assistantMessage.id
                                    ) {
                                        // 移除<think>和</think>标签
                                        let newContent = content.replace(
                                            /<\/?think>/g,
                                            ""
                                        );
                                        // 返回更新后的消息列表
                                        if (!isThinking) {
                                            assistantContent += newContent;
                                            return [
                                                ...prev.slice(0, -1),
                                                {
                                                    ...lastMessage,
                                                    content:
                                                        lastMessage.content +
                                                        newContent,
                                                    thinkingTime: getTimeDiff(
                                                        thinkingEnd,
                                                        thinkingStart
                                                    ),
                                                },
                                            ];
                                        } else {
                                            return [
                                                ...prev.slice(0, -1),
                                                {
                                                    ...lastMessage,
                                                    thinkingContent:
                                                        lastMessage.thinkingContent +
                                                        newContent,
                                                    thinkingTime: thinkingTime,
                                                },
                                            ];
                                        }
                                    }
                                    return prev;
                                });
                            }
                        } catch (e) {
                            console.error("解析JSON失败:", e);
                        }
                    }
                }
            }

            // 响应完成后，将助手回复添加到消息历史
            if (assistantContent) {
                const apiAssistantMessage = {
                    role: "assistant",
                    content: assistantContent,
                };
                setMessageHistory((prev) => [...prev, apiAssistantMessage]);
            }
        } catch (error) {
            // 处理错误情况
            console.error("Error:", error);
            // 如果不是用户主动中断请求，则显示错误消息
            if (error.name !== "AbortError") {
                // 创建错误消息
                const errorMessage = {
                    id: messages.length + 2,
                    sender: "System",
                    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=3",
                    content: "抱歉，发生了一些错误，请稍后重试。",
                    thinkingContent: "",
                    type: "error",
                    timestamp: formatTime(),
                    isThinkingExpanded: true, // 默认展开思考内容
                };
                setMessages((prev) => [...prev, errorMessage]);
            } else {
                // 用户主动中断请求，添加中断提示
                setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.sender === "Assistant") {
                        return [
                            ...prev.slice(0, -1),
                            {
                                ...lastMessage,
                                content:
                                    lastMessage.content +
                                    "\n\n[生成已被用户终止]",
                            },
                        ];
                    }
                    return prev;
                });
            }
        } finally {
            // 无论成功或失败，都重置加载状态和中断控制器
            setIsLoading(false);
            setAbortController(null);
        }
    };

    // 处理键盘事件，按Enter发送消息
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 切换思考内容的展开/折叠状态
    const toggleThinkingExpanded = (messageId) => {
        setMessages((prev) =>
            prev.map((message) =>
                message.id === messageId
                    ? {
                          ...message,
                          isThinkingExpanded: !message.isThinkingExpanded,
                      }
                    : message
            )
        );
    };

    // 处理新建对话
    const handleNewChat = () => {
        // 清空当前对话
        setMessages([]);
        setMessageHistory([]);
        setHistoryId("");

        // 重新获取聊天历史记录列表
        const fetchChatHistories = async () => {
            try {
                const response = await fetch(HISTORIES_API_URL, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "auth_token"
                        )}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("获取聊天历史记录失败");
                }
                const data = await response.json();
                if (data.histories && Array.isArray(data.histories)) {
                    setChatHistories(data.histories);
                }
            } catch (error) {
                console.error("获取聊天历史记录错误:", error);
            }
        };

        // 调用函数获取最新的历史记录
        fetchChatHistories();
    };

    // 处理选择历史记录
    const handleSelectHistory = async (history) => {
        // 设置当前模型和历史ID
        setSelectedModel(history.model);
        setHistoryId(history.history_id);
        // 清空当前消息，等待API返回历史消息
        setMessages([]);
        setMessageHistory([]);

        try {
            // 获取历史记录详情
            const response = await fetch(
                `/api/chat-history/${history.history_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "auth_token"
                        )}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("获取聊天历史记录详情失败");
            }

            const data = await response.json();

            if (data.messages && Array.isArray(data.messages)) {
                // 格式化时间的函数
                const formatTime = () => {
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, "0");
                    const minutes = now
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                    return `${hours}:${minutes}`;
                };

                // 处理消息数组
                const formattedMessages = [];
                const apiMessages = [];

                data.messages.forEach((msg, index) => {
                    apiMessages.push(msg);

                    if (msg.role === "user") {
                        // 用户消息
                        formattedMessages.push({
                            id: index + 1,
                            sender: "User",
                            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=2",
                            content: msg.content,
                            thinkingContent: "",
                            thinkingTime: "",
                            timestamp: formatTime(),
                            isThinkingExpanded: true,
                        });
                    } else if (msg.role === "assistant") {
                        // 助手消息，处理<think>标签
                        const thinkMatch = msg.content.match(
                            /<think>([\s\S]*?)<\/think>/
                        );
                        let assistantContent = msg.content;
                        let thinkingContent = "";

                        if (thinkMatch) {
                            // 提取思考内容
                            thinkingContent = thinkMatch[1].trim();
                            // 移除<think>标签及其内容
                            assistantContent = msg.content
                                .replace(/<think>[\s\S]*?<\/think>/g, "")
                                .trim();
                        }

                        formattedMessages.push({
                            id: index + 1,
                            sender: "Assistant",
                            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=1",
                            content: assistantContent,
                            thinkingContent: thinkingContent,
                            thinkingTime: "思考过程",
                            timestamp: formatTime(),
                            isThinkingExpanded: true,
                        });
                    }
                });

                // 更新消息列表和API消息历史
                setMessages(formattedMessages);
                setMessageHistory(apiMessages);
            }
        } catch (error) {
            console.error("获取聊天历史记录详情错误:", error);
            // 显示错误消息
            const errorMessage = {
                id: 1,
                sender: "System",
                avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=3",
                content: "获取聊天历史记录详情失败，请稍后重试。",
                thinkingContent: "",
                type: "error",
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                isThinkingExpanded: true,
            };
            setMessages([errorMessage]);
        }
    };

    // 格式化日期显示
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    };

    // 处理删除历史记录
    const handleDeleteHistory = async (e, id) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发选择历史记录

        if (confirm("确定要删除这条历史记录吗？")) {
            try {
                const response = await fetch(`/api/chat-history/${id}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "auth_token"
                        )}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("删除历史记录失败");
                }

                // 从列表中移除已删除的历史记录
                setChatHistories((prev) =>
                    prev.filter((history) => history.id !== id)
                );

                // 如果删除的是当前选中的历史记录，则清空当前对话
                if (id === historyId) {
                    handleNewChat();
                }
            } catch (error) {
                console.error("删除历史记录错误:", error);
                alert("删除历史记录失败，请稍后重试");
            }
        }
    };

    // 获取主题上下文
    const { isDarkMode, toggleTheme } = useTheme();

    // 渲染UI组件
    return (
        <div
            className={`flex h-screen overflow-hidden ${
                isDarkMode ? "bg-chat-bg" : "bg-light-chat-bg"
            }`}
        >
            {/* 历史记录侧边栏 */}
            <div
                className={`w-64 ${
                    isDarkMode ? "bg-gray-900" : "bg-gray-100"
                } border-r ${
                    isDarkMode ? "border-gray-700" : "border-gray-300"
                } flex flex-col transition-all duration-300 ease-in-out ${
                    isHistorySidebarOpen ? "translate-x-0" : "-translate-x-full"
                } ${isHistorySidebarOpen ? "relative" : "absolute"}`}
            >
                <div
                    className={`p-4 border-b ${
                        isDarkMode ? "border-gray-700" : "border-gray-300"
                    }`}
                >
                    <h2
                        className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                    >
                        历史记录
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2">
                        <button
                            onClick={handleNewChat}
                            className={`flex items-center space-x-2 w-full p-2 rounded-md ${
                                isDarkMode
                                    ? "hover:bg-gray-800 text-white"
                                    : "hover:bg-gray-200 text-gray-800"
                            }`}
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>新建对话</span>
                        </button>
                    </div>
                    <div className="px-2 space-y-1">
                        {chatHistories.map((history) => (
                            <button
                                key={history.history_id}
                                onClick={() => handleSelectHistory(history)}
                                className={`flex items-start w-full p-2 rounded-md text-left ${
                                    historyId === history.history_id
                                        ? "bg-blue-600"
                                        : isDarkMode
                                        ? "hover:bg-gray-800"
                                        : "hover:bg-gray-200"
                                }`}
                            >
                                <ClockIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 overflow-hidden">
                                    <div
                                        className={`text-sm truncate font-medium ${
                                            isDarkMode
                                                ? "text-white"
                                                : "text-gray-800"
                                        }`}
                                    >
                                        {history.title}
                                    </div>
                                    <div
                                        className={`text-xs ${
                                            isDarkMode
                                                ? "text-gray-400"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        {formatDate(history.created_at)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) =>
                                        handleDeleteHistory(e, history.id)
                                    }
                                    className={`p-1 hover:text-red-500 transition-colors ${
                                        isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                    }`}
                                    title="删除历史记录"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 主聊天区域 */}
            <div className="flex flex-col flex-1 transition-all duration-300">
                {/* 顶部导航栏 */}
                <header
                    className={`flex items-center justify-between px-4 py-2 ${
                        isDarkMode
                            ? "bg-message-bg border-gray-700"
                            : "bg-light-message-bg border-gray-200"
                    } border-b`}
                >
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() =>
                                setIsHistorySidebarOpen(!isHistorySidebarOpen)
                            }
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-700"
                            title={
                                isHistorySidebarOpen
                                    ? "隐藏历史记录"
                                    : "显示历史记录"
                            }
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <h1
                            className={`font-medium ${
                                isDarkMode ? "text-white" : "text-gray-800"
                            }`}
                        >
                            AI聊天助手
                        </h1>
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full ${
                                isDarkMode
                                    ? "hover:bg-gray-700"
                                    : "hover:bg-gray-200"
                            } transition-colors ml-2`}
                            title={
                                isDarkMode ? "切换到亮色模式" : "切换到暗色模式"
                            }
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5" />
                            ) : (
                                <MoonIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() =>
                                setIsModelDropdownOpen(!isModelDropdownOpen)
                            }
                            className={`flex items-center space-x-1 ${
                                isDarkMode
                                    ? "text-white bg-gray-700 hover:bg-gray-600"
                                    : "text-gray-800 bg-gray-200 hover:bg-gray-300"
                            } px-3 py-1 rounded-md`}
                        >
                            <span>{selectedModel}</span>
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>
                        {isModelDropdownOpen && (
                            <div
                                className={`absolute right-0 mt-1 w-48 ${
                                    isDarkMode
                                        ? "bg-gray-800 border-gray-700"
                                        : "bg-white border-gray-200"
                                } border rounded-md shadow-lg z-10`}
                            >
                                <ul className="py-1">
                                    {models.map((model) => (
                                        <li key={model}>
                                            <button
                                                onClick={() => {
                                                    setSelectedModel(model);
                                                    setIsModelDropdownOpen(
                                                        false
                                                    );
                                                }}
                                                className={`block w-full text-left px-4 py-2 text-sm ${
                                                    selectedModel === model
                                                        ? "bg-blue-600 text-white"
                                                        : isDarkMode
                                                        ? "text-gray-300 hover:bg-gray-700"
                                                        : "text-gray-700 hover:bg-gray-100"
                                                }`}
                                            >
                                                {model}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </header>

                {/* 消息列表区域 */}
                <div
                    className={`flex-1 overflow-y-auto p-4 space-y-4 ${
                        isDarkMode ? "bg-chat-bg" : "bg-light-chat-bg"
                    }`}
                >
                    <div className="mx-auto">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className="flex items-start space-x-3"
                            >
                                <img
                                    src={message.avatar}
                                    alt={message.sender}
                                    className="w-8 h-8 rounded-full"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span
                                            className={`${
                                                isDarkMode
                                                    ? "text-gray-300"
                                                    : "text-gray-700"
                                            } text-sm`}
                                        >
                                            {message.sender}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            {message.timestamp}
                                        </span>
                                    </div>
                                    <div
                                        className={`${
                                            isDarkMode
                                                ? "bg-message-bg"
                                                : "bg-light-message-bg"
                                        } rounded-lg p-3 ${
                                            isDarkMode
                                                ? "text-white"
                                                : "text-gray-800"
                                        }`}
                                    >
                                        {/* 消息内容区域 */}
                                        <div className="space-y-3">
                                            {/* 思考内容部分 */}
                                            {message.thinkingContent !== "" && (
                                                <div className="bg-blue-900/30 border border-blue-700/50 rounded p-2">
                                                    <div
                                                        className={`flex items-center justify-between text-xs ${
                                                            isDarkMode
                                                                ? "text-blue-400"
                                                                : "text-blue-600"
                                                        } mb-1 cursor-pointer select-none`}
                                                        onClick={() =>
                                                            toggleThinkingExpanded(
                                                                message.id
                                                            )
                                                        }
                                                    >
                                                        <span>
                                                            {message.thinkingTime ===
                                                            "思考过程"
                                                                ? "思考过程"
                                                                : `思考用了 ${
                                                                      message.thinkingTime !==
                                                                      ""
                                                                          ? message.thinkingTime
                                                                          : "0"
                                                                  } s`}
                                                        </span>
                                                        <span>
                                                            {message.isThinkingExpanded
                                                                ? "收起"
                                                                : "展开"}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`overflow-hidden transition-all duration-300 ${
                                                            isDarkMode
                                                                ? "text-gray-300"
                                                                : "text-gray-700"
                                                        } ${
                                                            message.isThinkingExpanded
                                                                ? "max-h-96"
                                                                : "max-h-0"
                                                        }`}
                                                    >
                                                        <ReactMarkdown
                                                            remarkPlugins={[
                                                                remarkGfm,
                                                            ]}
                                                            components={{
                                                                code({
                                                                    inline,
                                                                    className,
                                                                    children,
                                                                    ...props
                                                                }) {
                                                                    const match =
                                                                        /language-(\w+)/.exec(
                                                                            className ||
                                                                                ""
                                                                        );
                                                                    return !inline &&
                                                                        match ? (
                                                                        <SyntaxHighlighter
                                                                            style={
                                                                                isDarkMode
                                                                                    ? oneDark
                                                                                    : oneLight
                                                                            }
                                                                            language={
                                                                                match[1]
                                                                            }
                                                                            PreTag="div"
                                                                            {...props}
                                                                        >
                                                                            {String(
                                                                                children
                                                                            ).replace(
                                                                                /\n$/,
                                                                                ""
                                                                            )}
                                                                        </SyntaxHighlighter>
                                                                    ) : (
                                                                        <code
                                                                            className={
                                                                                className
                                                                            }
                                                                            {...props}
                                                                        >
                                                                            {
                                                                                children
                                                                            }
                                                                        </code>
                                                                    );
                                                                },
                                                            }}
                                                        >
                                                            {
                                                                message.thinkingContent
                                                            }
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                            {/* 回答内容部分 */}
                                            {message.content !== "" && (
                                                <div
                                                    className={`prose ${
                                                        isDarkMode
                                                            ? "prose-invert"
                                                            : ""
                                                    } max-w-none`}
                                                >
                                                    <ReactMarkdown
                                                        remarkPlugins={[
                                                            remarkGfm,
                                                        ]}
                                                        components={{
                                                            code({
                                                                inline,
                                                                className,
                                                                children,
                                                                ...props
                                                            }) {
                                                                const match =
                                                                    /language-(w+)/.exec(
                                                                        className ||
                                                                            ""
                                                                    );
                                                                return !inline &&
                                                                    match ? (
                                                                    <SyntaxHighlighter
                                                                        style={
                                                                            isDarkMode
                                                                                ? oneDark
                                                                                : oneLight
                                                                        }
                                                                        language={
                                                                            match[1]
                                                                        }
                                                                        PreTag="div"
                                                                        {...props}
                                                                    >
                                                                        {String(
                                                                            children
                                                                        ).replace(
                                                                            /\n$/,
                                                                            ""
                                                                        )}
                                                                    </SyntaxHighlighter>
                                                                ) : (
                                                                    <code
                                                                        className={
                                                                            className
                                                                        }
                                                                        {...props}
                                                                    >
                                                                        {
                                                                            children
                                                                        }
                                                                    </code>
                                                                );
                                                            },
                                                        }}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* 用于自动滚动的空div引用 */}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* 底部输入框区域 */}
                <div
                    className={`p-4 ${
                        isDarkMode
                            ? "bg-input-bg border-gray-700"
                            : "bg-light-input-bg border-gray-200"
                    } border-t`}
                >
                    <div className="flex items-center space-x-2 mx-auto">
                        <button
                            className={`p-2 ${
                                isDarkMode
                                    ? "text-gray-400 hover:text-gray-300"
                                    : "text-gray-500 hover:text-gray-600"
                            }`}
                        >
                            <FaceSmileIcon className="w-6 h-6" />
                        </button>
                        <button
                            className={`p-2 ${
                                isDarkMode
                                    ? "text-gray-400 hover:text-gray-300"
                                    : "text-gray-500 hover:text-gray-600"
                            }`}
                        >
                            <PhotoIcon className="w-6 h-6" />
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            placeholder="发消息..."
                            className={`flex-1 bg-transparent border-none focus:outline-none ${
                                isDarkMode ? "text-white" : "text-gray-800"
                            }`}
                        />
                        {isLoading && abortController ? (
                            <button
                                className={`p-2 text-red-500 hover:text-red-400`}
                                onClick={handleStopGeneration}
                                title="停止生成"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-6 h-6"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                                    />
                                </svg>
                            </button>
                        ) : (
                            <button
                                className={`p-2 ${
                                    !inputValue.trim()
                                        ? "text-gray-600 cursor-not-allowed"
                                        : "text-gray-400 hover:text-gray-300"
                                }`}
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                            >
                                <PaperAirplaneIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
