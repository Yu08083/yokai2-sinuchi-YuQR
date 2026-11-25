# 妖怪ウォッチ2 真打限定 任意コード実行 QRまとめ

妖怪ウォッチ2 真打（v3.4.0 / New 3DS）で、QRコードからアイテム・妖怪・ボス図鑑を
受け取るためのQR画像をまとめた静的サイトです。

- アイテム 1,040件
- 妖怪 398件（図鑑番号つき）
- ボス 50件（図鑑登録のみ）

## 使い方

1. トップの「前提条件」を確認する
2. 右上の「主人公」で **男 / 女** を選ぶ（セーブの性別に合わせる）
3. タブ（アイテム / 妖怪 / ボス）を選ぶ
4. 名前・図鑑番号で絞り込み、行をクリックしてQRを表示
5. QRを3DSのカメラで読み取る

男セーブと女セーブではヒープの配置が `0x6000` ずれるため、QRは別々です。
性別を間違えると読み取り後に落ちます。

読み取りにくいときは、QR表示の **「読み込みやすくする」** を押すと
白画面にQRだけを大きく出します。クリック / Esc で戻ります。

受け取れないときは **「できない人用」** を確認してください。

## 構成

```
index.html        画面
app.js            一覧・検索・QR表示・読み込みやすくするモード
catalog.js        収録データ（window.qrCatalog）
style.css
tinko/item/       アイテムQR（男セーブ用・可逆WebP）
tinko/yokai/      妖怪QR（男セーブ用）
tinko/boss_dex/   ボス図鑑QR（男セーブ用）
manko/item/       アイテムQR（女セーブ用）
manko/yokai/      妖怪QR（女セーブ用）
manko/boss_dex/   ボス図鑑QR（女セーブ用）
```

画像はすべて可逆WebP（`VP8L` のみ、メタ情報なし）です。

## 生成

QRは `yw2_export.py` で作り、`catalog.py` が `catalog.js` と `qr/` を組み立てます。

```
# 男（B = 0x1657AFF4）
python yw2_export.py --kind both
python yw2_export.py --kind boss

# 女（B = 0x16574FF4、owner は B に追従）
python yw2_export.py --kind both --b 0x16574FF4 --out female
python yw2_export.py --kind boss --b 0x16574FF4 --out female

python catalog.py    # → dist/catalog.js, dist/tinko/*, dist/manko/*
```

## クレジット

- QRペイロードの元になった解析・実装: [0xiuks](https://github.com/0xiuks)

## 注意

- ゲームのセーブデータを書き換える可能性があります。バックアップを取ってから使ってください。
- 自己責任でお願いします。
