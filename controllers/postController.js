// controllers/postController.js

const pool = require('../db');
const { validationResult } = require('express-validator');

// 1. 创建新动态的逻辑
exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { content } = req.body;
        const userId = req.user.userId; // 从认证中间件获取用户ID

        const sql = "INSERT INTO posts (user_id, content) VALUES (?, ?)";
        const [result] = await pool.query(sql, [userId, content]);

        res.status(201).json({ 
            message: '动态发布成功', 
            postId: result.insertId 
        });
    } catch (error) {
        next(error);
    }
};

// 2. 获取指定用户所有动态的逻辑
exports.getPostsByUser = async (req, res, next) => {
    try {
        const userId = req.params.id; // 从 URL 参数获取用户ID

        // 联合查询，同时获取动态信息和发布者信息
        const sql = `
            SELECT 
                p.id, 
                p.content, 
                p.created_at, 
                u.id as user_id, 
                u.username, 
                u.display_name 
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        `;
        
        const [posts] = await pool.query(sql, [userId]);

        res.status(200).json({
            message: '获取用户动态成功',
            posts: posts
        });

    } catch (error) {
        next(error);
    }
};
