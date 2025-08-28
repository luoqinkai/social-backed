// db.js

const mysql = require('mysql2/promise');

// 从环境变量中读取数据库配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    // 启用Promise支持
    Promise: global.Promise
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 导出连接池，以便其他文件可以使用
module.exports = pool;
