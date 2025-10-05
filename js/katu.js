function encodeImagePath(path) {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

const folderSelect = document.getElementById('folder-select');
const subfolderGroup = document.getElementById('subfolder-group');
const subfolderSelect = document.getElementById('subfolder-select');
const imageDisplay = document.getElementById('image-display');
const searchInput = document.getElementById('search-input');

// 页面加载时获取文件夹列表
window.addEventListener('DOMContentLoaded', function() {
    loadFolderList();
});

folderSelect.addEventListener('change', function() {
    const folder = this.value;
    if (folder) {
        handleFolderSelection(folder);
    } else {
        subfolderGroup.style.display = 'none';
        imageDisplay.innerHTML = '<div class="no-images">请先选择主文件夹</div>';
    }
});

subfolderSelect.addEventListener('change', function() {
    const folder = folderSelect.value;
    const subfolder = this.value;
    if (folder) {
        if (subfolder === '__direct__') {
            displayDirectImages(folder);
        } else {
            displayImages(folder, subfolder);
        }
    } else {
        imageDisplay.innerHTML = '<div class="no-images">请选择子文件夹</div>';
    }
});

// 添加搜索功能
searchInput.addEventListener('input', function() {
    const keyword = this.value.trim();
    if (keyword.length > 0) {
        searchImages(keyword);
    } else {
        // 如果搜索框为空，恢复原始选择状态
        const folder = folderSelect.value;
        const subfolder = subfolderSelect.value;
        
        if (folder && subfolder) {
            if (subfolder === '__direct__') {
                displayDirectImages(folder);
            } else {
                displayImages(folder, subfolder);
            }
        } else if (folder) {
            handleFolderSelection(folder);
        } else {
            imageDisplay.innerHTML = '<div class="no-images">请先选择文件夹</div>';
        }
    }
});

// 加载文件夹列表
async function loadFolderList() {
    try {
        const response = await fetch('data/newimages2.json');
        if (!response.ok) {
            throw new Error('data/newimages2.json 网络响应错误');
        }
        const imagesData = await response.json();
        
        // 清空现有选项
        folderSelect.innerHTML = '<option value="">请选择...</option>';
        
        // 提取所有主文件夹名称，忽略"卡图"前缀
        const folders = new Set();
        imagesData.forEach(imagePath => {
            const parts = imagePath.split('/');
            // 忽略第一层"卡图"文件夹，从第二层开始处理
            if (parts.length > 2 && parts[1] === '卡图') {
                folders.add(parts[2]); // 第三个部分是主文件夹名
            }
        });
        
        // 添加文件夹选项
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            folderSelect.appendChild(option);
        });
        
        if (folders.size === 0) {
            imageDisplay.innerHTML = '<div class="no-images">未找到主文件夹</div>';
        }
        
    } catch (error) {
        console.error('加载文件夹列表出错:', error);
        imageDisplay.innerHTML = '<div class="no-images">加载文件夹列表失败</div>';
    }
}

// 处理文件夹选择
function handleFolderSelection(folder) {
    fetch('data/newimages2.json')
        .then(response => response.json())
        .then(imagesData => {
            // 获取该文件夹下的所有路径，过滤出"卡图"目录下的路径
            const folderPaths = imagesData.filter(imagePath => {
                const parts = imagePath.split('/');
                return parts.length > 2 && parts[1] === '卡图' && parts[2] === folder;
            });
            
            // 分析文件夹结构
            const subfolders = new Set();
            const directImages = [];
            
            folderPaths.forEach(imagePath => {
                const parts = imagePath.split('/');
                if (parts.length === 4) {
                    // 直接在主文件夹下的图片 (卡图/主文件夹/图片)
                    directImages.push(imagePath);
                } else if (parts.length > 4) {
                    // 子文件夹 (卡图/主文件夹/子文件夹/...)
                    subfolders.add(parts[3]);
                }
            });
            
            // 根据结构决定显示方式
            if (subfolders.size > 0) {
                // 有子文件夹，显示子文件夹下拉框
                subfolderGroup.style.display = 'block';
                updateSubfolderOptions(subfolders, directImages.length > 0);
                
                // 如果同时有直接图片和子文件夹，先显示直接图片
                if (directImages.length > 0) {
                    renderImages(directImages);
                } else {
                    imageDisplay.innerHTML = '<div class="no-images">请选择子文件夹</div>';
                }
            } else if (directImages.length > 0) {
                // 没有子文件夹，直接显示图片
                subfolderGroup.style.display = 'none';
                renderImages(directImages);
            } else {
                // 没有内容
                subfolderGroup.style.display = 'none';
                imageDisplay.innerHTML = '<div class="no-images">该文件夹中暂无图片</div>';
            }
        })
        .catch(error => {
            console.error('处理文件夹选择出错:', error);
            imageDisplay.innerHTML = '<div class="no-images">加载内容失败</div>';
        });
}

// 更新子文件夹选项
function updateSubfolderOptions(subfolders, hasDirectImages) {
    subfolderSelect.innerHTML = '<option value="">请选择...</option>';
    
    // 如果有直接图片，添加"直接图片"选项
    if (hasDirectImages) {
        const directOption = document.createElement('option');
        directOption.value = '__direct__';
        directOption.textContent = '直接图片';
        subfolderSelect.appendChild(directOption);
    }
    
    subfolders.forEach(subfolder => {
        const option = document.createElement('option');
        option.value = subfolder;
        option.textContent = subfolder;
        subfolderSelect.appendChild(option);
    });
}

// 显示主文件夹中的直接图片
async function displayDirectImages(folder) {
    imageDisplay.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const response = await fetch('data/newimages2.json');
        if (!response.ok) {
            throw new Error('data/newimages2.json 网络响应错误');
        }
        const imagesData = await response.json();
        
        // 筛选主文件夹中的直接图片
        const filteredImages = imagesData.filter(imagePath => {
            const parts = imagePath.split('/');
            return parts.length === 4 && parts[1] === '卡图' && parts[2] === folder;
        });
        
        if (filteredImages.length === 0) {
            imageDisplay.innerHTML = '<div class="no-images">该文件夹中暂无直接图片</div>';
            return;
        }
        
        renderImages(filteredImages);
        
    } catch (error) {
        console.error('加载图片出错:', error);
        imageDisplay.innerHTML = '<div class="no-images">加载图片失败</div>';
    }
}

// 显示特定子文件夹中的图片
async function displayImages(folder, subfolder) {
    imageDisplay.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const response = await fetch('data/newimages2.json');
        if (!response.ok) {
            throw new Error('data/newimages2.json 网络响应错误');
        }
        const imagesData = await response.json();
        
        // 筛选指定文件夹中的图片
        const filteredImages = imagesData.filter(imagePath => {
            const parts = imagePath.split('/');
            return parts.length > 3 && parts[1] === '卡图' && parts[2] === folder && parts[3] === subfolder;
        });
        
        if (filteredImages.length === 0) {
            imageDisplay.innerHTML = '<div class="no-images">该文件夹中暂无图片</div>';
            return;
        }
        
        renderImages(filteredImages);
        
    } catch (error) {
        console.error('加载图片出错:', error);
        imageDisplay.innerHTML = '<div class="no-images">加载图片失败</div>';
    }
}

// 根据关键词搜索图片
async function searchImages(keyword) {
    imageDisplay.innerHTML = '<div class="loading">搜索中...</div>';
    
    try {
        const response = await fetch('data/newimages2.json');
        if (!response.ok) {
            throw new Error('data/newimages2.json 网络响应错误');
        }
        const imagesData = await response.json();
        
        const searchResults = [];
        const searchKeyword = keyword.toLowerCase();
        
        imagesData.forEach(imagePath => {
            const parts = imagePath.split('/');
            // 只搜索"卡图"目录下的文件
            if (parts.length > 2 && parts[1] === '卡图') {
                const fileName = imagePath.split('/').pop().toLowerCase();
                if (fileName.includes(searchKeyword)) {
                    searchResults.push(imagePath);
                }
            }
        });
        
        if (searchResults.length === 0) {
            imageDisplay.innerHTML = '<div class="no-images">未找到匹配的图片</div>';
            return;
        }
        
        renderImages(searchResults);
    } catch (error) {
        console.error('搜索图片出错:', error);
        imageDisplay.innerHTML = '<div class="no-images">搜索图片失败</div>';
    }
}

// 渲染图片列表（移除懒加载）
function renderImages(images) {
    let html = '<div class="image-container">';
    images.forEach(imagePath => {
        // 对整个路径进行编码以支持中文
        const encodedImagePath = encodeImagePath(imagePath);
        const fileName = imagePath.split('/').pop();
        const displayName = fileName;
        
        // 对文件名进行编码用于下载
        const encodedFileName = encodeURIComponent(fileName);
        
        // 判断是否为大文件（这里简单地以文件名长度或特定后缀判断，实际可以根据需要调整）
        const isLargeFile = fileName.length > 20 || fileName.includes('_large') || fileName.includes('_hq');
        
        html += `
            <div class="image-item">
                <img src="${encodedImagePath}" 
                     alt="${displayName}" 
                     data-url="${encodedImagePath}"
                     data-filename="${encodedFileName}">
                ${isLargeFile ? '<p style="color: red; font-size: 12px; text-align: center; margin: 2px 0;">文件较大加载较慢</p>' : ''}
                <div class="image-name">${displayName}</div>
            </div>
        `;
    });
    html += '</div>';
    
    imageDisplay.innerHTML = html;
    
    // 为所有图片添加触摸事件
    document.querySelectorAll('.image-item img').forEach(img => {
        new ImageTouchHandler(img);
    });
}

// 图片触摸处理类
class ImageTouchHandler {
    constructor(element) {
        this.element = element;
        this.touchStartTime = 0;
        this.touchTimer = null;
        this.touchHandled = false;
        
        this.init();
    }
    
    init() {
        // 添加触摸事件监听器
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.element.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }
    
    handleTouchStart(event) {
        this.touchStartTime = Date.now();
        this.touchHandled = false;
        clearTimeout(this.touchTimer);
        
        // 长按800ms后触发下载
        this.touchTimer = setTimeout(() => {
            if (!this.touchHandled) {
                this.downloadImage();
                this.touchHandled = true;
            }
        }, 800);
        
        // 阻止默认行为和事件冒泡
        // 注意：不要完全阻止，否则可能影响长按菜单
        // event.preventDefault();
        // event.stopPropagation();
    }
    
    handleTouchMove(event) {
        // 如果用户移动手指，取消长按下载
        clearTimeout(this.touchTimer);
        this.touchHandled = true;
    }
    
    handleTouchEnd(event) {
        // 如果用户提前结束触摸，取消长按下载
        clearTimeout(this.touchTimer);
        this.touchHandled = true;
    }
    
    handleContextMenu(event) {
        // 右键菜单触发下载
        event.preventDefault();
        this.downloadImage();
    }
    
    downloadImage() {
        const url = this.element.dataset.url;
        const filename = decodeURIComponent(this.element.dataset.filename);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}