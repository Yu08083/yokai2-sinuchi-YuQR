# 妖怪ウォッチ2 真打限定 任意コード実行 QRまとめ

妖怪ウォッチ2 真打（v3.4.0 / New 3DS）で、QRコードからアイテム・妖怪・ボス図鑑を
受け取るためのQR画像をまとめた静的サイトです。

- アイテム 1,040件
- 妖怪 398件（図鑑番号つき）
- ボス 50件（図鑑登録のみ）
- DLCフラグ 4件（ワンダーニャン / ロボニャンF型 / セーラーニャン / マスクドニャーン）

## 使い方

1. トップの「前提条件」を確認する
2. 右上の「主人公」で **男 / 女** を選ぶ（セーブの性別に合わせる）
3. タブ（アイテム / 妖怪 / ボス / DLC）を選ぶ
4. 名前・図鑑番号で絞り込み、行をクリックしてQRを表示
5. QRを3DSのカメラで読み取る

男セーブと女セーブではヒープの配置が `0x6000` ずれるため、QRは別々です。
性別を間違えると読み取り後に落ちます。

読み取りにくいときは、QR表示の **「読み込みやすくする」** を押すと
白画面にQRだけを大きく出します。クリック / Esc で戻ります。
このときQRは1モジュール=整数pxで描き直すので、拡大しても輪郭が崩れません。

この「読み込みやすくする」では、**LZ10圧縮版の小さいQR**（アイテム v16 / 図鑑つき妖怪 v17）を
表示します。通常表示のQRは v18〜v19 です。小さい方が読み取りやすいので、
うまくいかないときはこちらを使ってください。

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
tinko_small/      男セーブ用の小さいQR（読み込みやすくするモードで使用）
manko_small/      女セーブ用の小さいQR（同上）
flag_male/        DLCフラグQR（男セーブ用）
flag_female/      DLCフラグQR（女セーブ用）
```

画像はすべて可逆WebP（`VP8L` のみ、メタ情報なし）です。

## 生成

QRは `yw2_export.py` で作り、`catalog.py` が `catalog.js` と `qr/` を組み立てます。

```
# 男（B = 0x1657AFF4）通常QR
python yw2_export.py --kind both --out tinko
python yw2_export.py --kind boss --out tinko

# 男・小さいQR（読み込みやすくするモード用）
python yw2_export.py --kind both --compress --out tinko_small
python yw2_export.py --kind boss --compress --out tinko_small

# 女（B = 0x16574FF4、owner は B に追従）通常QR
python yw2_export.py --kind both --b 0x16574FF4 --out manko
python yw2_export.py --kind boss --b 0x16574FF4 --out manko

# 女・小さいQR
python yw2_export.py --kind both --compress --b 0x16574FF4 --out manko_small
python yw2_export.py --kind boss --compress --b 0x16574FF4 --out manko_small
```

## クレジット

- QRペイロードの元になった解析・実装: [0xiuks](https://github.com/0xiuks)

## 注意

- ゲームのセーブデータを書き換える可能性があります。バックアップを取ってから使ってください。
- 自己責任でお願いします。
