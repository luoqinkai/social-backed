// index.js

// 阶段一：全局依赖
require('dotenv').config();
const express = require('express');

// 阶段二：应用初始化
const app = express();
app.use(express.json()); // 全局中间件，用于解析JSON

// 阶段三：路由挂载
const userRoutes = require('./routes/users'); // 引入我们定义的用户路由
// 告诉 Express：所有以 /api 开头的请求，都交给 userRoutes 这个路牌去处理
app.use('/api', userRoutes);

// 测试根路径
app.get('/', (req, res) => {
    res.send('你好，世界！WSL上的社交后台服务已经启动！');
});

// 阶段四：统一错误处理中间件 (必须放在所有路由之后)
app.use((err, req, res, next) => {
    console.error("统一错误处理器捕获到错误：", err);

    // JWT 认证错误
    if (err.name === "JsonWebTokenError") {
        return res.status(403).json({ message: "错误：无效的令牌" });
    }
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "错误：令牌已过期" });
    }
    // 数据库重复条目错误
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: '错误：该条目已存在（例如，用户名或关注关系）' });
    }

    // 所有其他未预料到的错误
    res.status(500).json({ message: "服务器内部发生未知错误" });
});

// 阶段五：启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务正在 http://localhost:${PORT} 运行`);
});
