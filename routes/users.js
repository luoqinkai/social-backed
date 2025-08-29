// routes/users.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// 导入我们的控制器和中间件
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authenticateToken');

// 定义验证规则
const registerValidationRules = [
    body('username', '用户名不能为空').notEmpty().trim(),
    body('username', '用户名长度必须在3到20个字符之间').isLength({ min: 3, max: 20 }),
    body('password', '密码不能为空').notEmpty(),
    body('password', '密码长度至少为8个字符').isLength({ min: 8 })
];

// 设置路由
// POST /api/register -> 注册用户
router.post('/register', registerValidationRules, userController.register);

// POST /api/login -> 登录用户
router.post('/login', userController.login);

// GET /api/profile -> 获取个人资料 (需要认证)
router.get('/profile', authenticateToken, userController.getProfile);

// POST /api/users/:id/follow -> 关注其他用户 (需要认证)
router.post('/users/:id/follow', authenticateToken, userController.followUser);

// GET /api/users/:id -> 获取指定ID用户的公开资料
// 注意：这个接口不需要 authenticateToken 中间件，因为我们希望任何人都能查看
router.get('/users/:id',userController.getUserById);
router.delete('/users/:id/follow',authenticateToken,userController.unfollowUser);
module.exports = router;
