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
        const userSql = "SELECT id, username,display_name,bio, created_at FROM users WHERE id = ?";
        const [users] = await pool.query(sql, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }
        const followingSql="SELECT COUNT(*) as following_count FROM follows WHERE follower_id=?";
        const [followingResult]=await  pool.query(followingSql,[userId]);
       
        const followersSql="SELECT COUNT(*) as followers_count FROM follows WHERE following_id=?";
        const [followersResult]=await  pool.query(followersSql,[userId]);
        
        const userProfile={
            ...users[0],
            following_count:followingResult[0].following_count,
            followers_count:followersResult[0].followers_count
        }
        res.status(200).json({
            message: '获取个人资料成功',
            userProfile: userProfile
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
// 5. 获取指定ID用户的公开资料
exports.getUserById=async(req,res,next)=>{
    try{
         // 关键区别：userId 来自 URL 参数 (req.params)，而不是 JWT (req.user)
         const userId=req.params.id;
         const userSql="SELECT id,username,display_name,bio,created_at FROM users WHERE id=?";
         const [users]=await pool.query(userSql,[userId]);
            // 如果找不到用户，返回 404
            if(users.length===0){
                return res.status(404).json({message:'用户不存在'});
            }
            // 查询该用户的关注数
            const followingSql="SELECT COUNT(*) as following_count FROM follows WHERE follower_id=?";
            const [followingResult]=await pool.query(followingSql,[userId]);
            // 查询该用户的粉丝数
            const followersSql="SELECT COUNT(*) as followers_count FROM follows WHERE following_id=?";
            const [followersResult]=await pool.query(followersSql,[userId]);

            const userProfile={
                ...users[0],
                following_count:followingResult[0].follwing_count,
                followers_count:followersResult[0].followers_counte
            };
            res.status(200).json({
                message:'获取用户资料成功',
                userProfile:userProfile
            });
    }
    catch(error){
        next(error);
    }

};
exports.unfollowUser=async(req,res,next)=>{
    try{
        const followerId=req.user.userId;
        const followingId=req.params.id;
        if(followerId==followingId){
            return res.status(400).json({message:'不能取关自己'});
        }
        const sql="DELETE  FROM follows WHERE follower_id=? AND following_id=?";
        const [result]=await pool.query(sql,[followerId,followingId]);
        if(result.affectedRows===0){
            return res.status(404).json({message:'未找到关注关系，无法取关'});
        }
        res.status(200).json({message:'取关成功'}); 
    }
    catch(error){
        next(error);
    }
}