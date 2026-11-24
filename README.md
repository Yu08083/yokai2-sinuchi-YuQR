# 妖怪ウォッチ2 真打限定 任意コード実行 QRまとめ

妖怪ウォッチ2 真打（v3.4.0 / New 3DS）で、QRコードからアイテム・妖怪・ボス図鑑を
受け取るためのQR画像をまとめた静的サイトです。

- アイテム 1,040件
- 妖怪 398件（図鑑番号つき）
- ボス 50件（図鑑登録のみ）

## 使い方

1. トップの「前提条件」を確認する
2. タブ（アイテム / 妖怪 / ボス）を選ぶ
3. 名前・図鑑番号で絞り込み、行をクリックしてQRを表示
4. QRを3DSのカメラで読み取る

読み取りにくいときは、QR表示の **「読み込みやすくする」** を押すと
白画面にQRだけを大きく出します。クリック / Esc で戻ります。

受け取れないときは **「できない人用」** を確認してください。

## 構成

```
index.html        画面
app.js            一覧・検索・QR表示・読み込みやすくするモード
catalog.js        収録データ（window.qrCatalog）
style.css
qr/item/          アイテムQR（可逆WebP）
qr/yokai/         妖怪QR（可逆WebP）
qr/boss_dex/      ボス図鑑QR（可逆WebP）
```

画像はすべて可逆WebP（`VP8L` のみ、メタ情報なし）です。

## 生成

QRは `yw2_export.py` で作り、`catalog.py` が `catalog.js` と `qr/` を組み立てます。

```
python yw2_export.py --kind boss     # → ~/Downloads/boss_dex/*.webp
python catalog.py                    # → dist/catalog.js, dist/qr/*
```

## 注意

- ゲームのセーブデータを書き換える可能性があります。バックアップを取ってから使ってください。
- 自己責任でお願いします。
