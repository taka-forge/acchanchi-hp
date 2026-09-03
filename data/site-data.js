// ============================================================
// 観戦居酒屋あっちゃん家 ホームページ データファイル
// ------------------------------------------------------------
// 日常の更新はこのファイルだけ編集すればOK。
// 編集したらブラウザをリロードすると反映される。
// 【要確認】が付いている項目はお店に確認して書き換えること。
// ============================================================

const SITE_DATA = {

  // ---------- 基本情報 ----------
  shop: {
    name: "観戦居酒屋あっちゃん家",
    nameRoman: "ACCHANCHI",
    catchphrase: "スポーツ観戦しながら、うまい酒とメシ。",
    tel: "0475-47-3914",
    address: "〒297-0074 千葉県茂原市小林3136-4",
    access: "JR外房線「新茂原駅」から徒歩6分",
    instagramUrl: "https://www.instagram.com/kansen_izakaya_acchanchi/",
    instagramId: "@kansen_izakaya_acchanchi",
  },

  // ---------- 検索エンジン用の構造化データ（Google検索・マップ対策） ----------
  // 住所や営業時間を変えたらここも合わせて更新すること
  structured: {
    type: "BarOrPub",
    url: "https://acchanchi.com/",
    postalCode: "297-0074",
    region: "千葉県",
    locality: "茂原市",
    street: "小林3136-4",
    // 形式：曜日（Mo/Tu/We/Th/Fr/Sa/Su） 開店-閉店。定休日の曜日は入れない
    openingHours: "Mo,Tu,Th,Fr,Sa,Su 17:00-22:00",
    priceRange: "¥¥",
  },

  // ---------- 営業時間 ----------
  // 行を増やせば曜日ごとに分けられる
  hours: [
    { label: "営業時間", value: "17:00〜22:00" },
    { label: "定休日", value: "水曜日" },
    { label: "試合開催日", value: "試合に合わせて営業時間変更あり<br>（Instagramで告知）" },
  ],

  // ---------- 設備・席数など（店舗情報テーブルに表示） ----------
  facility: [
    { label: "席数", value: "カウンター6席／テーブル3卓（各6名）<br>座敷2卓（4名・6名）" },
    { label: "貸切", value: "20名以上で貸切可能" },
    { label: "駐車場", value: "あり（15〜20台）" },
  ],

  // ---------- お店の特徴（観戦環境など） ----------
  features: [
    {
      icon: "📺",
      title: "モニター5台でスポーツ観戦",
      text: "店内モニター5台でサッカー・野球など各種スポーツを放映。DAZN・WOWOWが視聴できます。",
    },
    {
      icon: "🍻",
      title: "みんなで乾杯・声出しOK",
      text: "ゴールの瞬間はみんなでハイタッチ！観戦仲間ができるお店です。",
    },
    {
      icon: "🏠",
      title: "アットホームな雰囲気",
      text: "初めてでも一人でも大丈夫。あっちゃんファミリーが温かくお迎えします。",
    },
    {
      icon: "🎉",
      title: "パブリックビューイング開催",
      text: "日本代表戦などの大一番はパブリックビューイングを開催。20名以上で貸切もOK！",
    },
    {
      icon: "🚗",
      title: "お車でも安心",
      text: "駐車場15〜20台完備。お仲間と乗り合わせでどうぞ（飲む方は運転代行・ハンドルキーパーで）。",
    },
  ],

  // ---------- メニュー ----------
  // 価格は数値のみ（円は自動で付く）。"〜"などを使いたいときは文字列でOK
  // 2026-09-03 店内メニュー表（ドリンク／お品書き）の内容に全面更新。価格はすべて税込
  menu: [
    {
      category: "串焼き（炭火焼き鳥）",
      note: "各150円（1本の価格）。ご注文は2本から承ります。味はタレ・塩から選べます",
      items: [
        { name: "ねぎま", price: 150 },
        { name: "もも", price: 150 },
        { name: "かわ", price: 150 },
        { name: "レバー", price: 150 },
        { name: "つくね", price: 150 },
        { name: "かしら", price: 150 },
        { name: "ヤゲンナンコツ", price: 150 },
        { name: "タン", price: 150 },
        { name: "やきとりの盛り合わせ", price: 700 },
      ],
    },
    {
      category: "一品料理（酒のあて）",
      note: "",
      items: [
        { name: "玉子焼き", price: 500 },
        { name: "冷やしトマト", price: 500 },
        { name: "きゅうり漬け", price: 450 },
        { name: "枝豆", price: 500 },
        { name: "タコワサ", price: 500 },
        { name: "ポテサラ", price: 450 },
        { name: "韓国のり", price: 200 },
      ],
    },
    {
      category: "おすすめ",
      note: "",
      items: [
        { name: "シソにんにく", price: 500 },
        { name: "アジのなめろう", price: 900 },
        { name: "タイのなめろう", price: 900 },
        { name: "ぶりのなめろう", price: 900 },
        { name: "刺身盛り合わせ（週末限定）", price: 1100 },
        { name: "ピリ辛もつ焼き", price: 1100 },
        { name: "旨辛チャーシュー", price: 1100 },
      ],
    },
    {
      category: "海鮮・焼き魚",
      note: "",
      items: [
        { name: "ホタテ焼き（醤油）", price: 900 },
        { name: "ホタテバター焼き", price: 950 },
        { name: "ガーリックシュリンプ", price: 900 },
        { name: "あさりの酒蒸し", price: 700 },
        { name: "ほっけの網焼き", price: 1200 },
        { name: "屋台風イカ焼き", price: 950 },
        { name: "サバみりん焼き", price: 950 },
      ],
    },
    {
      category: "揚げ物",
      note: "",
      items: [
        { name: "ポテト（塩）", price: 600 },
        { name: "ポテト（のり塩）", price: 700 },
        { name: "ポテト（明太マヨ）", price: 750 },
        { name: "オニオンリング", price: 700 },
        { name: "唐揚げ", price: 700 },
        { name: "軟骨唐揚げ", price: 800 },
        { name: "イカリング", price: 700 },
      ],
    },
    {
      category: "ご飯・麺",
      note: "",
      items: [
        { name: "チャーハン", price: 700 },
        { name: "チキンライス", price: 700 },
        { name: "ライス（味噌汁付き）", price: 350 },
        { name: "醤油ラーメン", price: 700 },
        { name: "うどん（冷・温）", price: 350 },
      ],
    },
    {
      category: "ビール",
      note: "",
      items: [
        { name: "生ビール（アサヒ）", price: "小400／中650／大850円" },
        { name: "瓶ビール（中瓶）", price: 700 },
        { name: "コロナビール", price: 700 },
        { name: "ノンアルコールビール（アサヒ／コロナ）", price: 450 },
      ],
    },
    {
      category: "サワー",
      note: "",
      items: [
        { name: "プレーン", price: 450 },
        { name: "レモンサワー", price: 500 },
        { name: "グレープフルーツサワー", price: 500 },
        { name: "カルピスサワー", price: 500 },
        { name: "ライチ＆白ぶどうサワー", price: 500 },
        { name: "洋梨＆りんごサワー", price: 500 },
        { name: "ライフガードサワー", price: 500 },
        { name: "こだわり酒場のレモンサワー", price: 550 },
        { name: "男梅サワー", price: 550 },
        { name: "ゆずみつサワー", price: 550 },
        { name: "ドデカミンサワー", price: 550 },
        { name: "カシスオレンジ", price: 550 },
        { name: "カシスティー", price: 550 },
        { name: "カシスソーダ", price: 550 },
        { name: "カシスウーロン", price: 550 },
        { name: "生レモンサワー", price: 600 },
      ],
    },
    {
      category: "ハイボール",
      note: "レモン追加は＋50円",
      items: [
        { name: "角ハイボール（ジョッキ）", price: 600 },
        { name: "角ハイボール（ジョッキ・濃いめ）", price: 650 },
        { name: "角ハイボール（大ジョッキ）", price: 850 },
        { name: "角ハイボール（大ジョッキ・濃いめ）", price: 900 },
        { name: "ジンジャーハイボール", price: 650 },
        { name: "コーラハイボール", price: 650 },
      ],
    },
    {
      category: "焼酎・梅酒・日本酒",
      note: "",
      items: [
        { heading: "焼酎（グラス）" },
        { name: "麦・芋・甲類", price: 600 },
        { name: "ソーダ割り", price: 600 },
        { name: "緑茶割り", price: 600 },
        { name: "ウーロン割り", price: 600 },
        { name: "ジャスミン茶割り", price: 600 },
        { heading: "梅酒" },
        { name: "ロック", price: 500 },
        { name: "水割り", price: 600 },
        { name: "ソーダ割り", price: 600 },
        { name: "ノンアル梅酒", price: 450 },
        { heading: "日本酒" },
        { name: "八海山（冷酒・熱燗）", price: 750 },
        { name: "梅一輪（冷酒・熱燗）", price: 650 },
      ],
    },
    {
      category: "ボトル",
      note: "割り材：水300・お湯300・お茶350・ウーロン茶350・ジャスミン茶350・カットレモン350・梅干し250",
      items: [
        { name: "キンミヤ", price: 2500 },
        { name: "いいちこ", price: 3000 },
        { name: "黒霧島", price: 3300 },
        { name: "赤霧島", price: 3300 },
        { name: "二階堂", price: 3500 },
        { name: "角瓶（ウイスキー）", price: 3500 },
      ],
    },
    {
      category: "ソフトドリンク",
      note: "オール350円",
      items: [
        { name: "ウーロン茶", price: 350 },
        { name: "緑茶", price: 350 },
        { name: "ジャスミン茶", price: 350 },
        { name: "コーラ", price: 350 },
        { name: "メロンソーダ", price: 350 },
        { name: "ジンジャーエール", price: 350 },
        { name: "100%オレンジジュース", price: 350 },
        { name: "100%りんごジュース", price: 350 },
        { name: "カルピス", price: 350 },
        { name: "カルピスソーダ", price: 350 },
        { name: "ゆずみつソーダ", price: 350 },
      ],
    },
  ],

  // ---------- 店内メニュー表の画像 ----------
  // お店のメニュー表（写真・画像）をそのまま載せる欄。images/ に入れてここに追加する。
  // 空配列 [] にすると、この欄はページに表示されない。
  menuImages: [
    { file: "menu-food.jpg", alt: "居酒屋あっちゃん家 お品書き（フードメニュー）" },
    { file: "menu-drink.jpg", alt: "居酒屋あっちゃん家 ドリンクメニュー" },
  ],

  // ---------- お知らせ・イベント ----------
  // 新しいものを一番上に追加する。古いものは消してOK（3〜5件程度が見やすい）
  news: [
    {
      date: "2026-06-21",
      title: "パブリックビューイング開催！日本代表 vs チュニジア代表",
      text: "13:00キックオフ。みんなで日本代表を応援しよう！",
    },
    {
      date: "2026-06-17",
      title: "観戦居酒屋あっちゃん家 オープンしました",
      text: "スポーツ観戦をしながらお酒・お食事を楽しめるお店です。ぜひお越しください！",
    },
  ],

  // ---------- Instagram投稿の埋め込み ----------
  // 見せたい投稿のURLを追加すると、その投稿がページに埋め込まれる。
  // 例: "https://www.instagram.com/p/XXXXXXXXXXX/"
  // （投稿ページを開いて「…」→「リンクをコピー」で取得。2〜3件推奨）
  instagramPosts: [],

  // ---------- 写真ギャラリー ----------
  // images/ フォルダに写真を入れて、ここにファイル名を追加する
  // 例: { file: "yakitori.jpg", alt: "名物の焼き鳥" }
  photos: [
    { file: "yakitori-sumibi.jpg", alt: "炭火で焼き上げる焼き鳥" },
    { file: "yakitori-mori.jpg", alt: "焼き鳥盛り合わせ" },
    { file: "kushi-beer.jpg", alt: "串焼きとキンキンの生ビール" },
    { file: "maguro-sashi.jpg", alt: "まぐろのぶつ切り刺し" },
    { file: "onion-rings.jpg", alt: "オニオンリング天ぷら" },
    { file: "interior-blackboard.jpg", alt: "カウンターと黒板のおすすめメニュー" },
    { file: "interior-counter.jpg", alt: "ユニフォームが飾られた店内カウンター" },
    { file: "interior-zashiki.jpg", alt: "ゆったりくつろげる座敷席" },
    { file: "exterior-sign.jpg", alt: "入口の看板「観戦できる居酒屋だよ〜」" },
    { file: "parking.jpg", alt: "駐車場完備（お店専用P）" },
  ],

  // ---------- ヒーロー画像（トップの大きな写真） ----------
  // images/ に写真を置いてファイル名を指定。空文字ならデザイン背景を表示
  heroImage: "exterior-night.jpg",
};
