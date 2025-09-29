const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// الجلسات
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' }),
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // أسبوع
}));

// التحقق من تسجيل الدخول
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }
  next();
};

// المسارات

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً' });
        }
        
        req.session.userId = this.lastID;
        res.json({ 
          message: 'تم إنشاء الحساب بنجاح',
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// تسجيل الدخول
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    
    req.session.userId = user.id;
    res.json({ 
      message: 'تم تسجيل الدخول بنجاح',
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar }
    });
  });
});

// تسجيل الخروج
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في تسجيل الخروج' });
    }
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
  });
});

// الحصول على معلومات المستخدم الحالي
app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  
  db.get('SELECT id, username, email, avatar FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.json({ user: null });
    }
    res.json({ user });
  });
});

// إضافة فكرة جديدة
app.post('/api/ideas', requireAuth, (req, res) => {
  const { title, description, category, image_url } = req.body;
  
  db.run(
    'INSERT INTO ideas (user_id, title, description, category, image_url) VALUES (?, ?, ?, ?, ?)',
    [req.session.userId, title, description, category, image_url],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في إضافة الفكرة' });
      }
      
      res.json({ 
        message: 'تم إضافة الفكرة بنجاح',
        idea: { 
          id: this.lastID, 
          user_id: req.session.userId, 
          title, 
          description, 
          category, 
          image_url,
          created_at: new Date().toISOString()
        }
      });
    }
  );
});

// الحصول على جميع الأفكار
app.get('/api/ideas', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT 
      ideas.*, 
      users.username, 
      users.avatar,
      COUNT(likes.id) as likes_count,
      COUNT(comments.id) as comments_count,
      EXISTS(SELECT 1 FROM likes WHERE likes.user_id = ? AND likes.idea_id = ideas.id) as user_liked
    FROM ideas 
    JOIN users ON ideas.user_id = users.id
    LEFT JOIN likes ON ideas.id = likes.idea_id
    LEFT JOIN comments ON ideas.id = comments.idea_id
    GROUP BY ideas.id
    ORDER BY ideas.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  db.all(query, [req.session.userId || 0, limit, offset], (err, ideas) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في جلب الأفكار' });
    }
    
    // الحصول على العدد الإجمالي للأفكار
    db.get('SELECT COUNT(*) as total FROM ideas', (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'خطأ في جلب الأفكار' });
      }
      
      res.json({
        ideas,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// الحصول على فكرة محددة
app.get('/api/ideas/:id', (req, res) => {
  const ideaId = req.params.id;
  
  const query = `
    SELECT 
      ideas.*, 
      users.username, 
      users.avatar,
      COUNT(likes.id) as likes_count,
      COUNT(comments.id) as comments_count,
      EXISTS(SELECT 1 FROM likes WHERE likes.user_id = ? AND likes.idea_id = ideas.id) as user_liked
    FROM ideas 
    JOIN users ON ideas.user_id = users.id
    LEFT JOIN likes ON ideas.id = likes.idea_id
    LEFT JOIN comments ON ideas.id = comments.idea_id
    WHERE ideas.id = ?
    GROUP BY ideas.id
  `;
  
  db.get(query, [req.session.userId || 0, ideaId], (err, idea) => {
    if (err || !idea) {
      return res.status(404).json({ error: 'الفكرة غير موجودة' });
    }
    
    res.json({ idea });
  });
});

// تحديث فكرة
app.put('/api/ideas/:id', requireAuth, (req, res) => {
  const ideaId = req.params.id;
  const { title, description, category, image_url } = req.body;
  
  // التحقق من ملكية الفكرة
  db.get('SELECT * FROM ideas WHERE id = ? AND user_id = ?', [ideaId, req.session.userId], (err, idea) => {
    if (err || !idea) {
      return res.status(404).json({ error: 'الفكرة غير موجودة أو لا تملك صلاحية التعديل' });
    }
    
    db.run(
      'UPDATE ideas SET title = ?, description = ?, category = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, category, image_url, ideaId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطأ في تحديث الفكرة' });
        }
        
        res.json({ message: 'تم تحديث الفكرة بنجاح' });
      }
    );
  });
});

// إضافة إعجاب
app.post('/api/ideas/:id/like', requireAuth, (req, res) => {
  const ideaId = req.params.id;
  
  db.run(
    'INSERT OR IGNORE INTO likes (user_id, idea_id) VALUES (?, ?)',
    [req.session.userId, ideaId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في إضافة الإعجاب' });
      }
      
      if (this.changes === 0) {
        // إذا كان المستخدم معجب بالفعل، قم بإزالة الإعجاب
        db.run('DELETE FROM likes WHERE user_id = ? AND idea_id = ?', [req.session.userId, ideaId], function(err) {
          if (err) {
            return res.status(500).json({ error: 'خطأ في إزالة الإعجاب' });
          }
          res.json({ liked: false, message: 'تم إزالة الإعجاب' });
        });
      } else {
        res.json({ liked: true, message: 'تم إضافة الإعجاب' });
      }
    }
  );
});

// إضافة تعليق
app.post('/api/ideas/:id/comments', requireAuth, (req, res) => {
  const ideaId = req.params.id;
  const { content } = req.body;
  
  db.run(
    'INSERT INTO comments (user_id, idea_id, content) VALUES (?, ?, ?)',
    [req.session.userId, ideaId, content],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في إضافة التعليق' });
      }
      
      // الحصول على معلومات التعليق مع اسم المستخدم
      db.get(`
        SELECT comments.*, users.username, users.avatar 
        FROM comments 
        JOIN users ON comments.user_id = users.id 
        WHERE comments.id = ?
      `, [this.lastID], (err, comment) => {
        if (err) {
          return res.status(500).json({ error: 'خطأ في جلب التعليق' });
        }
        
        res.json({ 
          message: 'تم إضافة التعليق بنجاح',
          comment
        });
      });
    }
  );
});

// الحصول على تعليقات فكرة
app.get('/api/ideas/:id/comments', (req, res) => {
  const ideaId = req.params.id;
  
  db.all(`
    SELECT comments.*, users.username, users.avatar 
    FROM comments 
    JOIN users ON comments.user_id = users.id 
    WHERE comments.idea_id = ? 
    ORDER BY comments.created_at ASC
  `, [ideaId], (err, comments) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في جلب التعليقات' });
    }
    
    res.json({ comments });
  });
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`الخادم يعمل على http://localhost:${PORT}`);
});