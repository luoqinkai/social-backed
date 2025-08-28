// controllers/userController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../db'); // 导入我们创建的数据库连接池

const JWT_SECRET = process.env.JWT_SECRET;

// 1. 用户注册逻辑
exports.register = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
        await pool.query(sql, [username, hashedPassword]);
        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        next(error);
    }
};

// 2. 用户登录逻辑
exports.login = async (req, res, next) => {
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
        next(error);
    }
};

// 3. 获取个人资料逻辑
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const sql = "SELECT id, username, created_at FROM users WHERE id = ?";
        const [users] = await pool.query(sql, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.status(200).json({
            message: '获取个人资料成功',
            userProfile: users[0]
        });
    } catch (error) {
        next(error);
    }
};

// 4. 关注用户逻辑
exports.followUser = async (req, res, next) => {
    try {
        const followerId = req.user.userId;
        const followingId = req.params.id;

        if (followerId == followingId) {
            return res.status(400).json({ message: '不能关注自己' });
        }

        const sql = "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)";
        await pool.query(sql, [followerId, followingId]);
        
        res.status(201).json({ message: '关注成功！' });
    } catch (error) {
        next(error);
    }
};
