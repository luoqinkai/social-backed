// routes/posts.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// 导入控制器和中间件
const postController = require('../controllers/postController');
const authenticateToken = require('../middleware/authenticateToken');

// 定义发布动态的验证规则
const postValidationRules = [
    body('content', '动态内容不能为空').notEmpty().trim(),
    body('content', '动态内容不能超过1000个字符').isLength({ max: 1000 })
];

// POST /api/posts -> 发布一条新动态 (需要认证)
router.post('/posts', authenticateToken, postValidationRules, postController.createPost);

// GET /api/users/:id/posts -> 获取指定用户的所有动态
// 注意：我们把这个路由也放在这里，让动态相关的路由更集中
// 但在 users.js 里保留一个版本也没错，取决于你的设计哲学
router.get('/users/:id/posts', postController.getPostsByUser);


module.exports = router;
