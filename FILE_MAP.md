# GemoteWeb 檔案用途說明 (FILE_MAP)

本文件詳述專案中各個檔案與資料夾的功能，便於開發與維護。

## 📂 根目錄檔案
- **index.html**: 應用程式的主入口，包含 UI 結構（面板、按鈕、滑桿）與 3D 畫布容器。
- **main.js**: 應用程式的主邏輯，負責初始化所有模組並協調事件傳遞。
- **style.css**: 所有的 UI 樣式，包含深色主題、動畫效果與自定義控制項外觀。
- **run.bat / run.py**: 用於在本機啟動 Python Web 伺服器，解決 JS Module 的跨域限制。
- **Readme.md**: 專案介紹、功能說明與使用指南。
- **調整.txt**: 記錄功能變更需求與進度的工作文件（開發參考用）。

## 📂 js/ (核心邏輯模組)
- **StateManager.js**: **【核心】** 管理全域狀態（目前的模式、粒子點、對稱設定、專案名稱等）。所有 UI 變動都會通知此處，並發送更新給其他模組。
- **ThreeScene.js**: 負責 3D 場景的渲染（Three.js），包含相機控制、網格顯示、繪圖平面、Pivot 視覺化以及**參考人物模型 (Steve) 管理**。
- **UIManager.js**: 管理 HTML UI 元素與使用者互動，將視窗控制項（滑桿、按鈕）與 StateManager 連結。
- **ReflectionUtil.js**: 負責鏡像與放射對稱的幾何座標運算。
- **CodeGenerator.js**: 將記憶體中的粒子資料轉換為 GEmote 插件所需的 YAML 格式。
- **ProjectManager.js**: 處理專案的儲存與讀取（JSON 格式下載與上傳）。
- **LocalStorageManager.js**: 負責本機瀏覽器快取，提供「自動儲存」功能以防意外關閉。
- **LanguageManager.js**: 負責多語言切換邏輯。
- **ParticleRenderer.js**: 在 3D 場景中動態繪製與更新粒子（球體或線段）。
- **DrawingGroup.js**: 繪圖群組類別，將一次筆畫或形狀組合在一起，便於選取、移動與設定動畫。
- **AnimationPreview.js**: 處理動畫預覽邏輯，根據延遲設定在 3D 場景中播放粒子出現順序。
- **SceneSync.js**: 負責同步 StateManager 裡的資料到 Three.js 場景物件中。

### 🛠️ 工具類 (Tools)
- **BrushTool.js**: 筆刷工具邏輯，處理滑鼠拖拽路徑的點生成。
- **ShapeTool.js**: 方形與圓形工具邏輯，根據密度計算幾何點位。
- **EraserTool.js**: 橡皮擦邏輯，支援「擦除單點」或「擦除整個群組」。
- **SelectionManager.js**: 處理點選或框選群組的邏輯，包含位移與刪除選中物。
- **CursorManager.js**: 根據當前模式切換 3D 場景中滑鼠指標的外觀。
- **MirrorManager.js**: 管理場景中鏡像參考面與 Pivot 標記的視覺化顯示。

## 📂 js/lang/ (語系檔)
- **zh_tw.js**: 繁體中文翻譯。
- **zh_cn.js**: 簡體中文翻譯。
- **en.js**: 英文翻譯。

---
*最後更新日期: 2026/05/04*

