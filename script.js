// ==================== API 資料載入系統 ====================

// ==================== API 資料載入系統 ====================

// 資料快取
let cachedData = null;
let articles = [];
let followingArticles = [];
let personalArticles = [];
let followingExperts = [];
let recommendedExperts = [];

// localStorage 的 key
const STORAGE_KEY = 'user_articles';
const DELETED_JSON_ARTICLES_KEY = 'deleted_json_articles'; // 新增：記錄已刪除的 JSON 文章

// 從 localStorage 載入用戶發布的文章
function loadUserArticles() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

// 儲存用戶文章到 localStorage
function saveUserArticles(userArticles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userArticles));
}

// 新增：載入已刪除的 JSON 文章 ID 列表
function loadDeletedJsonArticles() {
    const saved = localStorage.getItem(DELETED_JSON_ARTICLES_KEY);
    return saved ? JSON.parse(saved) : [];
}

// 新增：儲存已刪除的 JSON 文章 ID
function saveDeletedJsonArticles(deletedIds) {
    localStorage.setItem(DELETED_JSON_ARTICLES_KEY, JSON.stringify(deletedIds));
}

// 從 JSON 檔案載入資料
async function loadDataFromJSON() {
    if (cachedData) {
        return cachedData;
    }

    try {
        const response = await fetch('./data/articles.json');
        if (!response.ok) {
            throw new Error('無法載入資料');
        }
        cachedData = await response.json();

        // 將資料分配到全域變數
        articles = cachedData.articles || [];
        followingArticles = cachedData.followingArticles || [];
        followingExperts = cachedData.followingExperts || [];
        recommendedExperts = cachedData.recommendedExperts || [];

        // 載入已刪除的 JSON 文章 ID 列表
        const deletedJsonArticleIds = loadDeletedJsonArticles();

        // 過濾掉已刪除的 JSON 文章
        let jsonPersonalArticles = (cachedData.personalArticles || []).filter(
            article => !deletedJsonArticleIds.includes(article.id)
        );

        // 載入用戶發布的文章
        const userArticles = loadUserArticles();

        // 合併：用戶文章在前，JSON 文章在後
        personalArticles = [...userArticles, ...jsonPersonalArticles];

        console.log('✅ 資料載入成功！', {
            articles: articles.length,
            followingArticles: followingArticles.length,
            personalArticles: personalArticles.length,
            userArticles: userArticles.length,
            jsonPersonalArticles: jsonPersonalArticles.length,
            deletedJsonArticles: deletedJsonArticleIds.length
        });

        return cachedData;
    } catch (error) {
        console.error('❌ 載入資料失敗:', error);
        // 如果載入失敗，至少載入用戶的文章
        const userArticles = loadUserArticles();
        personalArticles = userArticles;
        articles = [];
        followingArticles = [];
        followingExperts = [];
        recommendedExperts = [];
        return null;
    }
}

// 新增：發布新文章
function publishNewArticle(title, content, tags = []) {
    const userArticles = loadUserArticles();
    const newId = Date.now();

    const newArticle = {
        id: newId,
        title: title,
        excerpt: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        content: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
        author: {
            name: "我",
            avatar: "img/people7.jpg"
        },
        date: new Date().toISOString().split('T')[0],
        image: "img/1.jpg",
        tags: tags,
        likes: 0,
        comments: 0,
        shares: 0,
        category: "my",
        isUserArticle: true // 標記為用戶文章
    };

    userArticles.unshift(newArticle);
    saveUserArticles(userArticles);
    personalArticles.unshift(newArticle);

    console.log('✅ 文章發布成功！', newArticle);
    return newArticle;
}

// 新增：儲存草稿
function saveAsDraft(title, content, tags = []) {
    const userArticles = loadUserArticles();
    const newId = Date.now();

    const draftArticle = {
        id: newId,
        title: title || '未命名草稿',
        excerpt: content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : '空白草稿',
        content: content ? `<p>${content.replace(/\n/g, '</p><p>')}</p>` : '',
        author: {
            name: "我",
            avatar: "img/people7.jpg"
        },
        date: new Date().toISOString().split('T')[0],
        image: "img/1.jpg",
        tags: tags,
        likes: 0,
        comments: 0,
        shares: 0,
        category: "draft",
        isUserArticle: true // 標記為用戶文章
    };

    userArticles.unshift(draftArticle);
    saveUserArticles(userArticles);
    personalArticles.unshift(draftArticle);

    console.log('✅ 草稿儲存成功！', draftArticle);
    return draftArticle;
}

// 修正：刪除文章（區分用戶文章和 JSON 文章）
function deleteArticle(articleId) {
    // 先檢查是否為用戶文章
    const userArticles = loadUserArticles();
    const userArticleIndex = userArticles.findIndex(a => a.id === articleId);

    if (userArticleIndex !== -1) {
        // 是用戶文章，從 localStorage 刪除
        userArticles.splice(userArticleIndex, 1);
        saveUserArticles(userArticles);
        console.log('✅ 用戶文章已刪除！', articleId);
    } else {
        // 是 JSON 文章，加入已刪除列表
        const deletedIds = loadDeletedJsonArticles();
        if (!deletedIds.includes(articleId)) {
            deletedIds.push(articleId);
            saveDeletedJsonArticles(deletedIds);
            console.log('✅ JSON 文章已標記為刪除！', articleId);
        }
    }

    // 從全域變數中移除
    personalArticles = personalArticles.filter(a => a.id !== articleId);
}

// ...existing code...

// 獲取所有文章（合併所有來源）
function getAllArticles() {
    return [...articles, ...followingArticles, ...personalArticles];
}

// 根據 ID 獲取文章
function getArticleById(id) {
    return getAllArticles().find(article => article.id === parseInt(id) || article.id === id);
}

// 根據分類獲取文章
function getArticlesByCategory(category, source = 'articles') {
    let sourceArticles;
    switch (source) {
        case 'following':
            sourceArticles = followingArticles;
            break;
        case 'personal':
            sourceArticles = personalArticles;
            break;
        default:
            sourceArticles = articles;
    }

    if (category === 'all') {
        return sourceArticles;
    }
    return sourceArticles.filter(article => article.category === category);
}

// 搜尋文章
function searchArticles(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return getAllArticles().filter(article =>
        article.title.toLowerCase().includes(lowerKeyword) ||
        article.excerpt.toLowerCase().includes(lowerKeyword) ||
        article.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
}

// ==================== UI 載入狀態函數 ====================

// 顯示載入狀態
function showLoadingState() {
    const containers = ['discover-articles', 'following-articles', 'personal-articles'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    color: #666;
                ">
                    <div class="loading-spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f1f1f1;
                        border-top-color: #7bcf7b;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    <p style="margin-top: 16px;">載入資料中...</p>
                </div>
            `;
        }
    });

    // 添加動畫樣式
    if (!document.getElementById('loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 隱藏載入狀態
function hideLoadingState() {
    const loadingElements = document.querySelectorAll('.loading-state');
    loadingElements.forEach(el => el.remove());
}

// 顯示錯誤狀態
function showErrorState() {
    const containers = ['discover-articles', 'following-articles', 'personal-articles'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                ">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <p style="color: #666; margin-bottom: 20px;">載入資料失敗，請稍後再試</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 24px;
                        background-color: #7bcf7b;
                        color: #000;
                        border: none;
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    ">重新載入</button>
                </div>
            `;
        }
    });
}

// 渲染文章列表
function renderArticles(containerID, articleData) {
    const container = document.getElementById(containerID);
    let articlesHTML = '';

    articleData.forEach(article => {
        articlesHTML += `
                <div class="article-card">
                    <img src="${article.image}" alt="${article.title}" class="article-image">
                    <div class="article-content">
                        <div class="article-meta">
                            <img src="${article.author.avatar}" alt="${article.author.name}" class="author-avatar">
                            <span>${article.author.name} · ${article.date}</span>
                        </div>
                        <h3 class="article-title">${article.title}</h3>
                        <p class="article-excerpt">${article.excerpt}</p>
                        <div class="article-tags">
                            ${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
                        </div>
                        <div class="article-actions">
                            <button class="action-button" title="讚">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                ${article.likes}
                            </button>
                            <button class="action-button" title="評論">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21.99,4c0-1.1-0.89-2-1.99-2H4C2.9,2,2,2.9,2,4v12c0,1.1,0.9,2,2,2h14l4,4L21.99,4z M18,14H6v-2h12V14z M18,11H6V9h12V11z M18,8H6V6h12V8z"></path>
                                </svg>
                                ${article.comments}
                            </button>
                            <button class="action-button" title="分享">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18,16.08c-0.76,0-1.44,0.3-1.96,0.77L8.91,12.7C8.96,12.47,9,12.24,9,12s-0.04-0.47-0.09-0.7l7.05-4.11C16.5,7.69,17.21,8,18,8c1.66,0,3-1.34,3-3s-1.34-3-3-3s-3,1.34-3,3c0,0.24,0.04,0.47,0.09,0.7L8.04,9.81C7.5,9.31,6.79,9,6,9c-1.66,0-3,1.34-3,3s1.34,3,3,3c0.79,0,1.5-0.31,2.04-0.81l7.12,4.16c-0.05,0.21-0.08,0.43-0.08,0.65c0,1.61,1.31,2.92,2.92,2.92s2.92-1.31,2.92-2.92C20.92,17.39,19.61,16.08,18,16.08z"></path>
                                </svg>
                                ${article.shares}
                            </button>
                            <button class="action-button" title="收藏">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17,3H7C5.9,3,5,3.9,5,5v16l7-3l7,3V5C19,3.9,18.1,3,17,3z"></path>
                                </svg>
                                收藏
                            </button>
                        </div>
                    </div>
                </div>
                `;
    });

    container.innerHTML = articlesHTML;
}

// 渲染專家列表
function renderExperts(containerID, expertData) {
    const container = document.getElementById(containerID);
    let expertsHTML = '';

    expertData.forEach(expert => {
        expertsHTML += `
                <div class="expert-item">
                    <img src="${expert.avatar}" alt="${expert.name}" class="expert-avatar">
                    <div class="expert-info">
                        <div class="expert-name">${expert.name}</div>
                        <div class="expert-title">${expert.title}</div>
                    </div>
                    <button class="follow-button ${expert.following ? 'following' : ''}">${expert.following ? '已關注' : '關注'}</button>
                </div>
                `;
    });

    container.innerHTML = expertsHTML;
}

// 初始化頁面 - 改為異步載入
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 頁面初始化中...');

    // 顯示載入狀態
    showLoadingState();

    try {
        // 從 JSON 載入資料
        await loadDataFromJSON();

        // 隱藏載入狀態
        hideLoadingState();

        // 渲染文章列表
        renderArticles('discover-articles', articles);
        renderArticles('following-articles', followingArticles);
        renderArticles('personal-articles', personalArticles);

        // 渲染專家列表
        renderExperts('following-experts', followingExperts);
        renderExperts('recommended-experts', recommendedExperts);

        categorizeArticles();
        initAllTabSwitching();

        console.log('✅ 頁面初始化完成！');
    } catch (error) {
        console.error('❌ 初始化失敗:', error);
        hideLoadingState();
        showErrorState();
    }

    // 頁面導航切換時重新初始化標籤
    const navButtons = document.querySelectorAll('.nav-button[data-page]');
    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetPage = this.getAttribute('data-page');
            document.querySelectorAll('.page-content').forEach(page => {
                page.style.display = 'none';
            });
            document.getElementById(targetPage + '-page').style.display = 'flex';

            // 更新活動按鈕樣式
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // 頁面切換後，重新初始化當前頁面的標籤
            if (targetPage === 'discover') {
                initTabSwitching('discover-page', {
                    '為你推薦': articles.filter(a => a.category === 'recommended'),
                    '最新文章': articles.filter(a => a.category === 'latest'),
                    '熱門文章': articles.filter(a => a.category === 'popular'),
                    '真假鑑定': articles.filter(a => a.category === 'verification')
                }, 'discover-articles', articles);
            } else if (targetPage === 'following') {
                initTabSwitching('following-page', {
                    '全部文章': followingArticles,
                    '專家文章': followingArticles.filter(a => a.category === 'expert'),
                    '好友動態': followingArticles.filter(a => a.category === 'friend')
                }, 'following-articles', followingArticles);
            } else if (targetPage === 'personal') {
                initTabSwitching('personal-page', {
                    '我的文章': personalArticles.filter(a => a.category === 'my'),
                    '已保存': personalArticles.filter(a => a.category === 'saved'),
                    '草稿': personalArticles.filter(a => a.category === 'draft')
                }, 'personal-articles', personalArticles);
            }
        });
    });

    // 添加功能到頁籤
    const tabs = document.querySelectorAll('.feed-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.feed-tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // 文章發布按鈕功能
    const writeButton = document.getElementById('writeButton');
    const writeModal = document.getElementById('writeModal');
    const closeModal = document.getElementById('closeModal');
    const publishButton = document.getElementById('publishArticle');
    const draftButton = document.getElementById('saveAsDraft');

    writeButton.addEventListener('click', function () {
        writeModal.classList.add('active');
    });

    closeModal.addEventListener('click', function () {
        writeModal.classList.remove('active');
    });

    publishButton.addEventListener('click', function () {
        const title = document.getElementById('articleTitle').value.trim();
        const content = document.getElementById('articleContent').value.trim();

        // 收集標籤
        const tagElements = document.querySelectorAll('#tagList .tag-item');
        const tags = Array.from(tagElements).map(el => el.textContent.replace('×', '').trim());

        if (title && content) {
            // 發布文章
            const newArticle = publishNewArticle(title, content, tags);

            // 顯示成功訊息
            alert('🎉 文章已成功發布！');

            // 關閉彈窗
            writeModal.classList.remove('active');

            // 清空表單
            document.getElementById('articleTitle').value = '';
            document.getElementById('articleContent').value = '';
            document.getElementById('tagList').innerHTML = '';

            // 重新渲染個人專欄的文章
            renderArticles('personal-articles', personalArticles.filter(a => a.category === 'my'));

            // 如果目前在個人專欄頁面，切換到「我的文章」標籤
            const personalPage = document.getElementById('personal-page');
            if (personalPage && personalPage.style.display !== 'none') {
                const tabs = personalPage.querySelectorAll('.feed-tab');
                tabs.forEach(t => t.classList.remove('active'));
                tabs[0].classList.add('active');
                renderArticles('personal-articles', personalArticles.filter(a => a.category === 'my'));
            }
        } else {
            alert('⚠️ 請填寫標題和內容');
        }
    });

    draftButton.addEventListener('click', function () {
        const title = document.getElementById('articleTitle').value.trim();
        const content = document.getElementById('articleContent').value.trim();

        // 收集標籤
        const tagElements = document.querySelectorAll('#tagList .tag-item');
        const tags = Array.from(tagElements).map(el => el.textContent.replace('×', '').trim());

        if (title || content) {
            // 儲存為草稿
            const draftArticle = saveAsDraft(title, content, tags);

            alert('📝 文章已儲存為草稿！');
            writeModal.classList.remove('active');

            // 清空表單
            document.getElementById('articleTitle').value = '';
            document.getElementById('articleContent').value = '';
            document.getElementById('tagList').innerHTML = '';

            // 重新渲染草稿區
            renderArticles('personal-articles', personalArticles.filter(a => a.category === 'draft'));
        } else {
            alert('⚠️ 請至少填寫標題或內容');
        }
    });

    // 標籤輸入功能
    const tagInput = document.getElementById('tagInput');
    const tagList = document.getElementById('tagList');

    tagInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tag = this.value.trim();

            if (tag) {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag-item';
                tagElement.innerHTML = `
                            ${tag}
                            <button class="tag-remove">&times;</button>
                        `;

                tagList.appendChild(tagElement);
                this.value = '';

                // 添加刪除標籤功能
                tagElement.querySelector('.tag-remove').addEventListener('click', function () {
                    tagElement.remove();
                });
            }
        }
    });

    // 關注按鈕功能
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('follow-button')) {
            if (e.target.classList.contains('following')) {
                e.target.classList.remove('following');
                e.target.textContent = '關注';
            } else {
                e.target.classList.add('following');
                e.target.textContent = '已關注';
            }
        }
    });

    // 新文章通知功能
    const newPostsAlert = document.getElementById('newPostsAlert');
    setTimeout(() => {
        newPostsAlert.style.display = 'block';
    }, 5000);

    newPostsAlert.addEventListener('click', function () {
        this.style.display = 'none';
        // 這裡可以添加加載新文章的邏輯
    });

    // 添加文章操作按鈕的交互效果
    document.addEventListener('click', function (e) {
        // 點擊讚按鈕的效果
        if (e.target.closest('.action-button[title="讚"]')) {
            const likeButton = e.target.closest('.action-button');
            likeButton.classList.toggle('liked');

            // 更新讚數 (僅用於演示)
            const currentLikes = parseInt(likeButton.textContent.trim());
            if (likeButton.classList.contains('liked')) {
                likeButton.lastChild.textContent = currentLikes + 1;
            } else {
                likeButton.lastChild.textContent = currentLikes - 1;
            }
        }

        // 點擊收藏按鈕的效果
        if (e.target.closest('.action-button[title="收藏"]')) {
            const saveButton = e.target.closest('.action-button');
            saveButton.classList.toggle('saved');

            if (saveButton.classList.contains('saved')) {
                saveButton.lastChild.textContent = ' 已收藏';
            } else {
                saveButton.lastChild.textContent = ' 收藏';
            }
        }
    });
});/* filepath: c:\Users\user\Desktop\prototype\index.html */
/* 在現有的 script 標籤內，document.addEventListener('DOMContentLoaded', function ()... 內部添加 */

// 移動版菜單切換
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navButtonsContainer = document.querySelector('.nav-buttons');

mobileMenuToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    navButtonsContainer.classList.toggle('active');
});
// 添加文章操作按鈕的交互效果
document.addEventListener('click', function (e) {
    // 點擊文章卡片顯示詳情
    if (e.target.closest('.article-card')) {
        const articleCard = e.target.closest('.article-card');
        // 防止點擊按鈕時觸發
        if (!e.target.closest('.article-actions')) {
            const articleTitle = articleCard.querySelector('.article-title').textContent;
            const article = [...articles, ...followingArticles, ...personalArticles].find(a => a.title === articleTitle);
            if (article) {
                showArticleDetail(article);
            }
        }
    }

    // 點擊讚按鈕的效果
    if (e.target.closest('.action-button[title="讚"]')) {
        const likeButton = e.target.closest('.action-button');
        likeButton.classList.toggle('liked');

        // 更新讚數 (僅用於演示)
        const currentLikes = parseInt(likeButton.textContent.trim());
        if (likeButton.classList.contains('liked')) {
            likeButton.lastChild.textContent = currentLikes + 1;
        } else {
            likeButton.lastChild.textContent = currentLikes - 1;
        }
    }

    // 點擊收藏按鈕的效果
    if (e.target.closest('.action-button[title="收藏"]')) {
        const saveButton = e.target.closest('.action-button');
        saveButton.classList.toggle('saved');

        if (saveButton.classList.contains('saved')) {
            saveButton.lastChild.textContent = ' 已收藏';
        } else {
            saveButton.lastChild.textContent = ' 收藏';
        }
    }
});

// 文章詳情功能
const articleModal = document.getElementById('articleModal');
const closeArticleModal = document.getElementById('closeArticleModal');

// 顯示文章詳情
function showArticleDetail(article) {
    const articleDetail = document.getElementById('articleDetail');

    // 檢查文章是否已點讚/收藏
    const isLiked = localStorage.getItem(`liked_${article.id}`) === 'true';
    const isSaved = localStorage.getItem(`saved_${article.id}`) === 'true';
    const currentLikes = isLiked ? article.likes + 1 : article.likes;

    // 使用 JSON 中的 content 欄位，如果沒有則使用 excerpt
    const articleContent = article.content || `<p>${article.excerpt}</p><p>這是文章的詳細內容。在實際應用中，這裡會顯示完整的文章內容，包括多個段落、圖片、引用等豐富的內容格式。</p><p>本文深入探討了相關主題，為讀者提供了實用的見解和建議。透過詳細的分析和專業的觀點，幫助讀者更好地理解這個領域的知識。</p><p>除了基本的介紹之外，我們還會分享一些實用的技巧和經驗，讓讀者能夠將所學應用到實際生活中。</p>`;

    // 生成文章詳情內容
    const detailHTML = `
                    <img src="${article.image}" alt="${article.title}" class="article-header-image">
                    <div class="article-detail-content">
                        <div class="article-meta-large">
                            <img src="${article.author.avatar}" alt="${article.author.name}" class="author-avatar-large">
                            <div class="author-info">
                                <div class="author-name">${article.author.name}</div>
                                <div class="article-date">${article.date}</div>
                            </div>
                        </div>
                        
                        <h1 class="article-title-large">${article.title}</h1>
                        
                        <div class="article-tags-large">
                            ${article.tags.map(tag => `<span class="article-tag-large">${tag}</span>`).join('')}
                        </div>
                        
                        <div class="article-body">
                            ${articleContent}
                        </div>
                        
                        <div class="article-actions-large">
                            <button class="action-button-large ${isLiked ? 'liked' : ''}" data-article-id="${article.id}" title="讚">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <span>${currentLikes}</span>
                            </button>
                            <button class="action-button-large" data-article-id="${article.id}" title="評論">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21.99,4c0-1.1-0.89-2-1.99-2H4C2.9,2,2,2.9,2,4v12c0,1.1,0.9,2,2,2h14l4,4L21.99,4z M18,14H6v-2h12V14z M18,11H6V9h12V11z M18,8H6V6h12V8z"></path>
                                </svg>
                                <span>${article.comments}</span>
                            </button>
                            <button class="action-button-large" data-article-id="${article.id}" title="分享">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18,16.08c-0.76,0-1.44,0.3-1.96,0.77L8.91,12.7C8.96,12.47,9,12.24,9,12s-0.04-0.47-0.09-0.7l7.05-4.11C16.5,7.69,17.21,8,18,8c1.66,0,3-1.34,3-3s-1.34-3-3-3s-3,1.34-3,3c0,0.24,0.04,0.47,0.09,0.7L8.04,9.81C7.5,9.31,6.79,9,6,9c-1.66,0-3,1.34-3,3s1.34,3,3,3c0.79,0,1.5-0.31,2.04-0.81l7.12,4.16c-0.05,0.21-0.08,0.43-0.08,0.65c0,1.61,1.31,2.92,2.92,2.92s2.92-1.31,2.92-2.92C20.92,17.39,19.61,16.08,18,16.08z"></path>
                                </svg>
                                <span>${article.shares}</span>
                            </button>
                            <button class="action-button-large ${isSaved ? 'saved' : ''}" data-article-id="${article.id}" title="收藏">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17,3H7C5.9,3,5,3.9,5,5v16l7-3l7,3V5C19,3.9,18.1,3,17,3z"></path>
                                </svg>
                                <span>${isSaved ? '已收藏' : '收藏'}</span>
                            </button>
                        </div>

                        <div class="related-products">
                            <h3 class="related-products-title">相關商品</h3>
                            <div class="related-products-grid">
                                <div class="related-product-card">
                                    <img src="img/1.jpg" alt="相關商品" class="product-image">
                                    <div class="product-details">
                                        <div class="product-title">Nike Dunk Low "Panda"</div>
                                        <div class="product-price">$320 USD</div>
                                    </div>
                                </div>
                                <div class="related-product-card">
                                    <img src="img/2.jpg" alt="相關商品" class="product-image">
                                    <div class="product-details">
                                        <div class="product-title">Air Jordan 1 Low OG</div>
                                        <div class="product-price">$290 USD</div>
                                    </div>
                                </div>
                                <div class="related-product-card">
                                    <img src="img/3.jpg" alt="相關商品" class="product-image">
                                    <div class="product-details">
                                        <div class="product-title">Nike SB Dunk High</div>
                                        <div class="product-price">$380 USD</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="comments-section">
                            <h3>評論 (${article.comments})</h3>
                            <div class="comment-form">
                                <textarea placeholder="寫下你的評論..." class="comment-input"></textarea>
                                <button class="comment-submit">發表評論</button>
                            </div>
                            <div class="comments-list">
                                <div class="comment-item">
                                    <img src="img/people2.jpg" alt="評論者" class="comment-avatar">
                                    <div class="comment-content">
                                        <div class="comment-author">Sarah Wong</div>
                                        <div class="comment-text">很棒的分析！特別是對於材質的比較很有幫助。</div>
                                        <div class="comment-date">2 小時前</div>
                                        <div class="comment-actions">
                                            <span class="comment-action">讚</span>
                                            <span class="comment-action">回覆</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="comment-item">
                                    <img src="img/people3.jpg" alt="評論者" class="comment-avatar">
                                    <div class="comment-content">
                                        <div class="comment-author">Jack Liu</div>
                                        <div class="comment-text">同意作者的觀點，這確實是入門者應該了解的重要資訊。</div>
                                        <div class="comment-date">4 小時前</div>
                                        <div class="comment-actions">
                                            <span class="comment-action">讚</span>
                                            <span class="comment-action">回覆</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

    articleDetail.innerHTML = detailHTML;
    articleModal.classList.add('active');

    // 綁定詳情頁面的按鈕事件
    setupArticleDetailButtons();
}

// 設置文章詳情頁面的按鈕事件
function setupArticleDetailButtons() {
    // 點讚按鈕
    const likeButton = document.querySelector('.article-detail .action-button-large[title="讚"]');
    if (likeButton) {
        likeButton.addEventListener('click', function () {
            const articleId = this.getAttribute('data-article-id');
            const isNowLiked = !this.classList.contains('liked');

            // 更新按鈕狀態
            this.classList.toggle('liked');

            // 更新讚數
            const likeCountElement = this.querySelector('span');
            let likeCount = parseInt(likeCountElement.textContent);
            likeCountElement.textContent = isNowLiked ? likeCount + 1 : likeCount - 1;

            // 保存到 localStorage
            localStorage.setItem(`liked_${articleId}`, isNowLiked ? 'true' : 'false');

            // 同步到主頁面
            updateMainPageButton(articleId, 'like', isNowLiked);
        });
    }

    // 收藏按鈕
    const saveButton = document.querySelector('.article-detail .action-button-large[title="收藏"]');
    if (saveButton) {
        saveButton.addEventListener('click', function () {
            const articleId = this.getAttribute('data-article-id');
            const isNowSaved = !this.classList.contains('saved');

            // 更新按鈕狀態
            this.classList.toggle('saved');

            // 更新文字
            const saveTextElement = this.querySelector('span');
            saveTextElement.textContent = isNowSaved ? '已收藏' : '收藏';

            // 保存到 localStorage
            localStorage.setItem(`saved_${articleId}`, isNowSaved ? 'true' : 'false');

            // 同步到主頁面
            updateMainPageButton(articleId, 'save', isNowSaved);
        });
    }
}

// 更新主頁面上的按鈕狀態
function updateMainPageButton(articleId, action, isActive) {
    const allArticles = [...articles, ...followingArticles, ...personalArticles];
    const article = allArticles.find(a => a.id.toString() === articleId);

    if (!article) return;

    // 尋找所有包含該文章的卡片
    document.querySelectorAll('.article-card').forEach(card => {
        const title = card.querySelector('.article-title').textContent;
        if (title === article.title) {
            if (action === 'like') {
                const likeBtn = card.querySelector('.action-button[title="讚"]');
                if (isActive) {
                    likeBtn.classList.add('liked');
                    // 更新數字
                    const count = parseInt(likeBtn.textContent.trim());
                    likeBtn.lastChild.textContent = count + 1;
                } else {
                    likeBtn.classList.remove('liked');
                    // 更新數字
                    const count = parseInt(likeBtn.textContent.trim());
                    likeBtn.lastChild.textContent = count - 1;
                }
            } else if (action === 'save') {
                const saveBtn = card.querySelector('.action-button[title="收藏"]');
                if (isActive) {
                    saveBtn.classList.add('saved');
                    saveBtn.lastChild.textContent = ' 已收藏';
                } else {
                    saveBtn.classList.remove('saved');
                    saveBtn.lastChild.textContent = ' 收藏';
                }
            }
        }
    });
}

// 關閉文章詳情
closeArticleModal.addEventListener('click', function () {
    articleModal.classList.remove('active');
});

// 點擊模態窗口外部關閉
articleModal.addEventListener('click', function (e) {
    if (e.target === articleModal) {
        articleModal.classList.remove('active');
    }
});
// 點擊菜單項後關閉菜單
document.querySelectorAll('.nav-button, #writeButton').forEach(button => {
    button.addEventListener('click', function () {
        if (window.innerWidth <= 600) {
            navButtonsContainer.classList.remove('active');
        }
    });
});

// 點擊頁面其他區域關閉菜單
document.addEventListener('click', function (event) {
    if (window.innerWidth <= 600 && navButtonsContainer.classList.contains('active') &&
        !event.target.closest('.nav-buttons') &&
        event.target !== mobileMenuToggle) {
        navButtonsContainer.classList.remove('active');
    }
});

// 在現有的 script 標籤內添加以下代碼，在 document.addEventListener('DOMContentLoaded', function () {...}) 函數內部添加

// 為所有商品卡添加链接功能
function addProductCardLinks() {
    // 獲取所有商品卡片（根據不同頁面中可能的類名）
    const productCards = document.querySelectorAll('.product-card, .article-product-card, .product-card-horizontal');

    productCards.forEach(card => {
        // 確保卡片本身不是連結，且不在連結內
        if (!card.closest('a') && card.tagName !== 'A') {
            // 創建包裹卡片的連結元素
            const cardLink = document.createElement('a');
            cardLink.href = 'https://stockx.com/zh-tw/nike-dunk-low-retro-white-black-2021';
            cardLink.target = '_blank'; // 在新標籤頁打開
            cardLink.className = 'product-card-link';

            // 處理點擊事件，防止點擊卡片內部的按鈕時觸發連結
            card.addEventListener('click', function (e) {
                // 如果點擊的是按鈕或按鈕內部元素，不觸發連結
                if (e.target.closest('.action-button, button, .article-actions, .product-actions,')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            });

            // 將卡片放入連結中
            const parent = card.parentNode;
            parent.insertBefore(cardLink, card);
            cardLink.appendChild(card);
        }
    });
}

// 頁面加載完成後執行
document.addEventListener('DOMContentLoaded', addProductCardLinks);

// 對於動態加載的內容，在加載後調用
function initDynamicContent() {
    addProductCardLinks();
}

// 當詳情頁面顯示時也調用
document.addEventListener('modalShown', function () {
    setTimeout(addProductCardLinks, 100); // 短暫延遲確保DOM已更新
});
// 為所有文章添加分類標籤
function categorizeArticles() {
    // 發現頁面文章分類 - 只有在沒有 category 時才分配
    articles.forEach(article => {
        if (!article.category) {
            article.category = article.tags.includes("真假鑑定") ? "verification" :
                article.date > "2023-10-01" ? "latest" :
                    article.likes > 400 ? "popular" : "recommended";
        }
    });

    // 關注頁面文章分類 - 只有在沒有 category 時才分配
    followingArticles.forEach(article => {
        if (!article.category) {
            article.category = article.author.name === "Sarah Wong" || article.author.name === "Michael Chen" ? "expert" : "friend";
        }
    });

    // 個人頁面文章分類 - 保留 JSON 中的 category
    personalArticles.forEach((article, index) => {
        if (!article.category) {
            article.category = index % 3 === 0 ? "draft" :
                index % 2 === 0 ? "saved" : "my";
        }
    });
}

// 初始化所有標籤切換功能
function initAllTabSwitching() {
    // 發現頁面標籤切換
    initTabSwitching('discover-page', {
        '為你推薦': articles.filter(a => a.category === 'recommended'),
        '最新文章': articles.filter(a => a.category === 'latest'),
        '熱門文章': articles.filter(a => a.category === 'popular'),
        '真假鑑定': articles.filter(a => a.category === 'verification')
    }, 'discover-articles', articles);

    // 關注頁面標籤切換
    initTabSwitching('following-page', {
        '全部文章': followingArticles,
        '專家文章': followingArticles.filter(a => a.category === 'expert'),
        '好友動態': followingArticles.filter(a => a.category === 'friend')
    }, 'following-articles', followingArticles);

    // 個人專欄頁面標籤切換
    initTabSwitching('personal-page', {
        '我的文章': personalArticles.filter(a => a.category === 'my'),
        '已保存': personalArticles.filter(a => a.category === 'saved'),
        '草稿': personalArticles.filter(a => a.category === 'draft')
    }, 'personal-articles', personalArticles);
}

// 為特定頁面初始化標籤切換功能
function initTabSwitching(pageId, tabMapping, articlesContainerId, defaultArticles) {
    const page = document.getElementById(pageId);
    if (!page) return;

    const tabs = page.querySelectorAll('.feed-tab');
    if (!tabs.length) return;

    // 為每個標籤添加點擊事件
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // 更新標籤樣式
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabText = this.textContent.trim();

            // 獲取對應標籤的文章
            let articlesToShow = tabMapping[tabText] || defaultArticles;

            // 如果沒有匹配的文章，顯示默認文章列表
            if (!articlesToShow || articlesToShow.length === 0) {
                articlesToShow = defaultArticles;
            }

            // 渲染文章
            renderArticles(articlesContainerId, articlesToShow);
        });
    });

    // 初始化第一個標籤為激活狀態
    const activeTab = tabs[0].textContent.trim();
    const initialArticles = tabMapping[activeTab] || defaultArticles;

    // 首次載入設置默認文章
    if (initialArticles && initialArticles.length > 0) {
        renderArticles(articlesContainerId, initialArticles);
    } else {
        renderArticles(articlesContainerId, defaultArticles);
    }
}

// 添加以下代碼到初始化部分
categorizeArticles();
initAllTabSwitching();

// 移除原本的文章渲染代碼，因為現在由標籤初始化時處理
// renderArticles('discover-articles', articles);
// renderArticles('following-articles', followingArticles);
// renderArticles('personal-articles', personalArticles);
// 通知铃铛功能
const bellButton = document.querySelector('.bell-button');
const notificationDropdown = document.querySelector('.notification-dropdown');
const markAllReadButton = document.querySelector('.mark-all-read');
const notificationItems = document.querySelectorAll('.notification-item');
const notificationBadge = document.querySelector('.notification-badge');

// 铃铛点击事件
bellButton.addEventListener('click', function (e) {
    e.stopPropagation();
    notificationDropdown.classList.toggle('active');
});

// 标记所有为已读
markAllReadButton.addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.notification-item').forEach(item => {
        item.classList.remove('unread');
    });
    // 隱藏通知徽章
    notificationBadge.style.display = 'none';
});

// 点击单个通知
notificationItems.forEach(item => {
    item.addEventListener('click', function () {
        this.classList.remove('unread');
        // 更新未读数量
        updateNotificationBadge();
    });
});

// 点击页面其他部分关闭通知下拉框
document.addEventListener('click', function (e) {
    if (!e.target.closest('.notification-bell')) {
        notificationDropdown.classList.remove('active');
    }
});

// 更新通知徽章
function updateNotificationBadge() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = 'flex';
    } else {
        notificationBadge.style.display = 'none';
    }
}

// 初始化通知徽章
updateNotificationBadge();
// 在文檔加載完成後執行
document.addEventListener('DOMContentLoaded', function () {
    // 第一次創建相關商品鏈接
    addProductLinks();

    // 監聽模態窗口顯示事件
    document.addEventListener('modalShown', addProductLinks);

    // 監聽文章詳情模態窗口的可見性變化
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.target.classList.contains('active')) {
                addProductLinks();
            }
        });
    });

    const articleModal = document.getElementById('articleModal');
    if (articleModal) {
        observer.observe(articleModal, { attributes: true, attributeFilter: ['class'] });
    }

    // 手動添加商品鏈接的函數
    function addProductLinks() {
        // 查找所有沒有鏈接包裹的相關商品卡片
        const productCards = document.querySelectorAll('.related-product-card:not(.linked)');

        productCards.forEach(card => {
            // 標記為已處理
            card.classList.add('linked');

            // 如果卡片不在鏈接中，則添加鏈接
            if (!card.closest('a')) {
                const wrapper = document.createElement('a');
                wrapper.href = "https://stockx.com/zh-tw/nike-dunk-low-retro-white-black-2021";
                wrapper.className = "product-card-link";
                wrapper.target = "_blank";

                // 保存卡片的父元素和下一个兄弟元素
                const parent = card.parentNode;
                const nextSibling = card.nextSibling;

                // 将卡片包装在链接中
                wrapper.appendChild(card);

                // 将链接插入到DOM中
                if (nextSibling) {
                    parent.insertBefore(wrapper, nextSibling);
                } else {
                    parent.appendChild(wrapper);
                }
            }
        });
    }
});


// 處理文章互動按鈕的雙向同步系統
document.addEventListener('DOMContentLoaded', function () {
    // 設置全域事件委託，處理所有文章列表頁的按鈕點擊
    document.addEventListener('click', function (e) {
        // 首頁點讚按鈕處理
        if (e.target.closest('.action-button[title="讚"]')) {
            const likeButton = e.target.closest('.action-button');
            const articleCard = likeButton.closest('.article-card');

            // 找到文章標題以識別文章
            const articleTitle = articleCard.querySelector('.article-title').textContent;
            const article = [...articles, ...followingArticles, ...personalArticles].find(a => a.title === articleTitle);

            if (article) {
                const articleId = article.id;
                const isNowLiked = !likeButton.classList.contains('liked');

                // 更新按鈕狀態
                likeButton.classList.toggle('liked');

                // 更新讚數
                const currentLikes = parseInt(likeButton.textContent.trim());
                likeButton.lastChild.textContent = isNowLiked ? currentLikes + 1 : currentLikes - 1;

                // 保存到 localStorage
                localStorage.setItem(`liked_${articleId}`, isNowLiked ? 'true' : 'false');

                // 同步到詳情頁（如果已打開）
                updateDetailPageIfOpen(articleId, 'like', isNowLiked);
            }
        }

        // 首頁收藏按鈕處理
        if (e.target.closest('.action-button[title="收藏"]')) {
            const saveButton = e.target.closest('.action-button');
            const articleCard = saveButton.closest('.article-card');

            // 找到文章標題以識別文章
            const articleTitle = articleCard.querySelector('.article-title').textContent;
            const article = [...articles, ...followingArticles, ...personalArticles].find(a => a.title === articleTitle);

            if (article) {
                const articleId = article.id;
                const isNowSaved = !saveButton.classList.contains('saved');

                // 更新按鈕狀態
                saveButton.classList.toggle('saved');
                saveButton.lastChild.textContent = isNowSaved ? ' 已收藏' : ' 收藏';

                // 保存到 localStorage
                localStorage.setItem(`saved_${articleId}`, isNowSaved ? 'true' : 'false');

                // 同步到詳情頁（如果已打開）
                updateDetailPageIfOpen(articleId, 'save', isNowSaved);
            }
        }
    });

    // 更新詳情頁按鈕的狀態（如果詳情頁打開）
    function updateDetailPageIfOpen(articleId, action, isActive) {
        const detailModal = document.getElementById('articleModal');

        // 檢查詳情頁是否已打開
        if (!detailModal || !detailModal.classList.contains('active')) return;

        // 找到詳情頁裡的按鈕
        const detailButtons = detailModal.querySelectorAll('.action-button-large[data-article-id]');
        if (detailButtons.length === 0) return;

        // 檢查當前打開的文章是否是我們要更新的文章
        const currentArticleId = detailButtons[0].getAttribute('data-article-id');
        if (currentArticleId != articleId) return;

        // 按操作類型更新對應按鈕
        if (action === 'like') {
            const likeBtn = detailModal.querySelector('.action-button-large[title="讚"]');
            if (likeBtn) {
                // 更新點讚狀態
                if (isActive) {
                    likeBtn.classList.add('liked');
                } else {
                    likeBtn.classList.remove('liked');
                }

                // 更新讚數
                const countSpan = likeBtn.querySelector('span');
                if (countSpan) {
                    let count = parseInt(countSpan.textContent);
                    count = isActive ? count + 1 : count - 1;
                    countSpan.textContent = count;
                }
            }
        } else if (action === 'save') {
            const saveBtn = detailModal.querySelector('.action-button-large[title="收藏"]');
            if (saveBtn) {
                // 更新收藏狀態
                if (isActive) {
                    saveBtn.classList.add('saved');
                    saveBtn.querySelector('span').textContent = '已收藏';
                } else {
                    saveBtn.classList.remove('saved');
                    saveBtn.querySelector('span').textContent = '收藏';
                }
            }
        }
    }
});

// 修改 setupArticleDetailButtons 函數，確保詳情頁按鈕點擊時正確同步到列表頁
// 取代原有的 setupArticleDetailButtons 函數
function setupArticleDetailButtons() {
    // 點讚按鈕
    const likeButton = document.querySelector('.article-detail .action-button-large[title="讚"]');
    if (likeButton) {
        likeButton.addEventListener('click', function () {
            const articleId = this.getAttribute('data-article-id');
            const isNowLiked = !this.classList.contains('liked');

            // 更新按鈕狀態
            this.classList.toggle('liked');

            // 更新讚數
            const likeCountElement = this.querySelector('span');
            let likeCount = parseInt(likeCountElement.textContent);
            likeCountElement.textContent = isNowLiked ? likeCount + 1 : likeCount - 1;

            // 保存到 localStorage
            localStorage.setItem(`liked_${articleId}`, isNowLiked ? 'true' : 'false');

            // 同步到主頁面
            updateMainPageButton(articleId, 'like', isNowLiked);
        });
    }

    // 收藏按鈕
    const saveButton = document.querySelector('.article-detail .action-button-large[title="收藏"]');
    if (saveButton) {
        saveButton.addEventListener('click', function () {
            const articleId = this.getAttribute('data-article-id');
            const isNowSaved = !this.classList.contains('saved');

            // 更新按鈕狀態
            this.classList.toggle('saved');

            // 更新文字
            const saveTextElement = this.querySelector('span');
            saveTextElement.textContent = isNowSaved ? '已收藏' : '收藏';

            // 保存到 localStorage
            localStorage.setItem(`saved_${articleId}`, isNowSaved ? 'true' : 'false');

            // 同步到主頁面
            updateMainPageButton(articleId, 'save', isNowSaved);
        });
    }
}

// 簡單的函數，為「我的收藏」區域的圖片添加點擊連結
function addCollectionLinks() {
    // 找到所有可能是收藏區域的圖片
    const collectionImages = document.querySelectorAll('img');

    collectionImages.forEach(img => {
        // 排除頭像、評論頭像等，只處理可能是商品的圖片
        if (!img.classList.contains('author-avatar') &&
            !img.classList.contains('comment-avatar') &&
            !img.classList.contains('expert-avatar') &&
            !img.closest('.article-meta') &&
            !img.parentElement.tagName === 'A') {

            // 檢查圖片是否在可能的收藏區域內
            const parentSection = img.closest('section, .collection-section, .my-collection');
            const nearbyText = img.parentElement.textContent;

            // 如果附近有「收藏」相關文字，或者圖片看起來像商品圖片
            if (nearbyText.includes('收藏') ||
                img.src.includes('img/') &&
                !img.src.includes('people')) {

                // 創建連結元素
                const link = document.createElement('a');
                link.href = 'https://stockx.com/zh-tw/nike-dunk-low-retro-white-black-2021';
                link.target = '_blank';
                link.className = 'product-card-link';

                // 替換圖片為連結包裹的圖片
                const parent = img.parentElement;
                parent.insertBefore(link, img);
                link.appendChild(img);
            }
        }
    });
}

// 將這個函數添加到現有的初始化代碼中
document.addEventListener('DOMContentLoaded', function () {
    // 延遲執行，確保所有內容都已載入
    setTimeout(function () {
        addCollectionLinks();
    }, 500);
});

// 簡化版本 - 只為「我的收藏」區域的圖片添加連結
function addCollectionLinks() {
    console.log('正在尋找「我的收藏」區域...');

    // 方法1: 透過標題文字找到「我的收藏」區域
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let collectionSection = null;

    headings.forEach(heading => {
        if (heading.textContent.includes('我的收藏')) {
            collectionSection = heading.parentElement;
            console.log('找到我的收藏區域:', collectionSection);
        }
    });

    // 方法2: 如果沒找到，嘗試透過類名查找
    if (!collectionSection) {
        collectionSection = document.querySelector('.my-collection, .collection-section, .my-collections');
        console.log('透過類名找到收藏區域:', collectionSection);
    }

    // 方法3: 如果還是沒找到，嘗試查找包含「收藏」文字的div
    if (!collectionSection) {
        const allDivs = document.querySelectorAll('div');
        allDivs.forEach(div => {
            if (div.textContent.includes('我的收藏') && div.querySelectorAll('img').length > 0) {
                collectionSection = div;
                console.log('透過文字內容找到收藏區域:', collectionSection);
            }
        });
    }

    if (collectionSection) {
        // 只處理這個區域內的圖片
        const collectionImages = collectionSection.querySelectorAll('img');
        console.log(`在收藏區域找到 ${collectionImages.length} 張圖片`);

        collectionImages.forEach((img, index) => {
            console.log(`處理收藏圖片 ${index + 1}:`, img.src);

            // 檢查圖片是否已經在連結內
            if (img.closest('a')) {
                console.log('圖片已經有連結，跳過');
                return;
            }

            // 排除頭像圖片
            if (img.classList.contains('author-avatar') ||
                img.classList.contains('comment-avatar') ||
                img.classList.contains('expert-avatar') ||
                img.src.includes('people')) {
                console.log('這是頭像圖片，跳過');
                return;
            }

            // 為收藏區域的圖片添加連結
            console.log('為收藏圖片添加連結:', img.src);

            // 創建連結
            const link = document.createElement('a');
            link.href = 'https://stockx.com/zh-tw/nike-dunk-low-retro-white-black-2021';
            link.target = '_blank';
            link.className = 'product-card-link';

            // 添加樣式讓用戶知道可以點擊
            link.style.display = 'inline-block';
            link.style.transition = 'transform 0.2s ease';

            // 添加懸停效果
            link.addEventListener('mouseenter', function () {
                this.style.transform = 'scale(1.05)';
            });

            link.addEventListener('mouseleave', function () {
                this.style.transform = 'scale(1)';
            });

            // 將圖片包裝在連結中
            const parent = img.parentElement;
            parent.insertBefore(link, img);
            link.appendChild(img);

            console.log('收藏圖片連結已添加成功');
        });
    } else {
        console.log('未找到「我的收藏」區域');
    }
}

// 等待頁面完全載入後執行
setTimeout(function () {
    console.log('開始執行我的收藏連結功能...');
    addCollectionLinks();
}, 1000);



