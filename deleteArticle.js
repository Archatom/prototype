// ==================== 刪除文章功能模組 ====================

// localStorage 的 key（與主程式共用）
const USER_ARTICLES_KEY = 'user_articles';

// 從 localStorage 載入用戶文章
function loadUserArticlesForDelete() {
    const saved = localStorage.getItem(USER_ARTICLES_KEY);
    return saved ? JSON.parse(saved) : [];
}

// 儲存用戶文章到 localStorage
function saveUserArticlesForDelete(userArticles) {
    localStorage.setItem(USER_ARTICLES_KEY, JSON.stringify(userArticles));
}

// 刪除文章
function deleteArticleById(articleId) {
    const userArticles = loadUserArticlesForDelete();
    const filteredArticles = userArticles.filter(a => a.id !== articleId);
    saveUserArticlesForDelete(filteredArticles);

    // 更新全域變數
    if (typeof personalArticles !== 'undefined') {
        personalArticles = filteredArticles;
    }

    console.log('✅ 文章已刪除！', articleId);
    return true;
}

// 確認刪除對話框
function confirmDeleteArticle(articleId, articleTitle) {
    const confirmed = confirm(`確定要刪除文章「${articleTitle}」嗎？\n此操作無法復原。`);

    if (confirmed) {
        deleteArticleById(articleId);
        refreshCurrentTab();
        closeArticleModalIfOpen();
        alert('✅ 文章已成功刪除！');
    }
}

// 重新渲染當前標籤的文章
function refreshCurrentTab() {
    const personalPage = document.getElementById('personal-page');
    if (!personalPage) return;

    // 重新載入用戶文章
    const userArticles = loadUserArticlesForDelete();
    if (typeof personalArticles !== 'undefined') {
        personalArticles = userArticles;
    }

    const activeTab = personalPage.querySelector('.feed-tab.active');
    if (!activeTab) return;

    const tabText = activeTab.textContent.trim();
    let articlesToShow = [];

    switch (tabText) {
        case '我的文章':
            articlesToShow = userArticles.filter(a => a.category === 'my');
            break;
        case '已保存':
            articlesToShow = userArticles.filter(a => a.category === 'saved');
            break;
        case '草稿':
            articlesToShow = userArticles.filter(a => a.category === 'draft');
            break;
        default:
            articlesToShow = userArticles;
    }

    if (typeof renderArticles === 'function') {
        renderArticles('personal-articles', articlesToShow);
    }
}

// 關閉文章詳情彈窗
function closeArticleModalIfOpen() {
    const articleModal = document.getElementById('articleModal');
    if (articleModal && articleModal.classList.contains('active')) {
        articleModal.classList.remove('active');
    }
}

// 渲染文章時加入刪除按鈕
function renderArticlesWithDelete(containerID, articleData) {
    const container = document.getElementById(containerID);
    if (!container) return;

    if (!articleData || articleData.length === 0) {
        container.innerHTML = '<div class="no-articles">目前沒有文章</div>';
        return;
    }

    let articlesHTML = '';

    articleData.forEach(article => {
        // 只有「我的文章」和「草稿」可以刪除
        const canDelete = article.category === 'my' || article.category === 'draft';

        const deleteButtonHTML = canDelete ? `
            <button class="action-button delete-btn" 
                    title="刪除" 
                    onclick="event.stopPropagation(); confirmDeleteArticle(${article.id}, '${article.title.replace(/'/g, "\\'")}')">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                刪除
            </button>
        ` : '';

        articlesHTML += `
            <div class="article-card" data-article-id="${article.id}">
                <img src="${article.image}" alt="${article.title}" class="article-image">
                <div class="article-content">
                    <div class="article-meta">
                        <img src="${article.author.avatar}" alt="${article.author.name}" class="author-avatar">
                        <span>${article.author.name} · ${article.date}</span>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt}</p>
                    <div class="article-tags">
                        ${article.tags ? article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('') : ''}
                    </div>
                    <div class="article-actions">
                        <button class="action-button" title="讚">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            ${article.likes || 0}
                        </button>
                        <button class="action-button" title="評論">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.99,4c0-1.1-0.89-2-1.99-2H4C2.9,2,2,2.9,2,4v12c0,1.1,0.9,2,2,2h14l4,4L21.99,4z M18,14H6v-2h12V14z M18,11H6V9h12V11z M18,8H6V6h12V8z"></path>
                            </svg>
                            ${article.comments || 0}
                        </button>
                        <button class="action-button" title="分享">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18,16.08c-0.76,0-1.44,0.3-1.96,0.77L8.91,12.7C8.96,12.47,9,12.24,9,12s-0.04-0.47-0.09-0.7l7.05-4.11C16.5,7.69,17.21,8,18,8c1.66,0,3-1.34,3-3s-1.34-3-3-3s-3,1.34-3,3c0,0.24,0.04,0.47,0.09,0.7L8.04,9.81C7.5,9.31,6.79,9,6,9c-1.66,0-3,1.34-3,3s1.34,3,3,3c0.79,0,1.5-0.31,2.04-0.81l7.12,4.16c-0.05,0.21-0.08,0.43-0.08,0.65c0,1.61,1.31,2.92,2.92,2.92s2.92-1.31,2.92-2.92C20.92,17.39,19.61,16.08,18,16.08z"></path>
                            </svg>
                            ${article.shares || 0}
                        </button>
                        <button class="action-button" title="收藏">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17,3H7C5.9,3,5,3.9,5,5v16l7-3l7,3V5C19,3.9,18.1,3,17,3z"></path>
                            </svg>
                            收藏
                        </button>
                        ${deleteButtonHTML}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = articlesHTML;
}

// 頁面載入後，覆寫 renderArticles 函數
document.addEventListener('DOMContentLoaded', function () {
    // 等待主程式載入完成
    setTimeout(function () {
        const originalRenderArticles = window.renderArticles;

        window.renderArticles = function (containerID, articleData) {
            if (containerID === 'personal-articles') {
                renderArticlesWithDelete(containerID, articleData);
            } else {
                if (originalRenderArticles) {
                    originalRenderArticles(containerID, articleData);
                }
            }
        };

        console.log('✅ 刪除文章功能已載入');
    }, 100);
});