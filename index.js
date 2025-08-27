// =================================================================
// 阶段一：引入所有项目所需的“专家库”
// =================================================================
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// =================================================================
// 阶段二：应用初始化与全局配置
// =================================================================
// 创建Express应用实例
const app = express();

// 使用Express内置中间件，自动解析JSON格式的请求体
app.use(express.json());

// 数据库连接池配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
};
// 创建数据库连接池，用于高效处理并发请求
const pool = mysql.createPool(dbConfig);

// 定义JWT加密密钥。在真实项目中，这必须是一个更复杂且保密的字符串
const JWT_SECRET = process.env.JWT_SECRET;
const PORT =process.env.PORT||3000;

// =================================================================
// 阶段三：可复用的认证中间件
// =================================================================
/**
 * 认证中间件：用于验证请求头中的JWT令牌
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 * @param {function} next - 下一个中间件函数
 */
const authenticateToken = (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];
        if (token==null){
            return res.status(401).json({message:"错误：缺少认证令牌"});
        }
        const user=jwt.verify(token,JWT_SECRET);
        req.user=user;
        next();
    }
    catch(err){
        next(err);
    }
    
 
};

// =================================================================
// 阶段四：核心API接口定义
// =================================================================
// --- 接口1: 根路径测试接口 ---
// 简短的测试接口，用于确认服务是否成功启动
app.get('/', (req, res) => {
    res.send('你好，世界！WSL上的社交后台服务已经启动！');
});

// --- 接口2: 用户注册 (POST /register) ---
/**
 * API端点: POST /register
 * 功能: 创建新用户账户
 * @param {object} req.body - 包含username和password的JSON对象
 */
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码不能为空' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
        await pool.query(sql, [username, hashedPassword]);

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: '错误：该用户名已被注册' });
        }
        console.error('用户注册过程中发生错误:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// --- 接口3: 用户登录 (POST /login) ---
/**
 * API端点: POST /login
 * 功能: 验证用户凭证并签发JWT令牌
 * @param {object} req.body - 包含username和password的JSON对象
 */
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(401).json({ message: '认证失败：用户名或密码错误' });
        }

        const sql = "SELECT * FROM users WHERE username = ?";
        const [users] = await pool.query(sql, [username]);
        if (users.length === 0) {
            return res.status(401).json({ message: '认证失败：用户名或密码错误' });
        }
        const user = users[0];

        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: '认证失败：用户名或密码错误' });
        }

        const payload = { userId: user.id, username: user.username };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: '登录成功', token: token });
    } catch (error) {
        console.error('用户登录过程中发生错误:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// --- 接口4: 获取个人资料 (GET /profile) ---
/**
 * API端点: GET /profile
 * 功能: 获取当前登录用户的个人资料
 * @requires authenticateToken - 需要有效的JWT令牌进行认证
 */
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        // 从中间件附加的req.user中获取用户ID
        const userId = req.user.userId;
        const sql = "SELECT username FROM users WHERE id = ?";
        const [users] = await pool.query(sql, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }
        const username = users[0].username;

        res.status(200).json({ 
            message: '获取个人资料成功', 
            userProfile: { 
                userId: userId, 
                username: username 
            } 
        });
    } catch (error) {
        console.error('获取个人资料过程中发生错误:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// --- 接口5: 关注其他用户 (POST /users/:id/follow) ---
/**
 * API端点: POST /users/:id/follow
 * 功能: 创建一条用户关注关系记录
 * @param {string} req.params.id - 被关注用户的ID
 * @requires authenticateToken - 需要有效的JWT令牌进行认证
 */
app.post('/users/:id/follow', authenticateToken, async (req, res) => {
    try {
        // 获取关注者ID（当前登录用户）和被关注者ID（来自URL参数）
        const followerId = req.user.userId;
        const followingId = req.params.id;

        // 检查用户是否尝试关注自己
        if (followerId === followingId) {
            return res.status(400).json({ message: '不能关注自己' });
        }
        
        // SQL语句：向follows表中插入一条新的关注记录
        const sql = "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)"; 
        
        // 执行数据库插入操作
        await pool.query(sql, [followerId, followingId]);
        
        // 成功响应
        res.status(201).json({ message: '关注成功！' });

    } catch (error) {
        // 如果是重复条目错误（已关注），返回409 Conflict
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: '错误：您已关注该用户' });
        }
        console.error('关注过程中发生错误:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});


// =================================================================
// 阶段五：启动服务
// =================================================================

app.listen(PORT, () => {
    console.log(`🚀 服务正在 http://localhost:${PORT} 运行`);
    // 检查数据库连接池是否正常
    pool.query('SELECT 1')
        .then(() => {
            console.log('🎉 数据库连接池已准备就绪！');
        })
        .catch(err => {
            console.error('❌ 数据库连接池初始化失败:', err);
        });
});
// =================================================================
// 阶段六：统一错误处理
// =================================================================
app.use(
    (err,req,res,next)=>{
        console.error("统一错误处理器捕获到错误：",err);
        if(err.name==="JsonWebTokenError"){
            return res.status(403).json({message:"错误：无效的令牌 "})；
        }
        if(err.name==="TokenExpiredError"){
            return res.status(403).json({message:"错误：令牌已过期"});
        }
        res.status(500).json({message:"服务器内部发生未知错误"});
    }
)