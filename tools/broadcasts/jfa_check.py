"""毎月1日の日本代表戦チェック。結果を Slack に送る（公開リポジトリの Actions から動かす）。

日本代表の地上波は自動で取れる元がないので、manual.json に手で足している。その漏れを月1回見つけるための知らせ。
  1. JFA公式のSAMURAI BLUEのページから、試合ページへのリンク（/samuraiblue/YYYYMMDD/）の日付を拾う
  2. manual.json に入っている日本代表戦と比べて、入っていない日付を「候補」として出す
  3. JFAのページが読めなくても、「確認日です」の知らせとリンクは送る（確認そのものは止めない）

使い方:
  python jfa_check.py            # Slack に送る（SLACK_BOT_TOKEN と SLACK_CHANNEL が要る）
  python jfa_check.py --dry-run  # 送らずに画面に出す
"""
import argparse
import datetime as dt
import json
import re
import sys

from build import HERE, JST, get, post_slack

JFA_URL = "https://www.jfa.jp/samuraiblue/"
LOOKAHEAD_DAYS = 120


def jfa_dates(today):
    page = get(JFA_URL)
    dates = set()
    for s in re.findall(r"/samuraiblue/(20\d{6})/", page):
        try:
            d = dt.datetime.strptime(s, "%Y%m%d").date()
        except ValueError:
            continue
        if today <= d <= today + dt.timedelta(days=LOOKAHEAD_DAYS):
            dates.add(d)
    return sorted(dates)


def manual_matches(today):
    cfg = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
    data = json.loads((HERE / cfg["manual_file"]).read_text(encoding="utf-8"))
    out = []
    for it in data["items"]:
        d = dt.date.fromisoformat(it["date"])
        if d >= today and it.get("sport") == "サッカー" and "日本" in it.get("match", ""):
            out.append((d, it))
    return sorted(out, key=lambda x: x[0])


def fmt(d):
    return f"{d.month}/{d.day}（{'月火水木金土日'[d.weekday()]}）"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    today = dt.datetime.now(JST).date()

    have = manual_matches(today)
    lines = ["*あっちゃん家 月1の日本代表戦チェック*", "", "*HPに入っている代表戦（manual.json）*"]
    lines += [f"• {fmt(d)}{it.get('time') or '時刻未定'}　{it['match']}　[{'・'.join(it.get('tags', []))}]" for d, it in have] or ["• なし"]

    try:
        found = jfa_dates(today)
        missing = [d for d in found if d not in {d for d, _ in have}]
        lines += ["", f"*JFAのページにあって、HPに入っていない日（向こう{LOOKAHEAD_DAYS}日）*"]
        lines += [f"• {fmt(d)}　{JFA_URL}{d:%Y%m%d}/" for d in missing] or ["• なし（JFAのページで見つかった試合は全部入っている）"]
    except Exception as e:  # 読めなくても知らせは送る
        lines += ["", f"_JFAのページを自動で読めなかった（{type(e).__name__}）。下のリンクを目で確認して_"]

    lines += ["", f"JFA：{JFA_URL}",
              "_JFAのページに載らない試合（発表直後など）もあるので、ニュースも見て。足すときはくろに「代表戦の確認して」_"]
    text = "\n".join(lines)
    print(text)
    if not args.dry_run:
        post_slack(text)


if __name__ == "__main__":
    main()
