/* ============================================================
   観戦居酒屋あっちゃん家　ページの動き
   data/site-data.js の SITE_DATA を、index.html の data-* 属性の場所に流し込む。
   見た目は css/style.css が決める。日常の更新で、このファイルを触る必要はない。
   ============================================================ */
(function () {
  "use strict";

  const D = SITE_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isNarrow = () => window.matchMedia("(max-width: 899px)").matches;
  const R = D.reserve || {};
  const hasNet = !!R.netUrl;
  const MR = D.matchReserve || {};

  /* ---------- アイコン（線画。絵文字は使わない） ---------- */
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  const ICON = {
    phone: svg("M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"),
    menu: svg("M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zm2 2v11a1 1 0 0 0 1 1h9V7a1 1 0 0 0-1-1zm2 2h6v2H9zm0 4h6v2H9z"),
    pin: svg("M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"),
    close: svg("M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"),
    copy: svg("M8 3h11a2 2 0 0 1 2 2v11h-2V5H8zM5 7h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 2v11h11V9z"),
    search: svg("M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"),
    tv: svg("M3 5h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v9h16V7z"),
    prev: svg("M15.4 5 8.4 12l7 7 1.4-1.4L11.2 12l5.6-5.6z"),
    next: svg("M8.6 5 7.2 6.4 12.8 12l-5.6 5.6L8.6 19l7-7z"),
    out: svg("M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"),
    cal: svg("M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2zM5 9v10h14V9zm2 2h4v4H7z"),
    chat: svg("M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v11h2v1.8L8.3 16H20V5z"),
  };

  /* ---------- 営業時間（structured.openingHours を読む） ---------- */
  const DAY_KEYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const DAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 月曜始まりで並べる

  function parseHours(lines) {
    const week = {};
    (lines || []).forEach((line) => {
      const m = String(line).match(/^([A-Za-z,]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      if (!m) return;
      const open = Number(m[2]) * 60 + Number(m[3]);
      const close = Number(m[4]) * 60 + Number(m[5]);
      m[1].split(",").forEach((k) => (week[k.trim()] = { open, close }));
    });
    return week;
  }
  const WEEK = parseHours(D.structured && D.structured.openingHours);
  const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

  // 見ている人の端末の時計ではなく、日本時間で判定する
  function nowJST(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", weekday: "short", hourCycle: "h23",
    }).formatToParts(date);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const n = {
      y: Number(get("year")), mo: Number(get("month")), d: Number(get("day")),
      dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
      min: Number(get("hour")) * 60 + Number(get("minute")),
    };
    n.iso = `${n.y}-${String(n.mo).padStart(2, "0")}-${String(n.d).padStart(2, "0")}`;
    return n;
  }

  function todayInfo(n = nowJST()) {
    const h = WEEK[DAY_KEYS[n.dow]];
    const info = {
      label: `${n.mo}月${n.d}日（${DAY_JA[n.dow]}）`,
      hours: h ? `${hm(h.open)}〜${hm(h.close)}` : "定休日",
      state: "", text: "", short: "", sub: "",
    };
    if (!h) { info.state = "closed"; info.text = "きょうは定休日"; info.short = "定休日"; }
    else if (n.min < h.open) { info.state = "before"; info.text = `${hm(h.open)}から営業`; info.short = "準備中"; }
    else if (n.min < h.close) { info.state = "open"; info.text = `営業中　${hm(h.close)}まで`; info.short = "営業中"; }
    else { info.state = "after"; info.text = "きょうの営業は終了"; info.short = "本日終了"; }
    if (info.state === "closed" || info.state === "after") {
      for (let i = 1; i <= 7; i++) {
        const dow = (n.dow + i) % 7;
        const nh = WEEK[DAY_KEYS[dow]];
        if (nh) {
          info.sub = i === 1 ? `次の営業：あした（${DAY_JA[dow]}）${hm(nh.open)}から` : `次の営業：${DAY_JA[dow]}曜 ${hm(nh.open)}から`;
          break;
        }
      }
      // 営業時間外はネット予約が便利、と添える
      if (hasNet) info.sub += (info.sub ? "\n" : "") + "ネット予約は、営業時間外もOK";
    }
    return info;
  }

  /* ---------- 画面に入ったかの判定 ---------- */
  // 判定の基準を、このページ自身の画面にする（root: document）。指定しないと、ページが別サイトの中に
  // 埋め込まれたとき（Artifactのプレビューなど）に一番外側の画面が基準になり、「画面の真ん中」の判定がずれる
  function watch(cb, opts = {}) {
    try { return new IntersectionObserver(cb, Object.assign({ root: document }, opts)); }
    catch (e) { return new IntersectionObserver(cb, opts); } // root: document に対応していない古いブラウザ
  }

  /* ---------- お店の基本情報 ---------- */
  const MAP_Q = encodeURIComponent(D.shop.address + " " + D.shop.name);
  const MAP_URL = "https://www.google.com/maps/search/?api=1&query=" + MAP_Q;
  const MAP_EMBED = "https://www.google.com/maps?q=" + MAP_Q + "&z=16&output=embed";

  function fillShop() {
    $$("[data-shop]").forEach((el) => {
      const v = D.shop[el.dataset.shop];
      if (v == null) return;
      // 「徒歩6分」「車で10分」などは割らない（狭い画面で「徒歩／6分」と折れないように）
      if (el.dataset.shop === "access") el.innerHTML = esc(v).replace(/((?:徒歩|車で)\d+分)/g, '<span class="nw">$1</span>');
      else el.textContent = v;
    });
    $$("[data-facility]").forEach((el) => {
      const f = (D.facility || []).find((x) => x.label === el.dataset.facility);
      // site-data.js の値（<br>入り）をそのまま使う。「／」の後ろでだけ折り返せるようにする
      if (f) el.innerHTML = f.value.replace(/／/g, "／<wbr>");
    });
    $$("[data-hours-row]").forEach((el) => {
      const h = (D.hours || []).find((x) => x.label === el.dataset.hoursRow);
      if (!h) return;
      // data-flat：一文にして「試合開催日は、〜」の形で出す
      if ("flat" in el.dataset) el.textContent = `${h.label}は、${h.value.replace(/<br\s*\/?>/g, "")}。`;
      else el.innerHTML = h.value;
    });
    $$("[data-reserve]").forEach((el) => { el.textContent = R[el.dataset.reserve] || ""; });
    $$("[data-smoking]").forEach((el) => { el.textContent = (D.smoking || {})[el.dataset.smoking] || ""; });
    $$("[data-net-only]").forEach((el) => (el.hidden = !hasNet));
    $$("[data-net-link]").forEach((a) => { a.href = R.netUrl || "#"; a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-reserve-head]").forEach((el) => {
      el.innerHTML = hasNet ? "ご予約は、<wbr>お電話か<wbr>ネットで。" : "ご予約は、<wbr>お電話で。";
    });
    $$("[data-tel-link]").forEach((a) => (a.href = "tel:" + D.shop.tel));
    $$("[data-map-link]").forEach((a) => { a.href = MAP_URL; a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-insta-link]").forEach((a) => { a.href = D.shop.instagramUrl; a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    $$("[data-icon]").forEach((el) => {
      if (!el.firstElementChild && ICON[el.dataset.icon]) el.insertAdjacentHTML("afterbegin", ICON[el.dataset.icon]);
    });
  }

  function fillHighlights() {
    $$("[data-highlights]").forEach((ul) => {
      ul.innerHTML = (D.highlights || []).map((t) => `<li>${esc(t)}</li>`).join("");
      ul.hidden = !(D.highlights || []).length;
    });
  }

  // 「・」区切りの言葉を、言葉の途中では折らずに並べる（American Express・QRコード決済などが割れないように）
  const words = (list) => list.map((w) => `<span class="nw">${esc(w)}</span>`).join("・<wbr>");

  // お支払い：種類を一行で → 開くと使えるブランド
  function fillPayment() {
    const list = D.payment || [];
    $$("[data-payment]").forEach((dd) => {
      if (!list.length) { dd.closest("div").hidden = true; return; }
      const detail = list.filter((p) => p.value);
      dd.innerHTML =
        `<span class="pay-kinds">${words(list.map((p) => p.label))}</span>` +
        (detail.length
          ? `<details class="pay-more"><summary>使えるブランド</summary><dl class="pay-list">` +
            detail.map((p) => `<div><dt>${esc(p.label)}</dt><dd>${words(p.value.split("・"))}</dd></div>`).join("") +
            `</dl></details>`
          : "");
    });
  }

  function fillToday() {
    const n = nowJST();
    const t = todayInfo(n);
    $$("[data-today]").forEach((box) => {
      box.dataset.state = t.state;
      const set = (sel, v) => $$(sel, box).forEach((el) => (el.textContent = v));
      set("[data-today-label]", t.label);
      set("[data-today-text]", t.text);
      set("[data-today-short]", t.short);
      set("[data-today-sub]", t.sub);
      $$("[data-today-sub]", box).forEach((el) => (el.hidden = !t.sub));
    });
    $$("[data-week]").forEach((list) => {
      list.innerHTML = WEEK_ORDER.map((dow) => {
        const h = WEEK[DAY_KEYS[dow]];
        const cls = ["week-row"];
        if (dow === n.dow) cls.push("is-today");
        if (!h) cls.push("is-closed");
        return `<li class="${cls.join(" ")}"><span class="week-day">${DAY_JA[dow]}</span>` +
          `<span class="week-time">${h ? `${hm(h.open)}〜${hm(h.close)}` : "定休日"}</span>` +
          (dow === n.dow ? `<span class="week-mark">きょう</span>` : "") + `</li>`;
      }).join("");
    });
  }

  /* ---------- メニュー ---------- */
  const yen = (p) =>
    typeof p === "number" ? p.toLocaleString("ja-JP") + "円" : /^[0-9]/.test(String(p)) ? p + "円" : String(p);
  const findCat = (prefix) => D.menu.find((c) => c.category.startsWith(prefix));
  const shortCat = (name) => name.split("（")[0];
  // 品名の（〜）は2行目に小さく出す
  function nameHTML(name) {
    const i = name.indexOf("（");
    if (i < 1) return esc(name);
    return `${esc(name.slice(0, i))}<small>${esc(name.slice(i))}</small>`;
  }
  // 小見出し（焼酎・梅酒など）の下の品は、検索のときに小見出しの名前でも引っかかるようにする
  function listHTML(cat) {
    let head = "";
    return cat.items.map((it) => {
      if (it.heading) { head = it.heading; return `<li class="m-head">${esc(it.heading)}</li>`; }
      const key = [cat.category, head, it.name].join(" ");
      return `<li class="m-item" data-key="${esc(key)}"><span class="m-name">${nameHTML(it.name)}</span><span class="m-price">${esc(yen(it.price))}</span></li>`;
    }).join("");
  }

  function fillMenu() {
    const kushi = findCat("串焼き");
    if (kushi) {
      const skewers = kushi.items.filter((it) => !it.name.includes("盛り合わせ"));
      const mori = kushi.items.find((it) => it.name.includes("盛り合わせ"));
      $$("[data-kushi]").forEach((ul) => {
        ul.innerHTML = skewers.map((it) => `<li class="kushi">${esc(it.name)}</li>`).join("");
      });
      $$("[data-kushi-price]").forEach((el) => (el.textContent = skewers.length ? String(skewers[0].price) : ""));
      // 大きく「一本150円」と出すので、説明文の頭の「各150円（1本の価格）。」は省く
      $$("[data-kushi-note]").forEach((el) => (el.textContent = (kushi.note || "").replace(/^各[0-9,]+円（[^）]*）。?/, "")));
      $$("[data-kushi-mori]").forEach((el) => {
        el.innerHTML = mori ? `<span class="m-name">${esc(mori.name)}</span><span class="m-price">${esc(yen(mori.price))}</span>` : "";
      });
    }
    // 看板の品：写真と品名・値段を並べる（品名はメニューから値段を引く）
    const allItems = D.menu.flatMap((c) => c.items);
    $$("[data-picks]").forEach((ul) => {
      const picks = (D.menuPicks || []).map((p) => Object.assign({}, p, { item: allItems.find((it) => it.name === p.name) })).filter((p) => p.item);
      ul.hidden = !picks.length;
      ul.innerHTML = picks.map((p) =>
        `<li class="pick"><figure><img src="images/${esc(p.file)}" alt="${esc(p.alt || p.name)}" loading="lazy" decoding="async" width="600" height="800">` +
        `<figcaption><span class="pick-name">${esc(p.label || p.name)}</span><span class="pick-price">${esc(yen(p.item.price))}</span></figcaption></figure></li>`
      ).join("");
    });
    $$("[data-menu-cat]").forEach((ul) => {
      const c = findCat(ul.dataset.menuCat);
      if (c) ul.innerHTML = listHTML(c);
    });
    $$("[data-menu-count]").forEach((el) => {
      el.textContent = D.menu.reduce((n, c) => n + c.items.filter((it) => !it.heading).length, 0);
    });
    $$("[data-menu-images]").forEach((b) => (b.hidden = !(D.menuImages || []).length));
  }

  /* ---------- 特徴・写真・お知らせ・Instagram・放映予定 ---------- */
  function fillFeatures() {
    const feats = D.features || [];
    const used = [];
    $$("[data-feature-lead], [data-feature-text]").forEach((el) => {
      const key = el.dataset.featureLead || el.dataset.featureText;
      const f = feats.find((x) => x.key === key);
      // 「はじめての方へ」の欄は短い言い方（short）があればそちらを使う
      // 短い言い方は「・」の後ろでだけ折る（「一人・初めてでも／OK」と割れないように）
      if (f) { el.innerHTML = el.dataset.featureText && f.short ? words(f.short.split("・")) : esc(f.text); used.push(key); }
    });
    $$("[data-features]").forEach((ul) => {
      ul.innerHTML = feats.filter((f) => !used.includes(f.key)).map((f) =>
        `<li class="feat"><h3 class="feat-title">${esc(f.title)}</h3><p class="feat-text">${esc(f.text)}</p></li>`
      ).join("");
    });
  }

  function fillGallery() {
    $$("[data-gallery]").forEach((ul) => {
      // 看板の品で見せた写真は、ここでは繰り返さない
      const shown = (D.menuPicks || []).map((p) => p.file);
      const list = (D.photos || []).filter((p) => !shown.includes(p.file));
      const wrap = ul.closest("[data-gal-wrap]");
      // 写真が1枚もなければ、写真の列も「前・次」のボタンも出さない（背景の写真だけで見せる）
      ul.hidden = !list.length;
      $$(".gal-nav", wrap).forEach((nav) => (nav.hidden = !list.length));
      ul.innerHTML = list.map((p) =>
        `<li class="gal-item"><figure><img src="images/${esc(p.file)}" alt="${esc(p.alt)}" loading="lazy" decoding="async" width="600" height="800">` +
        `<figcaption>${esc(p.alt)}</figcaption></figure></li>`
      ).join("");
      // パソコンの「前・次」ボタンは、端まで来たら押せなくする
      const prev = $('[data-gal-step="-1"]', wrap), next = $('[data-gal-step="1"]', wrap);
      const sync = () => {
        if (prev) prev.disabled = ul.scrollLeft <= 2;
        if (next) next.disabled = ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 2;
      };
      ul.addEventListener("scroll", sync, { passive: true });
      window.addEventListener("resize", sync);
      sync();
    });
    $$("[data-gal-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ul = btn.closest("[data-gal-wrap]").querySelector("[data-gallery]");
        const item = ul.querySelector(".gal-item");
        const step = item ? item.getBoundingClientRect().width + 12 : ul.clientWidth * 0.8;
        ul.scrollBy({ left: Number(btn.dataset.galStep) * step, behavior: reduceMotion() ? "auto" : "smooth" });
      });
    });
  }

  // お知らせは、日付から NEWS_DAYS 日以内のものだけ出す。1件もなければ「お知らせ」の場面ごと隠す
  // （「オープンしました」が何か月も一番上に残ると、更新の止まった店に見える。データは消さない）
  const NEWS_DAYS = 60;
  function freshNews() {
    const n = nowJST();
    const today = Date.UTC(n.y, n.mo - 1, n.d);
    return (D.news || []).filter((x) => {
      const [y, mo, d] = String(x.date).split("-").map(Number);
      return y && (today - Date.UTC(y, mo - 1, d)) / 86400000 <= NEWS_DAYS;
    });
  }
  function fillNews() {
    const list = freshNews();
    const sec = $("#news");
    if (sec) sec.hidden = !list.length && !(D.instagramPosts || []).filter(Boolean).length;
    $$("[data-news]").forEach((ul) => {
      ul.innerHTML = list.map((n) =>
        `<li class="news-item"><time datetime="${esc(n.date)}">${esc(n.date.replace(/-/g, "."))}</time>` +
        `<p class="news-title">${esc(n.title)}</p>${n.text ? `<p class="news-text">${esc(n.text)}</p>` : ""}</li>`
      ).join("");
      ul.hidden = !list.length;
    });
  }

  // Instagram投稿の埋め込み：画面に近づいてから読み込む（重いので）。読み込み中は同じ大きさの淡い面を出す
  function fillInsta() {
    const posts = (D.instagramPosts || []).filter(Boolean);
    const box = $("[data-insta-posts]");
    if (!box || !posts.length) return;
    box.hidden = false;
    box.innerHTML = posts.map(() => `<div class="insta-wait" aria-hidden="true"></div>`).join("");
    const load = () => {
      box.innerHTML = posts.map((url) =>
        `<blockquote class="instagram-media" data-instgrm-permalink="${esc(url)}" data-instgrm-version="14"></blockquote>`
      ).join("");
      const s = document.createElement("script");
      s.src = "https://www.instagram.com/embed.js";
      s.async = true;
      document.body.append(s);
    };
    const io = watch((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "600px 0px" });
    io.observe(box);
  }

  // 放映予定：自動で作る data/broadcasts.js（BROADCASTS）を読む。無ければ site-data.js の broadcasts（手入力の予備）
  // mode：open＝通常営業で流す／reserve＝営業時間外で予約制。きょう以降の試合だけを、日付と時刻の順に並べる
  function upcoming() {
    const n = nowJST();
    const auto = typeof BROADCASTS !== "undefined" && BROADCASTS && Array.isArray(BROADCASTS.items) ? BROADCASTS.items : null;
    return (auto || D.broadcasts || [])
      .filter((b) => b && b.date && b.date >= n.iso)
      // きょうの試合は、開始から3時間たったら消す（一覧は朝に作り直すので、それまでの間に終わった試合が残らないように）
      .filter((b) => b.date > n.iso || !b.time || Number(b.time.split(":")[0]) * 60 + Number(b.time.split(":")[1]) + 180 > n.min)
      .map((b) => Object.assign({ mode: "open" }, b))
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || "99").localeCompare(String(b.time || "99")));
  }

  // 0〜4時台の試合は「前の日の深夜」として見せる（11/8 1:10 → 11/7（土）深夜1:10）
  function tvWhen(b) {
    const [y, mo, d] = b.date.split("-").map(Number);
    const hour = b.time ? Number(b.time.split(":")[0]) : 12;
    const late = hour < 5;
    const day = new Date(Date.UTC(y, mo - 1, d - (late ? 1 : 0)));
    return { mo: day.getUTCMonth() + 1, d: day.getUTCDate(), dow: day.getUTCDay(), iso: day.toISOString().slice(0, 10),
      time: b.time ? (late ? "深夜" : "") + b.time : "時刻未定" };
  }

  // 予約制の試合の締切：試合の日（深夜は前の日の夜）から daysBefore 日前まで
  function reserveDeadline(w, today) {
    if (!MR.minPeople || !MR.daysBefore) return "";
    const [y, mo, d] = w.iso.split("-").map(Number);
    const day = new Date(Date.UTC(y, mo - 1, d - MR.daysBefore));
    if (day.toISOString().slice(0, 10) < today) return ["受付終了・", "開催はInstagramで"];
    return [`締切 ${day.getUTCMonth() + 1}/${day.getUTCDate()}（${DAY_JA[day.getUTCDay()]}）・`, `${MR.minPeople}名以上で開催`];
  }

  function tvItem(b, today) {
    const w = tvWhen(b);
    const isToday = w.iso === today;
    const note = [b.note, b.mode === "reserve" ? reserveDeadline(w, today) : ""].filter(Boolean);
    const tags = (isToday ? `<span class="tv-tag is-today">きょう</span>` : "") +
      (b.mode === "reserve" ? `<span class="tv-tag is-reserve">予約制</span>` : "") +
      (b.tags || []).map((t) => `<span class="tv-tag">${esc(t)}</span>`).join("");
    return `<li class="tv-item${isToday ? " tv-today" : ""}">` +
      `<p class="tv-when"><time datetime="${esc(b.date)}${b.time ? "T" + esc(b.time) : ""}"><span class="tv-date">${w.mo}/${w.d}</span>` +
      `<span class="tv-dow">${DAY_JA[w.dow]}</span></time><span class="tv-time">${esc(w.time)}</span></p>` +
      `<div class="tv-body"><p class="tv-sport">${esc(b.sport || "")}${b.league ? `<span>${esc(b.league)}</span>` : ""}</p>` +
      `<p class="tv-match">${esc(b.match || "")}</p>${note.map((t) => `<p class="tv-note">${[].concat(t).map((s) => `<span class="nw">${esc(s)}</span>`).join("")}</p>`).join("")}</div>` +
      `<p class="tv-tags">${tags}</p></li>`;
  }

  function fillTV() {
    const all = upcoming();
    const items = all.filter((b) => b.mode !== "reserve");
    const reserve = all.filter((b) => b.mode === "reserve");
    const today = nowJST().iso;
    // 看板の「次の放映」：通常営業で流す一番近い試合を一行で（押すと放映予定へ）
    $$("[data-tv-next]").forEach((el) => {
      const b = items[0];
      el.hidden = !b;
      if (!b) return;
      const w = tvWhen(b);
      const when = w.iso === today ? "きょう" : `${w.mo}/${w.d}`;
      el.innerHTML = `<a href="#tv"><span class="hero-next-label">次の放映</span>` +
        [`${when} ${w.time}`, b.league || b.sport, b.match].filter(Boolean).map((t) => `<span class="nw">${esc(t)}</span>`).join(" ") + `</a>`;
    });
    $$("[data-tv-has]").forEach((el) => (el.hidden = !all.length));
    $$("[data-tv-none]").forEach((el) => (el.hidden = !!all.length));
    $$('[data-tv="open"]').forEach((ul) => {
      ul.innerHTML = items.map((b) => tvItem(b, today)).join("");
      ul.hidden = !items.length;
    });
    $$("[data-tv-reserve]").forEach((box) => (box.hidden = !reserve.length));
    $$('[data-tv="reserve"]').forEach((ul) => (ul.innerHTML = reserve.map((b) => tvItem(b, today)).join("")));
    $$("[data-match-reserve-note]").forEach((el) => {
      el.textContent = MR.minPeople
        ? `定休日・昼・深夜の試合は、試合の${MR.daysBefore}日前までに${MR.minPeople}名以上のご予約が集まれば開けます。ご予約はお電話かInstagramのDMで。`
        : "定休日・昼・深夜の試合は、ご予約をいただいて開けています。ご予約はお電話かInstagramのDMで。";
    });
  }

  function fillMap() {
    const frame = $("[data-map-frame]");
    if (!frame) return;
    // 地図は重いので、近づいてから読み込む（loading="lazy" に対応していない端末向けの保険）
    const io = watch((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); frame.src = MAP_EMBED; }
    }, { rootMargin: "400px 0px" });
    io.observe(frame);
  }

  /* ---------- 検索エンジン向けの店舗情報（構造化データ） ---------- */
  function addStructuredData() {
    const s = D.structured;
    if (!s) return;
    const ld = {
      "@context": "https://schema.org",
      "@type": s.type,
      url: s.url,
      name: D.shop.name,
      alternateName: D.shop.nameRoman,
      description: D.shop.catchphrase,
      telephone: D.shop.tel,
      image: s.url + "images/og-image.jpg",
      address: {
        "@type": "PostalAddress",
        postalCode: s.postalCode, addressRegion: s.region, addressLocality: s.locality, streetAddress: s.street, addressCountry: "JP",
      },
      openingHours: s.openingHours,
      priceRange: s.priceRange,
      servesCuisine: ["焼き鳥", "居酒屋"],
      acceptsReservations: hasNet ? R.netUrl : true,
      sameAs: [D.shop.instagramUrl],
    };
    if ((D.payment || []).length) ld.paymentAccepted = D.payment.map((p) => p.label).join(", ");
    if (D.smoking) ld.smokingAllowed = true;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(ld);
    document.head.append(el);
  }

  /* ---------- 画面のロック（下から出る一覧・拡大表示を重ねても崩れないように数える） ---------- */
  let lockCount = 0;
  const lock = () => { lockCount++; document.documentElement.classList.add("is-locked"); };
  const unlock = () => { lockCount = Math.max(0, lockCount - 1); if (!lockCount) document.documentElement.classList.remove("is-locked"); };

  /* ---------- トースト ---------- */
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.append(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 2400);
  }

  function selectNode(node) {
    try {
      const r = document.createRange();
      r.selectNodeContents(node);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    } catch (e) { /* 選択できなくても表示は残る */ }
  }

  function copyText(text, label, sourceNode) {
    const fallback = () => {
      if (sourceNode) selectNode(sourceNode);
      toast("文字を長押しすると、コピーできます");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(`${label}をコピーしました`), fallback);
    } else {
      fallback();
    }
  }

  function bindCopy(root = document) {
    $$("[data-copy]", root).forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const key = btn.dataset.copy;
        const label = key === "tel" ? "電話番号" : key === "address" ? "住所" : "文字";
        const scope = btn.closest("[data-copy-scope]") || document;
        copyText(D.shop[key], label, $(`[data-shop="${key}"]`, scope));
      });
    });
  }

  /* ---------- 下から出る一覧（Bottom Sheet） ---------- */
  let sheet, backdrop, lastFocus;
  const built = {};

  function ensureSheet() {
    if (sheet) return;
    backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop";
    backdrop.hidden = true;
    sheet = document.createElement("section");
    sheet.className = "sheet";
    sheet.hidden = true;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "sheetTitle");
    sheet.innerHTML =
      `<div class="sheet-grab"><span class="sheet-handle" aria-hidden="true"></span>` +
      `<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle"></h2>` +
      `<button type="button" class="sheet-close" aria-label="閉じる">${ICON.close}</button></div></div>` +
      `<div class="sheet-content"></div>`;
    document.body.append(backdrop, sheet);
    backdrop.addEventListener("click", closeSheet);
    $(".sheet-close", sheet).addEventListener("click", closeSheet);
    sheet.addEventListener("keydown", trapTab);
    enableDrag($(".sheet-grab", sheet));
  }

  function openSheet(kind, title, build, after) {
    ensureSheet();
    if (!sheet.hidden && sheet.dataset.kind === kind) { if (after) after(built[kind]); return; }
    const wasOpen = !sheet.hidden;
    lastFocus = wasOpen ? lastFocus : document.activeElement;
    if (!built[kind]) built[kind] = build();
    $(".sheet-title", sheet).textContent = title;
    $(".sheet-content", sheet).replaceChildren(built[kind]);
    sheet.dataset.kind = kind;
    if (!wasOpen) {
      backdrop.hidden = false;
      sheet.hidden = false;
      lock();
      sheet.getBoundingClientRect(); // 初期位置を確定させてから動かす
      backdrop.classList.add("is-open");
      sheet.classList.add("is-open");
    }
    if (after) after(built[kind]);
    setTimeout(() => $(".sheet-close", sheet).focus({ preventScroll: true }), 40);
  }

  function closeSheet() {
    if (!sheet || sheet.hidden || !sheet.classList.contains("is-open")) return;
    sheet.classList.remove("is-open", "is-dragging");
    backdrop.classList.remove("is-open");
    sheet.style.transform = "";
    const done = () => { sheet.hidden = true; backdrop.hidden = true; };
    if (reduceMotion()) done(); else setTimeout(done, 280);
    unlock();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // スマホでは、つまみ部分を下に引っぱると閉じる
  function enableDrag(grab) {
    let y0 = null, dy = 0, t0 = 0;
    grab.addEventListener("pointerdown", (e) => {
      if (!isNarrow() || e.target.closest("button")) return;
      y0 = e.clientY; dy = 0; t0 = performance.now();
      sheet.classList.add("is-dragging");
      grab.setPointerCapture(e.pointerId);
    });
    grab.addEventListener("pointermove", (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 === null) return;
      sheet.classList.remove("is-dragging");
      const fast = dy > 40 && dy / Math.max(1, performance.now() - t0) > 0.6;
      y0 = null;
      if (dy > 110 || fast) closeSheet();
      else sheet.style.transform = "";
    };
    grab.addEventListener("pointerup", end);
    grab.addEventListener("pointercancel", end);
  }

  function trapTab(e) {
    if (e.key !== "Tab") return;
    const f = $$("button, a[href], input, summary, [tabindex]:not([tabindex='-1'])", sheet).filter((el) => !el.hidden && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- 全メニュー（カテゴリのボタン＋品名でさがす） ---------- */
  // ひらがなはカタカナに、全角・半角はそろえて比べる（「れもん」でもレモンが出る）
  const norm = (s) =>
    String(s).normalize("NFKC").toLowerCase()
      .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
      .replace(/\s+/g, "");

  function buildMenuSheet() {
    const wrap = document.createElement("div");
    wrap.className = "msheet";
    const cats = D.menu.map((c, i) => Object.assign({ id: "mcat-" + i }, c));
    wrap.innerHTML =
      `<div class="msheet-tools">` +
      `<label class="msheet-search"><span class="vh">メニューを品名でさがす</span>${ICON.search}` +
      `<input id="menuSearch" type="search" enterkeyhint="search" autocomplete="off" placeholder="品名でさがす（例：レモン）"></label>` +
      `<div class="chips">${cats.map((c) => `<button type="button" class="chip" data-target="${c.id}">${esc(shortCat(c.category))}</button>`).join("")}</div>` +
      `</div>` +
      `<div class="msheet-body">` +
      cats.map((c) =>
        `<section class="mcat" id="${c.id}" data-key="${esc(c.category)}"><h3 class="mcat-title">${esc(c.category)}</h3>` +
        (c.note ? `<p class="mcat-note">${esc(c.note)}</p>` : "") +
        `<ul class="m-list">${listHTML(c)}</ul></section>`
      ).join("") +
      `<p class="msheet-empty" hidden>見つかりませんでした。ほかの言葉でさがしてみてください。</p>` +
      `<p class="msheet-foot">※価格はすべて税込みです。仕入れ状況によりメニュー・価格が変わる場合があります。</p>` +
      ((D.menuImages || []).length ? `<button type="button" class="btn msheet-img" data-menu-images>店内のメニュー表（画像）で見る</button>` : "") +
      `</div>`;

    const body = $(".msheet-body", wrap);
    const chips = $$(".chip", wrap);
    const input = $("#menuSearch", wrap);

    const setActive = (id) => chips.forEach((ch) => {
      const on = ch.dataset.target === id;
      ch.classList.toggle("is-active", on);
      if (on) ch.setAttribute("aria-current", "true"); else ch.removeAttribute("aria-current");
    });
    const centerChip = (chip) => {
      const row = chip.parentElement;
      row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: reduceMotion() ? "auto" : "smooth" });
    };

    chips.forEach((chip) => chip.addEventListener("click", () => {
      const sec = $("#" + chip.dataset.target, wrap);
      if (!sec || sec.hidden) return;
      body.scrollTo({ top: sec.offsetTop - 4, behavior: reduceMotion() ? "auto" : "smooth" });
      setActive(chip.dataset.target);
      centerChip(chip);
    }));

    let ticking = false;
    body.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const secs = $$(".mcat", wrap).filter((s) => !s.hidden);
        let cur = secs[0];
        secs.forEach((s) => { if (s.offsetTop - 24 <= body.scrollTop) cur = s; });
        if (cur) {
          const chip = chips.find((c) => c.dataset.target === cur.id);
          if (chip && !chip.classList.contains("is-active")) { setActive(cur.id); centerChip(chip); }
        }
      });
    });

    input.addEventListener("input", () => {
      const q = norm(input.value);
      let any = false;
      $$(".mcat", wrap).forEach((sec) => {
        const catHit = q && norm(sec.dataset.key).includes(q);
        let hits = 0;
        $$(".m-item", sec).forEach((li) => {
          const ok = !q || catHit || norm(li.dataset.key).includes(q);
          li.hidden = !ok;
          if (ok) hits++;
        });
        $$(".m-head", sec).forEach((h) => (h.hidden = !!q && !catHit));
        const note = $(".mcat-note", sec);
        if (note) note.hidden = !!q && !catHit;
        sec.hidden = !!q && !hits;
        if (!sec.hidden) any = true;
        const chip = chips.find((c) => c.dataset.target === sec.id);
        if (chip) chip.hidden = sec.hidden;
      });
      $(".msheet-empty", wrap).hidden = any;
      body.scrollTop = 0;
    });

    const img = $("[data-menu-images]", wrap);
    if (img) img.addEventListener("click", openViewer);
    setActive(cats[0].id);
    return wrap;
  }

  function openMenu(jump) {
    openSheet("menu", "メニュー", buildMenuSheet, (wrap) => {
      if (!jump) return;
      const sec = $$(".mcat", wrap).find((s) => s.dataset.key.startsWith(jump));
      const chip = sec && $(`.chip[data-target="${sec.id}"]`, wrap);
      if (chip) setTimeout(() => chip.click(), 60);
    });
  }

  /* ---------- ご予約（いきなり発信せず、電話とネットの2つの道を下から出す） ---------- */
  // 営業中は電話を先に。営業時間外（電話がつながらない時間）は、ネット予約を先に出して赤いボタンにする
  function buildReserveSheet() {
    const t = todayInfo();
    const netFirst = hasNet && t.state !== "open";
    const box = document.createElement("div");
    box.className = "rsheet";
    box.setAttribute("data-copy-scope", "");
    const tel =
      `<div class="rway"><p class="rway-label">お電話で</p>` +
      `<p class="rway-num" data-shop="tel">${esc(D.shop.tel)}</p>` +
      (R.telNote ? `<p class="rway-note">${esc(R.telNote)}</p>` : "") +
      `<div class="rway-actions">` +
      `<a class="btn${netFirst ? "" : " btn-main"}" href="tel:${esc(D.shop.tel)}">${ICON.phone}電話をかける</a>` +
      `<button type="button" class="btn" data-copy="tel">${ICON.copy}番号をコピー</button></div></div>`;
    const net = hasNet
      ? `<div class="rway"><p class="rway-label">ネットで（${esc(R.netName || "")}）</p>` +
        (R.netNote ? `<p class="rway-note">${esc(R.netNote)}</p>` : "") +
        `<a class="btn btn-wide${netFirst ? " btn-main" : ""}" href="${esc(R.netUrl)}" target="_blank" rel="noopener">${ICON.cal}空席を見て予約する${ICON.out}</a></div>`
      : "";
    box.innerHTML =
      `<p class="rsheet-today">きょう ${esc(t.label)}　${esc(t.hours)}${t.state === "open" ? "（営業中）" : ""}</p>` +
      (netFirst ? net + tel : tel + net) +
      `<p class="rway-note">${esc(((D.facility || []).find((f) => f.label === "貸切") || {}).value || "")}。パブリックビューイングのご相談もどうぞ。</p>`;
    bindCopy(box);
    return box;
  }

  // 営業時間外の試合の予約：ホットペッパーでは取れないので、電話とInstagramのDMの2つ
  function buildMatchReserveSheet() {
    const box = document.createElement("div");
    box.className = "rsheet";
    box.setAttribute("data-copy-scope", "");
    const dm = "https://ig.me/m/" + String(D.shop.instagramId || "").replace(/^@/, "");
    box.innerHTML =
      (MR.minPeople ? `<p class="rsheet-today">試合の${MR.daysBefore}日前までに${MR.minPeople}名以上で開けます</p>` : "") +
      `<div class="rway"><p class="rway-label">InstagramのDMで</p>` +
      `<p class="rway-note">いつでも送れます。見たい試合と人数を書いてください</p>` +
      `<a class="btn btn-wide btn-main" href="${esc(dm)}" target="_blank" rel="noopener">${ICON.chat}DMを送る${ICON.out}</a></div>` +
      `<div class="rway"><p class="rway-label">お電話で</p>` +
      `<p class="rway-num" data-shop="tel">${esc(D.shop.tel)}</p>` +
      (R.telNote ? `<p class="rway-note">${esc(R.telNote)}</p>` : "") +
      `<div class="rway-actions">` +
      `<a class="btn" href="tel:${esc(D.shop.tel)}">${ICON.phone}電話をかける</a>` +
      `<button type="button" class="btn" data-copy="tel">${ICON.copy}番号をコピー</button></div></div>`;
    bindCopy(box);
    return box;
  }

  /* ---------- 店内のメニュー表（画像）を大きく見る ---------- */
  let viewer, viewerReturn;
  function openViewer() {
    if (!viewer) {
      viewer = document.createElement("div");
      viewer.className = "viewer";
      viewer.hidden = true;
      viewer.setAttribute("role", "dialog");
      viewer.setAttribute("aria-modal", "true");
      viewer.setAttribute("aria-label", "店内のメニュー表");
      viewer.innerHTML =
        `<button type="button" class="viewer-close" aria-label="閉じる">${ICON.close}</button>` +
        `<div class="viewer-body">${(D.menuImages || []).map((m) => `<img src="images/${esc(m.file)}" alt="${esc(m.alt)}" loading="lazy">`).join("")}</div>`;
      document.body.append(viewer);
      $(".viewer-close", viewer).addEventListener("click", closeViewer);
      viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.classList.contains("viewer-body")) closeViewer(); });
    }
    viewerReturn = document.activeElement;
    viewer.hidden = false;
    viewer.scrollTop = 0;
    lock();
    $(".viewer-close", viewer).focus({ preventScroll: true });
  }
  function closeViewer() {
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true;
    unlock();
    if (viewerReturn && viewerReturn.focus) viewerReturn.focus({ preventScroll: true });
  }

  /* ---------- 背景の写真を、いま読んでいる場面に合わせて切り替える ---------- */
  function bindScenes() {
    const scenes = $$(".scene");
    const find = (key) => scenes.find((s) => s.dataset.scene === key);
    const load = (img) => { if (img && img.dataset.src && !img.getAttribute("src")) img.src = img.dataset.src; };
    let current = "night";
    function show(key) {
      const img = find(key);
      if (!img || key === current) return;
      current = key;
      load(img);
      scenes.forEach((s) => s.classList.toggle("is-on", s === img));
    }
    // 画面の真ん中の帯にかかった場面の写真を出す
    const io = watch((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target.dataset.sceneKey); });
    }, { rootMargin: "-48% 0px -48% 0px" });
    $$("[data-scene-key]").forEach((s) => io.observe(s));
    // 最初の写真が出てから、残りの写真を先に読み込んでおく（切り替えのときに一瞬黒くならないように）
    window.addEventListener("load", () => setTimeout(() => scenes.forEach(load), 300));
  }

  /* ---------- ヘッダー（パソコン）：読み進めたら帯にする・いまの場所に印 ---------- */
  function bindHeader() {
    const head = $("[data-head]");
    const hero = $("#top");
    if (head && hero) {
      watch(([e]) => head.classList.toggle("is-stuck", !e.isIntersecting), { rootMargin: "-80px 0px 0px 0px" }).observe(hero);
    }
    const links = $$(".site-nav a");
    const io = watch((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-here", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((a) => { const t = $(a.getAttribute("href")); if (t) io.observe(t); });
    if (hero) io.observe(hero); // 看板に戻ったら印を消す
  }

  // たばこの場面：画面に入ったら煙を立ちのぼらせる
  function bindSmoke() {
    const el = $("[data-smoke]");
    if (!el) return;
    el.hidden = !D.smoking;
    const io = watch((es) => { if (es.some((e) => e.isIntersecting)) { el.classList.add("is-seen"); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
  }

  /* ---------- ボタンのつなぎこみ ---------- */
  function bindActions() {
    $$("[data-menu-open]").forEach((b) => b.addEventListener("click", () => openMenu(b.dataset.menuOpen)));
    // 予約の一覧は、開くたびにその時刻の営業状況で作り直す
    $$("[data-reserve-open]").forEach((b) => b.addEventListener("click", () => { delete built.reserve; openSheet("reserve", "ご予約", buildReserveSheet); }));
    $$("[data-match-reserve-open]").forEach((b) => b.addEventListener("click", () => openSheet("matchReserve", "営業時間外の試合のご予約", buildMatchReserveSheet)));
    $$("[data-menu-images]").forEach((b) => b.addEventListener("click", openViewer));
    bindCopy();
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (viewer && !viewer.hidden) closeViewer();
      else closeSheet();
    });
  }

  function init() {
    fillShop();
    fillHighlights();
    fillPayment();
    fillToday();
    fillMenu();
    fillFeatures();
    fillGallery();
    fillNews();
    fillInsta();
    fillTV();
    fillMap();
    fillShop(); // 流し込んだ中にある data-shop・data-icon も埋める
    addStructuredData();
    bindScenes();
    bindHeader();
    bindSmoke();
    bindActions();
    // 開いたままでも、営業中・準備中の表示や放映予定は時間が進めば変わる
    setInterval(() => { fillToday(); fillTV(); }, 60 * 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
