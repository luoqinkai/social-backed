// middleware/authenticateToken.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (token == null) {
            // 注意：这里我们返回一个标准的JSON错误，而不是仅仅一个状态码
            return res.status(401).json({ message: "错误：缺少认证令牌" });
        }

        const user = jwt.verify(token, JWT_SECRET);
        req.user = user; // 将用户信息附加到请求对象
        next(); // 验证成功，放行
    } catch (err) {
        // 验证失败，将错误交给统一错误处理器
        next(err);
    }
};

module.exports = authenticateToken;
