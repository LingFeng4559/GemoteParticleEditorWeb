# Gemote Particle Editor Web

專為 Minecraft **GEmote** 製作的 Web 版 3D 粒子特效編輯器，支援圖片轉粒子、圖層與群組、時間軸動畫及 YML 匯出。

A browser-based 3D particle effect editor for Minecraft **GEmote**, with image-to-particle conversion, layers, timeline animation, and YML export.

## Language / 語言

編輯器可在頂部工具列即時切換語言，並記住上次選擇。

The editor supports instant language switching from the top toolbar and remembers your selection.

- [繁體中文說明](Readme-zh_tw.md)
- [简体中文说明](Readme-zh_cn.md)
- [English documentation](Readme-us.md)

## Current features

- 圖片匯入、位置與大小校正、像素轉粒子
- 圖層、巢狀群組、顯示、Solo、鎖定及匯出控制
- Spin、Orbit、Wave、Noise 與 Transform 關鍵影格
- 左旋／右旋、多圈旋轉與逐列修改器刪除
- 全域影像間隔與總影像格數
- 循環動畫採用終點不重複取樣，例如 360 格為 0°～359°
- 完整品質匯出；品質限制不會改變設定的影格 delay
- YML 編輯器註解可還原圖層、群組與動畫資料
- 繁體中文、簡體中文與 English 介面

## Quick start

### Live demo

[https://lingfeng4559.github.io/GemoteParticleEditorWeb/](https://lingfeng4559.github.io/GemoteParticleEditorWeb/)

### Windows

1. 下載或 clone 專案。
2. 執行 `run.bat`。
3. 瀏覽器會開啟本機編輯器。

### Other platforms

1. 安裝 Python 3。
2. 執行 `python run.py`。
3. 開啟 `http://localhost:8000`。

## Animation timing

動畫週期為：

```text
影像間隔（tick） × 總影像格數
```

最後一個取樣點是「動畫週期 − 一個影像間隔」，下一格直接循環回第 0 格，因此不會重複輸出與起點相同的終點影格。

## License

This project is released as open source. For the GEmote plugin itself, refer to the original author's license agreement.
