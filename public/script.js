// حالة التطبيق
const appState = {
  currentUser: null,
  currentPage: 'home',
  ideas: [],
  currentIdea: null,
  currentPageNum: 1,
  hasMoreIdeas: true
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// تهيئة التطبيق
async function initializeApp() {
  // التحقق من حالة تسجيل الدخول
  await checkAuthStatus();
  
  // إعداد معالجات الأحداث
  setupEventListeners();
  
  // تحميل المحتوى الأولي
  loadInitialContent();
}

// التحقق من حالة تسجيل الدخول
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    
    if (data.user) {
      appState.currentUser = data.user;
      updateUIForAuthState(true);
    } else {
      updateUIForAuthState(false);
    }
  } catch (error) {
    console.error('خطأ في التحقق من حالة المصادقة:', error);
    updateUIForAuthState(false);
  }
}

// تحديث واجهة المستخدم بناءً على حالة المصادقة
function updateUIForAuthState(isLoggedIn) {
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const userMenu = document.getElementById('user-menu');
  const usernameDisplay = document.getElementById('username-display');
  
  if (isLoggedIn) {
    loginBtn.classList.add('hidden');
    registerBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    usernameDisplay.textContent = appState.currentUser.username;
    
    // تحديث صورة المستخدم إذا كانت موجودة
    const userAvatarImg = document.getElementById('user-avatar-img');
    if (appState.currentUser.avatar && appState.currentUser.avatar !== 'default-avatar.svg') {
      userAvatarImg.src = appState.currentUser.avatar;
    }
  } else {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

// إعداد معالجات الأحداث
function setupEventListeners() {
  // التنقل بين الصفحات
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      navigateToPage(page);
    });
  });
  
  // نماذج المصادقة
  document.getElementById('login-btn').addEventListener('click', showLoginModal);
  document.getElementById('register-btn').addEventListener('click', showRegisterModal);
  document.getElementById('get-started-btn').addEventListener('click', showRegisterModal);
  document.getElementById('close-modal').addEventListener('click', hideAuthModal);
  document.getElementById('switch-to-register').addEventListener('click', showRegisterForm);
  document.getElementById('switch-to-login').addEventListener('click', showLoginForm);
  
  // تسجيل الدخول والتسجيل
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // إضافة فكرة
  document.getElementById('add-idea-form').addEventListener('submit', handleAddIdea);
  
  // التحميل الإضافي للأفكار
  document.getElementById('load-more-btn').addEventListener('click', loadMoreIdeas);
  document.getElementById('explore-load-more-btn').addEventListener('click', loadMoreExploreIdeas);
  
  // الفلاتر
  document.getElementById('category-filter').addEventListener('change', filterIdeas);
  document.getElementById('sort-filter').addEventListener('change', filterIdeas);
  
  // إغلاق النماذج المنبثقة بالنقر خارجها
  document.getElementById('auth-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      hideAuthModal();
    }
  });
}

// التنقل بين الصفحات
function navigateToPage(page) {
  // تحديث الروابط النشطة
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');
  
  // إخفاء جميع الصفحات
  document.querySelectorAll('.page').forEach(pageEl => {
    pageEl.classList.remove('active');
  });
  
  // إظهار الصفحة المطلوبة
  document.getElementById(`${page}-page`).classList.add('active');
  
  // تحديث حالة التطبيق
  appState.currentPage = page;
  
  // تحميل محتوى الصفحة إذا لزم الأمر
  if (page === 'home' || page === 'explore') {
    loadIdeas();
  }
}

// تحميل المحتوى الأولي
function loadInitialContent() {
  loadIdeas();
}

// تحميل الأفكار
async function loadIdeas(reset = true) {
  try {
    if (reset) {
      appState.ideas = [];
      appState.currentPageNum = 1;
      appState.hasMoreIdeas = true;
    }
    
    const response = await fetch(`/api/ideas?page=${appState.currentPageNum}&limit=9`);
    const data = await response.json();
    
    if (reset) {
      appState.ideas = data.ideas;
    } else {
      appState.ideas = [...appState.ideas, ...data.ideas];
    }
    
    appState.hasMoreIdeas = data.pagination.page < data.pagination.totalPages;
    
    renderIdeas();
    updateLoadMoreButton();
  } catch (error) {
    console.error('خطأ في تحميل الأفكار:', error);
    showAlert('خطأ في تحميل الأفكار', 'error');
  }
}

// تحميل المزيد من الأفكار
function loadMoreIdeas() {
  appState.currentPageNum++;
  loadIdeas(false);
}

// تحميل المزيد من الأفكار في صفحة الاستكشاف
function loadMoreExploreIdeas() {
  appState.currentPageNum++;
  loadExploreIdeas(false);
}

// تحديث زر تحميل المزيد
function updateLoadMoreButton() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  const exploreLoadMoreBtn = document.getElementById('explore-load-more-btn');
  
  if (loadMoreBtn) {
    loadMoreBtn.style.display = appState.hasMoreIdeas ? 'block' : 'none';
  }
  
  if (exploreLoadMoreBtn) {
    exploreLoadMoreBtn.style.display = appState.hasMoreIdeas ? 'block' : 'none';
  }
}

// عرض الأفكار
function renderIdeas() {
  const trendingContainer = document.getElementById('trending-ideas');
  const exploreContainer = document.getElementById('explore-ideas');
  
  const ideasHTML = appState.ideas.map(idea => createIdeaCardHTML(idea)).join('');
  
  if (trendingContainer && appState.currentPage === 'home') {
    trendingContainer.innerHTML = ideasHTML;
    attachIdeaCardEventListeners();
  }
  
  if (exploreContainer && appState.currentPage === 'explore') {
    exploreContainer.innerHTML = ideasHTML;
    attachIdeaCardEventListeners();
  }
}

// إنشاء HTML لبطاقة الفكرة
function createIdeaCardHTML(idea) {
  const date = new Date(idea.created_at).toLocaleDateString('ar-EG');
  const truncatedDescription = idea.description.length > 150 
    ? idea.description.substring(0, 150) + '...' 
    : idea.description;
  
  return `
    <div class="idea-card" data-idea-id="${idea.id}">
      ${idea.image_url ? `<img src="${idea.image_url}" alt="${idea.title}" class="idea-image">` : ''}
      <div class="idea-content">
        <div class="idea-header">
          <img src="${idea.avatar || 'default-avatar.svg'}" alt="${idea.username}" class="idea-user-avatar">
          <div class="idea-user-info">
            <div class="idea-username">${idea.username}</div>
            <div class="idea-date">${date}</div>
          </div>
        </div>
        <div class="idea-category">${idea.category}</div>
        <h3 class="idea-title">${idea.title}</h3>
        <p class="idea-description">${truncatedDescription}</p>
        <div class="idea-actions">
          <button class="like-btn ${idea.user_liked ? 'liked' : ''}" data-idea-id="${idea.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${idea.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${idea.likes_count}</span>
          </button>
          <button class="comment-btn" data-idea-id="${idea.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>${idea.comments_count}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// إرفاق معالجات الأحداث لبطاقات الأفكار
function attachIdeaCardEventListeners() {
  // الإعجابات
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const ideaId = this.getAttribute('data-idea-id');
      handleLike(ideaId, this);
    });
  });
  
  // التعليقات (عرض تفاصيل الفكرة)
  document.querySelectorAll('.comment-btn, .idea-card').forEach(element => {
    if (element.classList.contains('comment-btn')) {
      element.addEventListener('click', function(e) {
        e.stopPropagation();
        const ideaId = this.getAttribute('data-idea-id');
        showIdeaDetail(ideaId);
      });
    } else {
      element.addEventListener('click', function() {
        const ideaId = this.getAttribute('data-idea-id');
        showIdeaDetail(ideaId);
      });
    }
  });
}

// معالجة الإعجاب
async function handleLike(ideaId, button) {
  if (!appState.currentUser) {
    showLoginModal();
    return;
  }
  
  try {
    const response = await fetch(`/api/ideas/${ideaId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const likeCount = button.querySelector('span');
      const svg = button.querySelector('svg');
      
      if (data.liked) {
        button.classList.add('liked');
        likeCount.textContent = parseInt(likeCount.textContent) + 1;
        svg.setAttribute('fill', 'currentColor');
      } else {
        button.classList.remove('liked');
        likeCount.textContent = parseInt(likeCount.textContent) - 1;
        svg.setAttribute('fill', 'none');
      }
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في معالجة الإعجاب:', error);
    showAlert('خطأ في معالجة الإعجاب', 'error');
  }
}

// عرض تفاصيل الفكرة
async function showIdeaDetail(ideaId) {
  try {
    const response = await fetch(`/api/ideas/${ideaId}`);
    const data = await response.json();
    
    if (response.ok) {
      appState.currentIdea = data.idea;
      renderIdeaDetail();
      navigateToPage('idea-detail');
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في تحميل تفاصيل الفكرة:', error);
    showAlert('خطأ في تحميل تفاصيل الفكرة', 'error');
  }
}

// عرض تفاصيل الفكرة
function renderIdeaDetail() {
  const container = document.querySelector('.idea-detail-container');
  const idea = appState.currentIdea;
  const date = new Date(idea.created_at).toLocaleDateString('ar-EG');
  
  container.innerHTML = `
    <div class="idea-detail-card">
      ${idea.image_url ? `<img src="${idea.image_url}" alt="${idea.title}" class="idea-detail-image">` : ''}
      <div class="idea-detail-content">
        <div class="idea-detail-header">
          <img src="${idea.avatar || 'default-avatar.svg'}" alt="${idea.username}" class="idea-detail-user-avatar">
          <div class="idea-detail-user-info">
            <div class="idea-detail-username">${idea.username}</div>
            <div class="idea-detail-date">${date}</div>
          </div>
        </div>
        <div class="idea-detail-category">${idea.category}</div>
        <h1 class="idea-detail-title">${idea.title}</h1>
        <div class="idea-detail-description">${idea.description}</div>
        <div class="idea-detail-actions">
          <button class="like-btn ${idea.user_liked ? 'liked' : ''}" data-idea-id="${idea.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${idea.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${idea.likes_count}</span>
          </button>
          ${appState.currentUser && appState.currentUser.id === idea.user_id ? `
            <button class="btn btn-outline" id="edit-idea-btn">تعديل الفكرة</button>
          ` : ''}
        </div>
      </div>
    </div>
    
    <div class="comments-section">
      <h3>التعليقات (${idea.comments_count})</h3>
      
      ${appState.currentUser ? `
        <form class="comment-form" id="add-comment-form">
          <div class="form-group">
            <textarea id="comment-content" placeholder="اكتب تعليقك هنا..." rows="3" required></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">إضافة التعليق</button>
          </div>
        </form>
      ` : `
        <p class="text-center">يجب <a href="#" id="login-from-comment">تسجيل الدخول</a> لإضافة تعليق</p>
      `}
      
      <div class="comment-list" id="comment-list">
        <!-- سيتم ملؤها ديناميكياً -->
      </div>
    </div>
  `;
  
  // إرفاق معالجات الأحداث
  const likeBtn = container.querySelector('.like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', function() {
      handleLike(idea.id, this);
    });
  }
  
  const editBtn = container.querySelector('#edit-idea-btn');
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      showEditIdeaForm(idea);
    });
  }
  
  const commentForm = container.querySelector('#add-comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', handleAddComment);
  }
  
  const loginFromComment = container.querySelector('#login-from-comment');
  if (loginFromComment) {
    loginFromComment.addEventListener('click', function(e) {
      e.preventDefault();
      showLoginModal();
    });
  }
  
  // تحميل التعليقات
  loadComments(idea.id);
}

// تحميل التعليقات
async function loadComments(ideaId) {
  try {
    const response = await fetch(`/api/ideas/${ideaId}/comments`);
    const data = await response.json();
    
    if (response.ok) {
      renderComments(data.comments);
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في تحميل التعليقات:', error);
    showAlert('خطأ في تحميل التعليقات', 'error');
  }
}

// عرض التعليقات
function renderComments(comments) {
  const commentList = document.getElementById('comment-list');
  
  if (comments.length === 0) {
    commentList.innerHTML = '<p class="text-center">لا توجد تعليقات بعد</p>';
    return;
  }
  
  const commentsHTML = comments.map(comment => {
    const date = new Date(comment.created_at).toLocaleDateString('ar-EG');
    
    return `
      <div class="comment-item">
        <img src="${comment.avatar || 'default-avatar.svg'}" alt="${comment.username}" class="comment-user-avatar">
        <div class="comment-content">
          <div class="comment-header">
            <div class="comment-username">${comment.username}</div>
            <div class="comment-date">${date}</div>
          </div>
          <div class="comment-text">${comment.content}</div>
        </div>
      </div>
    `;
  }).join('');
  
  commentList.innerHTML = commentsHTML;
}

// معالجة إضافة تعليق
async function handleAddComment(e) {
  e.preventDefault();
  
  if (!appState.currentUser) {
    showLoginModal();
    return;
  }
  
  const content = document.getElementById('comment-content').value.trim();
  
  if (!content) {
    showAlert('يرجى كتابة تعليق', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/ideas/${appState.currentIdea.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('comment-content').value = '';
      showAlert('تم إضافة التعليق بنجاح', 'success');
      loadComments(appState.currentIdea.id);
      
      // تحديث عدد التعليقات في بطاقة الفكرة
      const commentBtn = document.querySelector(`.comment-btn[data-idea-id="${appState.currentIdea.id}"]`);
      if (commentBtn) {
        const countSpan = commentBtn.querySelector('span');
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
      }
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في إضافة التعليق:', error);
    showAlert('خطأ في إضافة التعليق', 'error');
  }
}

// عرض نموذج تسجيل الدخول
function showLoginModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('modal-title').textContent = 'تسجيل الدخول';
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
}

// عرض نموذج التسجيل
function showRegisterModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('modal-title').textContent = 'إنشاء حساب';
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
}

// إخفاء النموذج المنبثق
function hideAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
}

// عرض نموذج تسجيل الدخول
function showLoginForm(e) {
  if (e) e.preventDefault();
  document.getElementById('modal-title').textContent = 'تسجيل الدخول';
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
}

// عرض نموذج التسجيل
function showRegisterForm(e) {
  if (e) e.preventDefault();
  document.getElementById('modal-title').textContent = 'إنشاء حساب';
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
}

// معالجة تسجيل الدخول
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      appState.currentUser = data.user;
      updateUIForAuthState(true);
      hideAuthModal();
      showAlert('تم تسجيل الدخول بنجاح', 'success');
      
      // إعادة تحميل الأفكار لتحديث حالة الإعجابات
      loadIdeas(true);
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    showAlert('خطأ في تسجيل الدخول', 'error');
  }
}

// معالجة التسجيل
async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      appState.currentUser = data.user;
      updateUIForAuthState(true);
      hideAuthModal();
      showAlert('تم إنشاء الحساب بنجاح', 'success');
      
      // إعادة تحميل الأفكار لتحديث حالة الإعجابات
      loadIdeas(true);
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في إنشاء الحساب:', error);
    showAlert('خطأ في إنشاء الحساب', 'error');
  }
}

// معالجة تسجيل الخروج
async function handleLogout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      appState.currentUser = null;
      updateUIForAuthState(false);
      showAlert('تم تسجيل الخروج بنجاح', 'success');
      
      // إعادة تحميل الأفكار لتحديث حالة الإعجابات
      loadIdeas(true);
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    showAlert('خطأ في تسجيل الخروج', 'error');
  }
}

// معالجة إضافة فكرة
async function handleAddIdea(e) {
  e.preventDefault();
  
  if (!appState.currentUser) {
    showLoginModal();
    return;
  }
  
  const title = document.getElementById('idea-title').value;
  const category = document.getElementById('idea-category').value;
  const description = document.getElementById('idea-description').value;
  const image_url = document.getElementById('idea-image').value;
  
  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, category, description, image_url })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('add-idea-form').reset();
      showAlert('تم إضافة الفكرة بنجاح', 'success');
      navigateToPage('home');
      loadIdeas(true);
    } else {
      showAlert(data.error, 'error');
    }
  } catch (error) {
    console.error('خطأ في إضافة الفكرة:', error);
    showAlert('خطأ في إضافة الفكرة', 'error');
  }
}

// عرض نموذج تعديل الفكرة
function showEditIdeaForm(idea) {
  // تنفيذ واجهة تعديل الفكرة
  // (يمكن توسيع هذا الجزء حسب الحاجة)
  alert('ميزة التعديل قيد التطوير');
}

// تصفية الأفكار
function filterIdeas() {
  // تنفيذ التصفية حسب الفئة والترتيب
  // (يمكن توسيع هذا الجزء حسب الحاجة)
  loadIdeas(true);
}

// عرض التنبيهات
function showAlert(message, type) {
  const alertContainer = document.getElementById('alert-container');
  const alertId = 'alert-' + Date.now();
  
  const alertHTML = `
    <div class="alert alert-${type}" id="${alertId}">
      <span>${message}</span>
      <button class="alert-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6L18 18"></path>
        </svg>
      </button>
    </div>
  `;
  
  alertContainer.insertAdjacentHTML('beforeend', alertHTML);
  
  // إغلاق التنبيه تلقائياً بعد 5 ثوانٍ
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      alert.remove();
    }
  }, 5000);
  
  // إغلاق التنبيه يدوياً
  const closeBtn = document.querySelector(`#${alertId} .alert-close`);
  closeBtn.addEventListener('click', function() {
    document.getElementById(alertId).remove();
  });
}