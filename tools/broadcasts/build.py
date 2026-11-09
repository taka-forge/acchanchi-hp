"""あっちゃん家の放映予定（data/broadcasts.js）を作る。

使い方:
  python build.py --site <サイトのフォルダ>            # 作って書き出す。まとめを画面に出す
  python build.py --site <サイトのフォルダ> --dry-run  # 書き出さずに、まとめだけ出す
  python build.py --site <サイトのフォルダ> --slack    # まとめを Slack にも送る（SLACK_BOT_TOKEN と SLACK_CHANNEL が要る）
  python build.py --site . --strict --slack-on-fail   # 毎日の自動更新（公開リポジトリの Actions）。一部失敗・0件なら書き換えず Slack に知らせる
  変化がないときは書き出さない（--touch で作った日時だけ更新する。週1の生存確認用）

やること:
  1. データ元から向こう数日の試合を集める（Jリーグ公式・WOWOW公式・手入力の manual.json）
  2. 区分（S＝必ず載せる／A＝営業時間内なら載せる）を付ける。区分は config.json
  3. 営業時間（サイトの site-data.js の openingHours）と試合の時間の重なりを見る
     - 試合の大半が営業時間内 → 「流す」
     - 一部だけ重なる → 「流す」＋「途中から／途中まで」
     - ほとんど重ならない → 区分Sなら「予約制」（予約があれば開ける）、区分Aなら載せない
  4. 同じ時間に流すのは max_concurrent（3）試合まで。S を先に入れる
  5. data/broadcasts.js に書き出す（人は触らない。ページの main.js が読む）

DAZN の番組表は使わない（非公開の取得口で、規約で自動のデータ収集を禁じている版がある）。
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
JST = dt.timezone(dt.timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept-Language": "ja"}
DAY_KEYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]  # datetime.weekday() の順
LEAGUE_LABEL = {"j1": "J1", "acle": "ACLエリート", "acl2": "ACL2", "leaguecup": "ルヴァンカップ"}
DAZN_ALL = ("j1", "acle", "acl2")  # 全試合をDAZNが配信している大会


def get(url):
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


# ---------- 営業時間（site-data.js の structured.openingHours を読む） ----------
def load_opening_hours(site_dir):
    src = (Path(site_dir) / "data" / "site-data.js").read_text(encoding="utf-8")
    block = re.search(r"openingHours:\s*\[(.*?)\]", src, flags=re.S)
    week = {}
    for line in re.findall(r'"([^"]+)"', block.group(1) if block else ""):
        m = re.match(r"([A-Za-z,]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$", line)
        if not m:
            continue
        open_min = int(m[2]) * 60 + int(m[3])
        close_min = int(m[4]) * 60 + int(m[5])
        for key in m[1].split(","):
            week[key.strip()] = (open_min, close_min)
    if not week:
        raise SystemExit("site-data.js の openingHours が読めない")
    return week


def open_intervals(week, first_day, days):
    """日付ごとの営業時間を、絶対時刻の区間の一覧にする（24:00 閉店は翌日0時）"""
    out = []
    for i in range(-1, days + 1):
        d = first_day + dt.timedelta(days=i)
        hours = week.get(DAY_KEYS[d.weekday()])
        if hours:
            base = dt.datetime.combine(d, dt.time(0, 0), tzinfo=JST)
            out.append((base + dt.timedelta(minutes=hours[0]), base + dt.timedelta(minutes=hours[1])))
    return out


# ---------- データ元：Jリーグ公式（配信ページに埋め込まれた試合データ） ----------
def _next_flight(page):
    chunks = re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', page)
    return "".join(json.loads(c) for c in chunks)


def _cut_object(text, start):
    depth = 0
    for j, ch in enumerate(text[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:j + 1])
    raise ValueError("JSONの終わりが見つからない")


def from_jleague(cfg, log):
    s_teams, a_teams = set(cfg["jleague"]["S"]), set(cfg["jleague"]["A"])
    seen, items, skipped = set(), [], 0
    watchable = set(cfg["watchable"])
    for url in cfg["jleague"]["pages"]:
        flight = _next_flight(get(url))
        lists = [m.start() for m in re.finditer(re.escape('{"list":[{"id":0,"matchDate"'), flight)]
        if not lists:
            raise ValueError(f"試合データが見つからない（ページの作りが変わった？）: {url}")
        for pos in lists:
            for day in _cut_object(flight, pos)["list"]:
                for sec in day["sectionList"]:
                    for g in sec["matchList"]:
                        key = g.get("detailHref") or g.get("id")
                        home, away = g["homeTeam"]["name"], g["awayTeam"]["name"]
                        tier = "S" if {home, away} & s_teams else "A" if {home, away} & a_teams else None
                        if key in seen or not tier:
                            continue
                        seen.add(key)
                        plats = g.get("streamingPlatform") or []
                        names = [p["name"] for p in plats if isinstance(p, dict) and p.get("name")] if isinstance(plats, list) else []
                        # J1・ACLは全試合DAZN（ページには追加の放送だけが載る）。ルヴァンカップはスカパー！など（参照で名前が取れないものは不明＝載せない）
                        base = ["DAZN"] if sec["leagueName"] in DAZN_ALL else []
                        names = base + [n for n in names if n in watchable]
                        if not names:  # スカパー！だけ・録画だけなど、店で見られない試合は載せない
                            skipped += 1
                            continue
                        league = LEAGUE_LABEL.get(sec["leagueName"], sec.get("leagueDisplayName", ""))
                        # 「リーグステージ　ＭＤ4　東地区」→「第4節」
                        section = (sec.get("sectionText") or "").split("東地区")[0]
                        md = re.search(r"ＭＤ\s*(\d+)", section)
                        section = f"第{md[1]}節" if md else section.replace("リーグステージ", "").replace("グループステージ", "").strip()
                        names_map = cfg["jleague"].get("display_names", {})
                        items.append({
                            "date": day["matchDateKey"], "time": g.get("time"), "sport": "サッカー",
                            "league": f"{league} {section}".strip(),
                            "match": f"{names_map.get(home, home)} vs {names_map.get(away, away)}",
                            "tags": sorted(set(names)), "tier": tier, "source": "Jリーグ公式",
                        })
    log.append(f"Jリーグ公式：{len(items)}試合（対象チームのみ。店で見られない放送のみの{skipped}試合は除外）")
    return items


# ---------- データ元：WOWOW公式（スポーツ別の番組ページ） ----------
def _guess_date(month, day, today):
    for year in (today.year, today.year + 1, today.year - 1):
        d = dt.date(year, month, day)
        if -30 <= (d - today).days <= 300:
            return d
    return dt.date(today.year, month, day)


def from_wowow(cfg, log, today):
    s_teams = set(cfg["wowow"]["S_teams"])
    items = []
    for page in cfg["wowow"]["pages"]:
        text = get(page["url"])
        for li in re.findall(r"<li>(.*?)</li>", text, flags=re.S):
            m = re.search(r'<p class="date"><span>(\d{1,2})/(\d{1,2})</span>[^<]*?(午前|午後)<span>(\d{1,2}):(\d{2})</span>', li)
            teams = [html.unescape(re.sub(r"<[^>]+>", "", t)).strip() for t in re.findall(r'<div class="team">(.*?)</div>', li, flags=re.S)]
            if not m or len(teams) != 2 or not set(teams) & s_teams:
                continue
            if 'alt="生"' not in li:  # 生中継だけ（リピート放送は載せない）
                continue
            hour = int(m[4]) % 12 + (12 if m[3] == "午後" else 0)
            d = _guess_date(int(m[1]), int(m[2]), today)
            items.append({
                "date": d.isoformat(), "time": f"{hour}:{m[5]}", "sport": page["sport"], "league": page.get("league", ""),
                "match": f"{teams[0]} vs {teams[1]}", "tags": ["WOWOW"], "tier": "S", "source": "WOWOW公式",
            })
    log.append(f"WOWOW公式：{len(items)}試合（日本戦の生中継のみ）")
    return items


# ---------- データ元：手入力 ----------
def from_manual(cfg, log):
    data = json.loads((HERE / cfg["manual_file"]).read_text(encoding="utf-8"))
    items = [dict(i, source="手入力") for i in data["items"]]
    log.append(f"手入力：{len(items)}試合")
    return items


# ---------- 営業時間との重なりで「流す／予約制」を決める ----------
def hm(t, close=False):
    """17:00 の形にする。閉店の 0:00 は 24:00 と書く"""
    if close and t.hour == 0 and t.minute == 0:
        return "24:00"
    return f"{t.hour}:{t.minute:02d}"


def classify(items, week, cfg, now):
    today = now.date()
    intervals = open_intervals(week, today, cfg["lookahead_days"])
    kept, dropped = [], []
    for it in items:
        d = dt.date.fromisoformat(it["date"])
        if not (today <= d <= today + dt.timedelta(days=cfg["lookahead_days"])):
            continue
        if it.get("time") is None:
            # 時刻未定：その日が定休日なら予約制、営業日なら流す（時刻は決まりしだい）
            closed = DAY_KEYS[d.weekday()] not in week
            if closed and it["tier"] != "S":
                dropped.append((it, "時刻未定・定休日"))
                continue
            kept.append(dict(it, mode="reserve" if closed else "open", note="時刻は決まりしだい"))
            continue
        h, mi = map(int, it["time"].split(":"))
        start = dt.datetime.combine(d, dt.time(h, mi), tzinfo=JST)
        dur = dt.timedelta(minutes=cfg["duration_minutes"].get(it["sport"], cfg["duration_minutes"]["その他"]))
        end = start + dur
        if end < now:
            continue
        best = max(intervals, key=lambda iv: min(end, iv[1]) - max(start, iv[0]))
        overlap = max(dt.timedelta(0), min(end, best[1]) - max(start, best[0]))
        ratio = overlap / dur
        if ratio >= 0.75:
            kept.append(dict(it, mode="open", note="", _start=start, _end=end))
        elif ratio >= 0.3:
            note = f"{hm(best[0])}の開店から" if start < best[0] else f"{hm(best[1], close=True)}の閉店まで"
            kept.append(dict(it, mode="open", note=note, _start=start, _end=end))
        elif it["tier"] == "S":
            kept.append(dict(it, mode="reserve", note="", _start=start, _end=end))
        else:
            dropped.append((it, "営業時間外"))
    # 同じ時間に流すのは max_concurrent 試合まで（S を先に）
    result, open_slots = [], []
    for it in sorted(kept, key=lambda x: (x["tier"], x["date"], x.get("time") or "99:99")):
        if it["mode"] == "open" and "_start" in it:
            busy = [o for o in open_slots if o["_start"] < it["_end"] and it["_start"] < o["_end"]]
            if len(busy) >= cfg["max_concurrent"]:
                dropped.append((it, f"同じ時間に{cfg['max_concurrent']}試合を超える"))
                continue
            open_slots.append(it)
        result.append(it)
    result.sort(key=lambda x: (x["date"], x.get("time") or "99:99"))
    return result, dropped


# ---------- 書き出しとまとめ ----------
PUBLIC_KEYS = ("date", "time", "sport", "league", "match", "tags", "mode", "note")


def write_js(site_dir, items, now):
    payload = {"generated": now.isoformat(timespec="minutes"), "items": [{k: it.get(k) for k in PUBLIC_KEYS} for it in items]}
    body = (
        "// 放映予定（自動で作成：tools/broadcasts/build.py）。手で書き換えない\n"
        "// 手で足したい試合は tools/broadcasts/manual.json に書く\n"
        f"const BROADCASTS = {json.dumps(payload, ensure_ascii=False, indent=2)};\n"
    )
    (Path(site_dir) / "data" / "broadcasts.js").write_text(body, encoding="utf-8")


def summary(items, dropped, log, now):
    def line(it):
        t = it.get("time") or "時刻未定"
        d = dt.date.fromisoformat(it["date"])
        if it.get("time") and int(t.split(":")[0]) < 5:  # 0〜4時台は前の日の深夜として書く（ページと同じ）
            d, t = d - dt.timedelta(days=1), "深夜" + t
        wd = "月火水木金土日"[d.weekday()]
        extra = f"（{it['note']}）" if it.get("note") else ""
        return f"• {d.month}/{d.day}（{wd}）{t}　{it['match']}　{it['league']}　[{'・'.join(it['tags'])}]{extra}"
    lines = [f"*あっちゃん家 放映予定*（{now:%m/%d %H:%M} 作成）", "", "*通常営業で流す*"]
    lines += [line(i) for i in items if i["mode"] == "open"] or ["• なし"]
    lines += ["", "*予約制（営業時間外・予約があれば開ける）*"]
    lines += [line(i) for i in items if i["mode"] == "reserve"] or ["• なし"]
    if dropped:
        lines += ["", f"_載せなかった試合：{len(dropped)}件（営業時間外の区分A、同時に3試合を超えたもの など）_"]
    lines += ["", "_データ元：" + "／".join(log) + "_"]
    return "\n".join(lines)


def post_slack(text):
    token, channel = os.environ.get("SLACK_BOT_TOKEN"), os.environ.get("SLACK_CHANNEL")
    if not token or not channel:
        raise SystemExit("SLACK_BOT_TOKEN と SLACK_CHANNEL が要る")
    r = requests.post("https://slack.com/api/chat.postMessage", timeout=30,
                      headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
                      data=json.dumps({"channel": channel, "text": text}))
    if not r.json().get("ok"):
        raise SystemExit(f"Slack に送れなかった: {r.text[:200]}")


def read_previous(site_dir):
    """前回書き出した一覧（試合の部分だけ）。無ければ None"""
    path = Path(site_dir) / "data" / "broadcasts.js"
    if not path.exists():
        return None
    m = re.search(r"const BROADCASTS = (\{.*\});", path.read_text(encoding="utf-8"), flags=re.S)
    return json.loads(m.group(1))["items"] if m else None


class Stop(Exception):
    """一覧を書き換えずに止める（前の一覧をそのまま残す）。code は終了コード"""
    def __init__(self, msg, code):
        super().__init__(msg)
        self.code = code


def run(args):
    cfg = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
    now = dt.datetime.now(JST)
    week = load_opening_hours(args.site)
    log, items, failed = [], [], []
    for name, fn in (("Jリーグ公式", lambda: from_jleague(cfg, log)),
                     ("WOWOW公式", lambda: from_wowow(cfg, log, now.date())),
                     ("手入力", lambda: from_manual(cfg, log))):
        try:
            items += fn()
        except Exception as e:  # 1つのデータ元が壊れても、まず残りで作ってみる
            failed.append(name)
            log.append(f"{name}：取れなかった（{type(e).__name__}: {e}）")
    if len(failed) == 3:
        raise Stop("どのデータ元も取れなかった：" + " / ".join(log), 2)

    result, dropped = classify(items, week, cfg, now)
    text = summary(result, dropped, log, now)
    print(text)
    # 毎日の自動更新（--strict）では、半端な一覧や空の一覧で上書きしない。前の一覧のほうが正しい
    if args.strict and failed:
        raise Stop("一部のデータ元が取れなかったので、一覧は書き換えていない：" + " / ".join(log), 2)
    previous = read_previous(args.site)
    public = [{k: it.get(k) for k in PUBLIC_KEYS} for it in result]
    if args.strict and not public and previous:
        raise Stop(f"試合が0件になった（前回は{len(previous)}件）。取り方の不具合の可能性があるので、書き換えていない", 3)
    if args.dry_run:
        print("\n（--dry-run：書き出していない）")
    elif public == previous and not args.touch:
        print("\n変化なし：書き出していない")
    else:
        write_js(args.site, result, now)
        print("\ndata/broadcasts.js を書き出した")
    if args.slack:
        post_slack(text)
    if failed:
        sys.exit(2)  # 一部のデータ元が取れなかった（一覧は残りで作った）


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True, help="サイトのフォルダ（data/site-data.js がある場所）")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--slack", action="store_true", help="まとめを Slack にも送る")
    ap.add_argument("--strict", action="store_true", help="一部失敗・0件のときは書き換えない（毎日の自動更新用）")
    ap.add_argument("--touch", action="store_true", help="変化がなくても書き出す（作った日時を更新する）")
    ap.add_argument("--slack-on-fail", action="store_true", help="止まったときだけ Slack に知らせる")
    args = ap.parse_args()
    try:
        run(args)
    except Stop as e:
        print(f"\n止めた：{e}")
        if args.slack_on_fail:
            post_slack(f":warning: *あっちゃん家 放映予定の自動更新が止まった*\n{e}\nHPは前の一覧のまま。くろに直してもらう")
        sys.exit(e.code)
    except Exception as e:  # 想定外の壊れ方（営業時間が読めない など）も知らせる
        if args.slack_on_fail:
            post_slack(f":warning: *あっちゃん家 放映予定の自動更新が止まった*\n想定外のエラー：{type(e).__name__}: {e}\nHPは前の一覧のまま。くろに直してもらう")
        raise


if __name__ == "__main__":
    main()
