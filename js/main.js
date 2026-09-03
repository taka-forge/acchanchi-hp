// ============================================================
// 観戦居酒屋あっちゃん家 — 表示ロジック
// data/site-data.js の内容をページに流し込む。
// 日常の更新でこのファイルを触る必要はない。
// ============================================================

(function () {
  const d = SITE_DATA;

  // ---------- ヒーロー ----------
  document.getElementById("heroCatch").textContent = d.shop.catchphrase;
  document.getElementById("heroInsta").href = d.shop.instagramUrl;
  if (d.heroImage) {
    const bg = document.getElementById("heroBg");
    bg.style.backgroundImage = `url(images/${d.heroImage})`;
    bg.classList.add("has-photo");
  }

  // ---------- 特徴カード ----------
  document.getElementById("featureGrid").innerHTML = d.features
    .map(
      (f) => `
      <div class="feature-card">
        <div class="feature-icon">${f.icon}</div>
        <h3 class="feature-title">${f.title}</h3>
        <p class="feature-text">${f.text}</p>
      </div>`
    )
    .join("");

  // ---------- ギャラリー ----------
  const galleryGrid = document.getElementById("galleryGrid");
  if (d.photos.length > 0) {
    galleryGrid.innerHTML = d.photos
      .map(
        (p) => `
        <div class="gallery-item">
          <img src="images/${p.file}" alt="${p.alt}" loading="lazy">
        </div>`
      )
      .join("");
  } else {
    const icons = ["🍢", "🍺", "⚽", "🏮", "📺", "🎉"];
    galleryGrid.innerHTML =
      icons
        .map((i) => `<div class="gallery-placeholder">${i}</div>`)
        .join("") +
      `<p class="gallery-note">お店の写真は近日公開予定です📷</p>`;
  }

  // ---------- メニュー ----------
  document.getElementById("menuGrid").innerHTML = d.menu
    .map(
      (cat) => `
      <div class="menu-card">
        <h3 class="menu-category">${cat.category}</h3>
        ${cat.note ? `<p class="menu-cat-note">${cat.note}</p>` : ""}
        <div class="menu-items-wrap">
          <ul class="menu-items">
            ${cat.items
              .map((item) =>
                item.heading
                  ? `<li class="menu-subheading">${item.heading}</li>`
                  : `
              <li>
                <span>${formatName(item.name)}</span>
                <span class="menu-price">${formatPrice(item.price)}</span>
              </li>`
              )
              .join("")}
          </ul>
        </div>
      </div>`
    )
    .join("");

  // ---------- 店内メニュー表の画像 ----------
  const menuImagesWrap = document.getElementById("menuImages");
  const imgs = d.menuImages || [];
  if (imgs.length > 0) {
    menuImagesWrap.hidden = false;
    document.getElementById("menuImagesGrid").innerHTML = imgs
      .map(
        (m) => `
        <button class="menu-image-item" type="button" data-src="images/${m.file}" data-alt="${m.alt}">
          <img src="images/${m.file}" alt="${m.alt}" loading="lazy">
        </button>`
      )
      .join("");
  }

  // ライトボックス（メニュー画像の拡大表示）
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }
  document.querySelectorAll(".menu-image-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      lightboxImg.src = btn.dataset.src;
      lightboxImg.alt = btn.dataset.alt;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target !== lightboxImg) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  // 収まりきらないカードにだけ「スクロールで続き」ヒントを付ける
  document.querySelectorAll(".menu-card .menu-items-wrap").forEach((wrap) => {
    if (wrap.scrollHeight > wrap.clientHeight + 4) {
      const hint = document.createElement("p");
      hint.className = "menu-scroll-hint";
      hint.textContent = "スクロールで続きが見れます ⌄";
      wrap.parentElement.appendChild(hint);
    }
  });

  // 品名の（〜）部分は2行目に小さく表示（狭い画面での中途半端な折り返し防止）
  function formatName(name) {
    const i = name.indexOf("（");
    if (i === -1) return name;
    return `${name.slice(0, i)}<span class="menu-item-sub">${name.slice(i)}</span>`;
  }

  function formatPrice(price) {
    if (typeof price === "number") return price.toLocaleString() + "円";
    if (/^[0-9]/.test(String(price))) return price + "円";
    return price; // 【要確認】などはそのまま表示
  }

  // ---------- お知らせ ----------
  document.getElementById("newsList").innerHTML = d.news
    .map(
      (n) => `
      <li class="news-item">
        <span class="news-date">${formatDate(n.date)}</span>
        <p class="news-title">${n.title}</p>
        ${n.text ? `<p class="news-text">${n.text}</p>` : ""}
      </li>`
    )
    .join("");

  function formatDate(iso) {
    const [y, m, day] = iso.split("-").map(Number);
    return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
  }

  // ---------- Instagram埋め込み ----------
  document.getElementById("instaBtn").href = d.shop.instagramUrl;
  if (d.instagramPosts.length > 0) {
    document.getElementById("instaEmbeds").innerHTML = d.instagramPosts
      .map(
        (url) => `
        <blockquote class="instagram-media" data-instgrm-permalink="${url}"
          data-instgrm-version="14" style="background:#fff; border-radius:12px;"></blockquote>`
      )
      .join("");
    const s = document.createElement("script");
    s.src = "https://www.instagram.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
  }

  // ---------- 店舗情報テーブル ----------
  const infoRows = [
    { th: "店名", td: `${d.shop.name}（${d.shop.nameRoman}）` },
    { th: "住所", td: d.shop.address },
    { th: "アクセス", td: d.shop.access },
    ...d.hours.map((h) => ({ th: h.label, td: h.value })),
    ...(d.facility || []).map((f) => ({ th: f.label, td: f.value })),
    { th: "電話", td: `<a href="tel:${d.shop.tel}">${d.shop.tel}</a>` },
    {
      th: "SNS",
      td: `<a href="${d.shop.instagramUrl}" target="_blank" rel="noopener">Instagram ${d.shop.instagramId}</a>`,
    },
  ];
  document.getElementById("infoTable").innerHTML = infoRows
    .map((r) => `<tr><th>${r.th}</th><td>${r.td}</td></tr>`)
    .join("");

  // ---------- 地図（住所からGoogleマップ埋め込み） ----------
  const mapQuery = encodeURIComponent(d.shop.address + " " + d.shop.name);
  document.getElementById("mapFrame").src =
    "https://www.google.com/maps?q=" + mapQuery + "&z=16&output=embed";
  document.getElementById("mapLink").href =
    "https://www.google.com/maps/search/?api=1&query=" + mapQuery;

  // ---------- 電話番号リンク ----------
  document.getElementById("reserveTel").href = "tel:" + d.shop.tel;
  document.getElementById("reserveTel").textContent = "📞 " + d.shop.tel;
  document.getElementById("fixedTel").href = "tel:" + d.shop.tel;

  // ---------- 構造化データ（JSON-LD）を site-data.js から生成 ----------
  if (d.structured) {
    const ld = {
      "@context": "https://schema.org",
      "@type": d.structured.type,
      url: d.structured.url,
      name: d.shop.name,
      alternateName: d.shop.nameRoman,
      description: d.shop.catchphrase,
      telephone: "+81-" + d.shop.tel.replace(/^0/, ""),
      address: {
        "@type": "PostalAddress",
        postalCode: d.structured.postalCode,
        addressRegion: d.structured.region,
        addressLocality: d.structured.locality,
        streetAddress: d.structured.street,
        addressCountry: "JP",
      },
      openingHours: d.structured.openingHours,
      priceRange: d.structured.priceRange,
      sameAs: [d.shop.instagramUrl],
    };
    const ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    ldScript.textContent = JSON.stringify(ld);
    document.head.appendChild(ldScript);
  }

  // ---------- フッター年号 ----------
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- スマホナビ開閉 ----------
  const navToggle = document.getElementById("navToggle");
  const nav = document.getElementById("nav");
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    navToggle.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      navToggle.classList.remove("open");
    })
  );
})();
