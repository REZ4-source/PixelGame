// ============================================================
// دیتا
// ============================================================
let gameMetadata = null;
let gameReleases = null;
let allGames = [];

// ============================================================
// لودینگ بین صفحات
// ============================================================
const loadingOverlay = document.getElementById('loadingOverlay');
let loadingTimeout = null;

function showLoading() {
  if (loadingOverlay.classList.contains('show')) return;
  loadingOverlay.classList.remove('loading-fade-out');
  loadingOverlay.classList.add('show');
}

function hideLoading() {
  loadingOverlay.classList.add('loading-fade-out');
  clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => {
    loadingOverlay.classList.remove('show', 'loading-fade-out');
  }, 300);
}

// ============================================================
// بارگذاری دیتا
// ============================================================
async function loadGames() {
  try {
    const [metaRes, releaseRes] = await Promise.all([
      fetch('data/games-metadata.json'),
      fetch('data/games-releases.json')
    ]);
    
    if (!metaRes.ok || !releaseRes.ok) {
      throw new Error('فایل دیتا پیدا نشد');
    }
    
    gameMetadata = await metaRes.json();
    gameReleases = await releaseRes.json();
    
    if (!gameMetadata || !gameMetadata.games || gameMetadata.games.length === 0) {
      throw new Error('دیتای متادیتا خالی است');
    }
    
    if (!gameReleases || !gameReleases.releases || gameReleases.releases.length === 0) {
      throw new Error('دیتای ریلیز خالی است');
    }
    
    allGames = gameMetadata.games.map(game => {
      const releases = gameReleases.releases.filter(r => r.gameId === game.id);
      const latestRelease = releases.find(r => r.isLatest) || releases[0] || {};
      
      return {
        ...game,
        releases: releases,
        latestVersion: latestRelease?.version || '--',
        fileSize: latestRelease?.fileSize || '--',
        updateDate: latestRelease?.updateDate || game.releaseDate || '--',
        specText: game.specText || 'مشخصات فنی این بازی در دسترس نیست.'
      };
    });
    
    console.log('✅ دیتا بارگذاری شد:', allGames.length, 'بازی');
    renderHomePage();
    
  } catch (error) {
    console.error('❌ خطا در بارگذاری دیتا:', error);
    
    const heroSlider = document.getElementById('heroSlider');
    if (heroSlider) {
      heroSlider.innerHTML = `
        <div class="hero-slide" style="min-height:250px; display:flex; align-items:center; justify-content:center; background:var(--surface); border:1px solid var(--border); border-radius:20px;">
          <div style="text-align:center; padding:30px; color:var(--muted);">
            <div style="font-size:40px; margin-bottom:15px;">⚠️</div>
            <h3 style="color:var(--text); margin-bottom:8px;">خطا در بارگذاری دیتا</h3>
            <p style="font-size:13px; max-width:400px; margin:0 auto;">
              لطفاً فایل‌های JSON را بررسی کنید:<br>
              <span style="font-size:11px; color:var(--muted);">data/games-metadata.json و data/games-releases.json</span>
            </p>
            <p style="font-size:12px; margin-top:12px; color:var(--magenta);">${error.message}</p>
          </div>
        </div>
      `;
    }
    
    hideLoading();
  }
}

// ============================================================
// رندر صفحه اصلی
// ============================================================
function renderHomePage() {
  if (!allGames || allGames.length === 0) {
    console.warn('هیچ بازی‌ای برای رندر وجود ندارد');
    return;
  }
  
  const featuredGames = allGames.filter(g => g.isFeatured);
  const newGames = allGames.filter(g => g.isNew);
  const trendingGames = allGames.filter(g => g.isTrending);
  
  // ===== هیرو اسلایدر =====
  const heroSlider = document.getElementById('heroSlider');
  if (heroSlider && featuredGames.length > 0) {
    heroSlider.innerHTML = featuredGames.map(game => {
      const shortDesc = game.description && game.description.length > 60 
        ? game.description.substring(0, 60) + '...' 
        : game.description || 'بدون توضیحات';
      
      const coverStyle = game.coverImage 
        ? `background-image: url('${game.coverImage}'); background-size: cover; background-position: center;` 
        : `background-image: linear-gradient(160deg,#2a1f3d,#171325);`;
      
      let badge = 'FEATURED';
      if (game.isNew && game.isTrending) badge = 'NEW & HOT';
      else if (game.isNew) badge = 'NEW RELEASE';
      else if (game.isTrending) badge = 'TRENDING';
      else if (game.isFeatured) badge = 'EDITOR\'S PICK';
      
      return `
      <a class="hero-slide" href="#" style="${coverStyle}" onclick="goDetail('${game.id}'); return false;">
        <span class="hero-eyebrow pixel">${badge}</span>
        <h1 class="hero-title">${game.title || 'بدون عنوان'}</h1>
        <p class="hero-sub">${shortDesc}</p>
        <span class="hero-cta">
          دانلود بازی
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </a>
    `}).join('');
    
    // ===== دات‌ها =====
    const dots = document.getElementById('heroDots');
    if (dots) {
      dots.innerHTML = featuredGames.map((_, i) => 
        `<span class="${i === 0 ? 'active' : ''}"></span>`
      ).join('');
    }
  }
  
  // ===== تازه‌ترین بازی‌ها =====
  const latestGames = [...allGames].sort((a, b) => 
    new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)
  ).slice(0, 6);
  
  const latestRail = document.getElementById('latestGames');
  if (latestRail) {
    latestRail.innerHTML = renderCartItems(latestGames);
  }
  
  // ===== بازی‌های جدید =====
  const newRail = document.getElementById('newGames');
  if (newRail) {
    newRail.innerHTML = renderCartItems(newGames.slice(0, 6));
  }
  
  // ===== پربازدیدترین‌ها =====
  const trendingGrid = document.getElementById('trendingGames');
  if (trendingGrid) {
    const sortedTrending = [...trendingGames].sort((a, b) => {
      const downloadsA = parseInt((a.downloads || '0').replace(/[^0-9]/g, ''));
      const downloadsB = parseInt((b.downloads || '0').replace(/[^0-9]/g, ''));
      return downloadsB - downloadsA;
    }).slice(0, 3);
    
    while (sortedTrending.length < 3) {
      const fallback = allGames.find(g => !sortedTrending.includes(g));
      if (fallback) sortedTrending.push(fallback);
      else break;
    }
    
    const rankClasses = ['silver', 'gold', 'bronze'];
    
    trendingGrid.innerHTML = `
      <div class="trending-wrapper">
        ${sortedTrending.map((game, index) => {
          let rank, rankClass, isCenter;
          
          if (index === 0) {
            rank = 2;
            rankClass = 'silver';
            isCenter = false;
          } else if (index === 1) {
            rank = 1;
            rankClass = 'gold';
            isCenter = true;
          } else {
            rank = 3;
            rankClass = 'bronze';
            isCenter = false;
          }
          
          let thumbHtml = '';
          if (game.icon && game.icon.startsWith('http')) {
            thumbHtml = `<img src="${game.icon}" alt="${game.title}">`;
          } else {
            thumbHtml = game.icon || '🎮';
          }
          
          return `
            <div class="trending-item ${isCenter ? 'center' : ''}" onclick="goDetail('${game.id}')">
              <div class="trending-rank ${rankClass}">#${rank}</div>
              <div class="trending-thumb">
                ${thumbHtml}
                ${game.isNew ? `<span class="badge">جدید</span>` : ''}
              </div>
              <div class="trending-info">
                <h3>${game.title || 'بدون عنوان'}</h3>
                <div class="meta">${game.downloads || '0'}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  renderUpdates();
}

// ============================================================
// هیرو اسلایدر (فقط دستی)
// ============================================================
function updateDots(index) {
  const dots = document.querySelectorAll('#heroDots span');
  if (dots.length === 0) return;
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === index);
  });
}

// ===== اسکرول دستی هیرو =====
const heroSlider = document.getElementById('heroSlider');
if (heroSlider) {
  heroSlider.addEventListener('scroll', function() {
    const slideWidth = this.clientWidth;
    const index = Math.round(this.scrollLeft / slideWidth);
    const totalSlides = this.querySelectorAll('.hero-slide').length;
    
    if (index >= 0 && index < totalSlides) {
      updateDots(index);
    }
  });
}

// ===== دات اول رو فعال کن =====
setTimeout(() => {
  updateDots(0);
}, 300);

// ============================================================
// رندر آیتم‌های کارت
// ============================================================
function renderCartItems(games) {
  if (!games || games.length === 0) {
    return '<p style="color:var(--muted); padding:20px;">هیچ بازی‌ای موجود نیست</p>';
  }
  
  return games.map(game => `
    <a class="cart" onclick="goDetail('${game.id}'); return false;">
      <div class="cart-thumb">
        ${game.icon && game.icon.startsWith('http') 
          ? `<img src="${game.icon}" alt="${game.title}" style="width:100%; height:100%; object-fit:cover;">` 
          : game.icon || '🎮'}
        ${game.isNew ? `<span class="badge">جدید</span>` : ''}
      </div>
      <div class="cart-body">
        <span class="tag">${game.category || ''}</span>
        <h3>${game.title || 'بدون عنوان'}</h3>
        <div class="cart-meta"><span class="mono">${game.os || '--'}</span><span class="mono">${game.latestVersion || '--'}</span></div>
      </div>
    </a>
  `).join('');
}

// ============================================================
// رندر آپدیت‌های بازی‌ها
// ============================================================
function renderUpdates() {
  const updatesContainer = document.getElementById('updatesContainer');
  if (!updatesContainer) return;
  
  const gamesWithUpdates = allGames
    .filter(game => game.updates && game.updates.length > 0)
    .slice(0, 3);
  
  if (gamesWithUpdates.length === 0) {
    updatesContainer.innerHTML = `
      <div class="update-row">
        <div class="update-thumb">🏍️</div>
        <div class="update-info">
          <h3>Dirt Bike Racing</h3>
          <span class="mono">نسخه ۲.۴.۱ · بهبود عملکرد و رفع باگ</span>
        </div>
        <button class="update-btn" onclick="goDetail('runeborn')">بروزرسانی</button>
      </div>
      <div class="update-row">
        <div class="update-thumb">😱</div>
        <div class="update-info">
          <h3>Scary House</h3>
          <span class="mono">نسخه ۱.۹.۰ · مرحله‌های جدید اضافه شد</span>
        </div>
        <button class="update-btn" onclick="goDetail('painthide')">بروزرسانی</button>
      </div>
      <div class="update-row">
        <div class="update-thumb">💘</div>
        <div class="update-info">
          <h3>Pixel Love Story</h3>
          <span class="mono">نسخه ۳.۱.۲ · فصل تازه داستان</span>
        </div>
        <button class="update-btn" onclick="goDetail('hypnospace')">بروزرسانی</button>
      </div>
    `;
    return;
  }
  
  updatesContainer.innerHTML = gamesWithUpdates.map(game => {
    const latestUpdate = game.updates[0];
    
    let thumbHtml = '';
    if (game.icon && game.icon.startsWith('http')) {
      thumbHtml = `<img src="${game.icon}" alt="${game.title}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    } else {
      thumbHtml = game.icon || '🎮';
    }
    
    return `
      <div class="update-row">
        <div class="update-thumb">${thumbHtml}</div>
        <div class="update-info">
          <h3>${game.title}</h3>
          <span class="mono">نسخه ${latestUpdate.version} · ${latestUpdate.description}</span>
        </div>
        <button class="update-btn" onclick="goDetail('${game.id}')">بروزرسانی</button>
      </div>
    `;
  }).join('');
}

// ============================================================
// رندر صفحه جزئیات
// ============================================================
function renderDetailPage(gameId) {
  const game = allGames.find(g => g.id === gameId);
  if (!game) {
    console.error('بازی پیدا نشد:', gameId);
    return;
  }
  
  const iconElement = document.getElementById('detailIcon');
  if (game.icon && game.icon.startsWith('http')) {
    iconElement.innerHTML = `<img src="${game.icon}" alt="${game.title}" style="width:100%; height:100%; object-fit:cover; border-radius:22px;">`;
    iconElement.style.backgroundImage = 'none';
  } else {
    iconElement.textContent = game.icon || '🎮';
    iconElement.style.backgroundImage = 'none';
  }
  
  document.getElementById('detailTitle').textContent = game.title || 'بدون عنوان';
  document.getElementById('detailDev').textContent = game.developer || '--';
  
  const chipRow = document.getElementById('detailChips');
  chipRow.innerHTML = '';
  if (game.genre && game.genre.length > 0) {
    game.genre.forEach(g => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = g;
      chipRow.appendChild(chip);
    });
  }
  
  document.getElementById('statRating').textContent = game.rating || '--';
  document.getElementById('statSize').textContent = game.fileSize || '--';
  document.getElementById('statDownloads').textContent = game.downloads || '--';
  document.getElementById('statOS').textContent = game.os || '--';
  
  const shotsRail = document.getElementById('detailShots');
  shotsRail.innerHTML = '';
  if (game.screenshots && game.screenshots.length > 0) {
    game.screenshots.forEach(s => {
      const div = document.createElement('div');
      div.className = 'shot';
      if (s.startsWith('http')) {
        div.innerHTML = `<img src="${s}" alt="اسکرین‌شات" style="width:100%; height:100%; object-fit:cover; border-radius:14px;">`;
      } else {
        div.textContent = s;
      }
      shotsRail.appendChild(div);
    });
  }
  
  document.getElementById('detailDesc').textContent = game.description || 'توضیحاتی موجود نیست';
  document.getElementById('specText').innerHTML = game.specText || 'مشخصات فنی این بازی در دسترس نیست.';
  
  renderDownloadOptions(game);
  
  const infoTable = document.getElementById('detailInfo');
  infoTable.innerHTML = '';
  const infoFields = [
    ['نسخه', game.latestVersion || '--'],
    ['تاریخ انتشار', game.releaseDate || '--'],
    ['حداقل اندروید', game.os || '--'],
    ['حجم دانلود', game.fileSize || '--'],
    ['زبان', game.language || '--']
  ];
  infoFields.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'info-row';
    row.innerHTML = `<span>${label}</span><span>${value}</span>`;
    infoTable.appendChild(row);
  });
  
  const related = allGames.filter(g => g.id !== game.id && g.category === game.category).slice(0, 6);
  const relatedRail = document.getElementById('detailRelated');
  relatedRail.innerHTML = '';
  if (related.length === 0) {
    relatedRail.innerHTML = '<p style="color:var(--muted); padding:10px;">هیچ بازی مشابهی یافت نشد</p>';
  } else {
    relatedRail.innerHTML = renderCartItems(related);
  }
}

// ============================================================
// رندر گزینه‌های دانلود
// ============================================================
function renderDownloadOptions(game) {
  const dlOptions = document.getElementById('dlOptions');
  if (!dlOptions) return;
  
  dlOptions.innerHTML = '';
  
  const releases = game.releases || [];
  
  if (releases.length === 0) {
    dlOptions.innerHTML = '<p style="padding:14px; color:var(--muted);">هیچ نسخه‌ای برای دانلود موجود نیست</p>';
    return;
  }
  
  releases.forEach((rel, index) => {
    const div = document.createElement('div');
    div.className = 'dl-option';
    div.id = `dlOption${index + 1}`;
    
    const badge = document.createElement('div');
    badge.className = `dl-option-badge ${rel.type || 'main'}`;
    badge.style.fontSize = '9px';
    badge.style.fontWeight = '800';
    
    let badgeText = 'APK';
    if (rel.type === 'mod') badgeText = 'MOD';
    else if (rel.type === 'data') badgeText = 'OBB';
    else if (rel.type === 'main') badgeText = 'APK';
    
    badge.textContent = badgeText;
    div.appendChild(badge);
    
    const info = document.createElement('div');
    info.className = 'dl-option-info';
    
    const row1 = document.createElement('div');
    row1.className = 'row1';
    const b = document.createElement('b');
    let fileName = rel.fileName || rel.type || 'فایل';
    if (rel.type === 'main' && !rel.fileName) fileName = 'نسخه اصلی';
    else if (rel.type === 'mod' && !rel.fileName) fileName = 'نسخه مود شده';
    else if (rel.type === 'data' && !rel.fileName) fileName = 'فایل دیتا';
    b.textContent = fileName;
    row1.appendChild(b);
    
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = rel.fileSize || '--';
    row1.appendChild(pill);
    info.appendChild(row1);
    
    const meta = document.createElement('span');
    meta.className = 'meta mono';
    meta.textContent = rel.version || '--';
    info.appendChild(meta);
    
    div.appendChild(info);
    
    const btn = document.createElement('a');
    btn.className = 'dl-option-btn';
    const link = rel.downloadLink || '#';
    btn.href = link;
    btn.target = '_blank';
    btn.onclick = function(e) { return downloadClicked(e, this); };
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    div.appendChild(btn);
    
    dlOptions.appendChild(div);
  });
}

// ============================================================
// صفحه‌بندی با کنترل برگشت
// ============================================================
let isDetailPage = false;

function showPage(pageId) {
  showLoading();
  
  setTimeout(() => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    hideLoading();
    
    const navBtn = document.getElementById('navBtn');
    const smallNavBtn = document.getElementById('navBtnSmall');
    
    if (pageId === 'page-home') {
      const menuIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      navBtn.innerHTML = menuIcon;
      navBtn.onclick = goHome;
      
      if (smallNavBtn) {
        smallNavBtn.innerHTML = menuIcon;
        smallNavBtn.onclick = goHome;
      }
      
      history.go(-(history.state?.page === 'detail' ? 1 : 0));
      history.replaceState({ page: 'home' }, '');
      isDetailPage = false;
      
    } else {
      const backIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      navBtn.innerHTML = backIcon;
      navBtn.onclick = goHome;
      
      if (smallNavBtn) {
        smallNavBtn.innerHTML = backIcon;
        smallNavBtn.onclick = goHome;
      }
      
      if (!isDetailPage) {
        history.pushState({ page: 'detail' }, '');
        isDetailPage = true;
      }
    }
  }, 300);
}

function goHome() {
  showPage('page-home');
  const slider = document.getElementById('heroSlider');
  if (slider) slider.scrollLeft = 0;
}

function goDetail(gameId) {
  showPage('page-detail');
  renderDetailPage(gameId);
}

// ============================================================
// کنترل دکمه برگشت گوشی (Back Button)
// ============================================================
window.addEventListener('popstate', function(event) {
  if (document.getElementById('page-detail').classList.contains('active')) {
    goHome();
  }
});

// ============================================================
// دکمه مشخصات / دانلود فایل
// ============================================================
let specMode = false;

function toggleSpecs() {
  const btn = document.getElementById('specToggle');
  const content = document.getElementById('specContent');
  const options = document.querySelectorAll('.dl-option');
  
  specMode = !specMode;
  
  if (specMode) {
    content.classList.add('show');
    btn.textContent = 'دانلود فایل';
    btn.classList.add('active');
    options.forEach(opt => opt.style.display = 'none');
  } else {
    content.classList.remove('show');
    btn.textContent = 'مشخصات';
    btn.classList.remove('active');
    options.forEach(opt => opt.style.display = 'flex');
  }
}

// ============================================================
// کلیک روی دکمه دانلود
// ============================================================
function downloadClicked(event, btn) {
  event.preventDefault();
  
  const option = btn.closest('.dl-option');
  const meta = option.querySelector('.meta');
  const originalText = meta ? meta.textContent : '';
  let link = btn.href;
  
  if (link === '#' || link === '' || link === window.location.href) {
    if (meta) {
      meta.textContent = '⚠️ لینک دانلود در دسترس نیست';
      meta.style.color = 'var(--magenta)';
      setTimeout(() => {
        meta.textContent = originalText;
        meta.style.color = 'var(--muted)';
      }, 2000);
    }
    return false;
  }
  
  btn.style.transform = 'scale(0.9)';
  setTimeout(() => { btn.style.transform = 'scale(1)'; }, 150);
  
  if (meta) {
    meta.textContent = '⏳ شروع دانلود...';
    meta.style.color = 'var(--cyan)';
  }
  
  try {
    link = encodeURI(link);
  } catch(e) {
    console.log('لینک مشکل داره:', e);
  }
  
  console.log('لینک دانلود:', link);
  window.location.href = link;
  
  setTimeout(() => {
    if (meta) {
      meta.textContent = originalText;
      meta.style.color = 'var(--muted)';
    }
  }, 3000);
  
  return false;
}

// ============================================================
// توضیحات بیشتر/بستن
// ============================================================
function toggleDesc(el) {
  const p = el.previousElementSibling;
  p.classList.toggle('clamp');
  el.innerHTML = p.classList.contains('clamp') 
    ? 'ادامه مطلب <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    : 'بستن <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}

// ============================================================
// هدر و سرچ هنگام اسکرول
// ============================================================
const header = document.querySelector('header');
const searchWrap = document.querySelector('.search-wrap');
let isHeaderHidden = false;
let isSmallHeaderShown = false;

const smallHeader = document.createElement('header');
smallHeader.className = 'small-header';
smallHeader.innerHTML = `
  <div class="header-row">
    <button class="menu-btn" id="navBtnSmall" aria-label="منو" onclick="goHome()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <div class="header-spacer"></div>
    <div class="header-logo" onclick="goHome()">
      <span><b>Pixel</b>Game</span>
    </div>
  </div>
`;
smallHeader.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 49;
  transform: translateY(-100%);
  transition: transform 0.3s ease, opacity 0.3s ease;
  opacity: 0;
  pointer-events: none;
  background: rgba(18,15,28,0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  padding: 8px 18px;
`;
document.body.prepend(smallHeader);

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;

  if (currentScrollY > 80 && !isHeaderHidden) {
    isHeaderHidden = true;
    
    header.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    header.style.transform = 'translateY(-100%)';
    header.style.opacity = '0';
    header.style.pointerEvents = 'none';
  }

  if (currentScrollY > 150 && !isSmallHeaderShown) {
    isSmallHeaderShown = true;
    
    smallHeader.style.transform = 'translateY(0)';
    smallHeader.style.opacity = '1';
    smallHeader.style.pointerEvents = 'auto';
  }

  if (currentScrollY < 150 && isSmallHeaderShown) {
    isSmallHeaderShown = false;
    
    smallHeader.style.transform = 'translateY(-100%)';
    smallHeader.style.opacity = '0';
    smallHeader.style.pointerEvents = 'none';
  }

  if (currentScrollY < 80 && isHeaderHidden) {
    isHeaderHidden = false;
    
    header.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    header.style.transform = 'translateY(0)';
    header.style.opacity = '1';
    header.style.pointerEvents = 'auto';
    
    searchWrap.style.transition = 'opacity 0.3s ease, transform 0.3s ease, margin-top 0.3s ease, max-height 0.3s ease, padding 0.3s ease';
    searchWrap.style.opacity = '1';
    searchWrap.style.transform = 'translateY(0)';
    searchWrap.style.pointerEvents = 'auto';
    searchWrap.style.marginTop = '14px';
    searchWrap.style.maxHeight = '60px';
    searchWrap.style.padding = '11px 14px';
    searchWrap.style.overflow = 'visible';
  }
});

// ============================================================
// قابلیت جستجو با نتایج (فقط انگلیسی - با لودینگ)
// ============================================================
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchList = document.getElementById('searchList');
const searchLoading = document.getElementById('searchLoading');
const searchEmpty = document.getElementById('searchEmpty');
let searchTimeout = null;

function isEnglish(text) {
  return /^[a-zA-Z0-9\s]+$/.test(text);
}

function showHintMessage() {
  const existingHint = document.querySelector('.search-hint');
  if (!existingHint) {
    const hint = document.createElement('div');
    hint.className = 'search-hint';
    hint.innerHTML = `
      <img src="icons/icon-english-hint.svg" width="56" height="56" alt="English hint">
      <p>لطفاً اسم بازی را به انگلیسی وارد کنید</p>
      <span>مثال: Call of Duty</span>
    `;
    hint.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 30px 20px;
      color: var(--muted);
      text-align: center;
    `;
    searchResults.appendChild(hint);
  }
}

function removeHintMessage() {
  const hint = document.querySelector('.search-hint');
  if (hint) hint.remove();
}

searchInput.addEventListener('focus', function() {
  const query = this.value.trim();
  if (query.length > 0 && isEnglish(query)) {
    searchResults.classList.add('active');
    performSearch(query);
  } else if (query.length > 0 && !isEnglish(query)) {
    searchResults.classList.add('active');
    searchLoading.classList.remove('active');
    searchList.classList.remove('active');
    searchEmpty.classList.remove('active');
    showHintMessage();
  }
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-wrap')) {
    searchResults.classList.remove('active');
    removeHintMessage();
  }
});

searchInput.addEventListener('input', function() {
  const query = this.value.trim();
  
  clearTimeout(searchTimeout);
  removeHintMessage();
  
  if (query.length === 0) {
    searchResults.classList.remove('active');
    searchLoading.classList.remove('active');
    searchList.classList.remove('active');
    searchEmpty.classList.remove('active');
    return;
  }
  
  searchResults.classList.add('active');
  
  if (!isEnglish(query)) {
    searchLoading.classList.add('active');
    searchList.classList.remove('active');
    searchEmpty.classList.remove('active');
    removeHintMessage();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchLoading.classList.remove('active');
      showHintMessage();
    }, 400);
    return;
  }
  
  searchLoading.classList.add('active');
  searchList.classList.remove('active');
  searchEmpty.classList.remove('active');
  
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 400);
});

function performSearch(query) {
  searchLoading.classList.remove('active');
  removeHintMessage();
  
  const results = allGames.filter(game => 
    game.title.toLowerCase().includes(query.toLowerCase()) ||
    (game.category && game.category.includes(query)) ||
    (game.genre && game.genre.some(g => g.includes(query)))
  );
  
  if (results.length === 0) {
    searchEmpty.classList.add('active');
    searchList.classList.remove('active');
    return;
  }
  
  searchEmpty.classList.remove('active');
  searchList.classList.add('active');
  
  searchList.innerHTML = results.map(game => {
    let thumbHtml = game.icon && game.icon.startsWith('http') 
      ? `<img src="${game.icon}" alt="${game.title}">` 
      : (game.icon || '🎮');
    
    return `
      <div class="search-item">
        <div class="thumb">${thumbHtml}</div>
        <div class="info">
          <h4>${game.title}</h4>
          <span>${game.category || ''} · ${game.latestVersion || '--'}</span>
        </div>
        <button class="download-btn" onclick="searchGoDetail('${game.id}')">دانلود</button>
      </div>
    `;
  }).join('');
}

function searchGoDetail(gameId) {
  searchResults.classList.remove('active');
  searchInput.value = '';
  goDetail(gameId);
}

// ============================================================
// فیلتر بر اساس ژانر با لودینگ
// ============================================================
let currentGenre = null;

function filterByGenre(genre) {
  currentGenre = genre;
  
  let resultsContainer = document.getElementById('genreResults');
  
  if (!resultsContainer) {
    const heroSection = document.querySelector('.hero-section');
    resultsContainer = document.createElement('section');
    resultsContainer.id = 'genreResults';
    resultsContainer.className = 'section';
    resultsContainer.style.display = 'none';
    heroSection.parentNode.insertBefore(resultsContainer, heroSection);
  }
  
  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = `
    <div class="section-head">
      <h2>بازی‌های <em id="genreTitle">${genre}</em></h2>
      <button class="see-all" onclick="closeGenreFilter()">بستن</button>
    </div>
    <div class="genre-loading">
      <div class="spinner"></div>
      <span>در حال بارگذاری بازی‌های ${genre}...</span>
    </div>
  `;
  
  setTimeout(() => {
    const filteredGames = allGames.filter(game => 
      game.genre && game.genre.includes(genre)
    );
    
    if (filteredGames.length === 0) {
      resultsContainer.innerHTML = `
        <div class="section-head">
          <h2>بازی‌های <em id="genreTitle">${genre}</em></h2>
          <button class="see-all" onclick="closeGenreFilter()">بستن</button>
        </div>
        <p style="color:var(--muted); padding:20px;">هیچ بازی‌ای در این ژانر یافت نشد</p>
      `;
      return;
    }
    
    resultsContainer.innerHTML = `
      <div class="section-head">
        <h2>بازی‌های <em id="genreTitle">${genre}</em></h2>
        <button class="see-all" onclick="closeGenreFilter()">بستن</button>
      </div>
      <div class="cart-rail" id="genreGrid"></div>
    `;
    
    const newGrid = document.getElementById('genreGrid');
    newGrid.innerHTML = filteredGames.map(game => `
      <a class="cart" onclick="goDetail('${game.id}'); return false;">
        <div class="cart-thumb">
          ${game.icon && game.icon.startsWith('http') 
            ? `<img src="${game.icon}" alt="${game.title}" style="width:100%; height:100%; object-fit:cover;">` 
            : game.icon || '🎮'}
          ${game.isNew ? `<span class="badge">جدید</span>` : ''}
        </div>
        <div class="cart-body">
          <span class="tag">${game.category || ''}</span>
          <h3>${game.title || 'بدون عنوان'}</h3>
          <div class="cart-meta"><span class="mono">${game.os || '--'}</span><span class="mono">${game.latestVersion || '--'}</span></div>
        </div>
      </a>
    `).join('');
  }, 400);
}

function closeGenreFilter() {
  const resultsContainer = document.getElementById('genreResults');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
  }
}

// ============================================================
// اتصال کلیک به ژانرها
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.cat-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const genre = this.querySelector('span').textContent;
        filterByGenre(genre);
      });
    });
  }, 500);
});

// ============================================================
// اجرا
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadGames();
});