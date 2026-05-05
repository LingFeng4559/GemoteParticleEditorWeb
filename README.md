# Gemote Particle Effect 3D Editor

[繁體中文](#繁體中文) | [简体中文](#简体中文) | [English](#english)

---

## 🔗 相關連結 (Links)
- **GitHub Repository**: [LingFeng4559/GemoteParticleEditorWeb](https://github.com/LingFeng4559/GemoteParticleEditorWeb)
- **Live Demo (網站佈署)**: [https://lingfeng4559.github.io/GemoteParticleEditorWeb/](https://lingfeng4559.github.io/GemoteParticleEditorWeb/)

---

<a name="繁體中文"></a>

# 🇭🇰/🇹🇼 繁體中文

## 📜 致謝與專案背景

本專案是基於 **[Ninepin123](https://github.com/Ninepin123)** 所開發的 [MythicMobs 粒子編輯器](https://github.com/Ninepin123/Ninepin123.github.io) 進行深度修改與重構而成。

**特別說明**：原始專案與本重構專案均採用 **AI 輔助生成**。若您在開發過程中遇到任何問題或 bug，歡迎在 [GitHub Issues](https://github.com/LingFeng4559/GemoteParticleEditorWeb/issues) 進行反饋。

原專案主要用於製作 MythicMobs 的技能特效。我們將其核心邏輯轉向支援 **GEmote** 的 YAML 格式，並加入了專屬設定與現代化的多語言介面。您也可以查看 `目錄/js/lang` 資料夾來添加或修改自定義的語言配置檔。

## 🚀 功能特色

- **3D 互動畫布**：支援 360 度旋轉、縮放與平移，從任何角度繪製特效。
- **多樣化繪圖工具**：
    - **筆刷 (Brush)**：在 3D 平面上隨手繪製。
    - **點 (Point)**：精確放置單個粒子。
    - **形狀 (Shapes)**：快速生成完美的矩形與圓形。
- **進階對稱系統 (NEW)**：
    - **獨立三軸鏡像**：X、Y、Z 軸可獨立開啟或疊加。
    - **自訂中心點 (Pivot)**：可自訂對稱中心，並支援「自動跟隨平台」功能。
    - **放射鏡像 (Radial Symmetry)**：支援繞三軸旋轉複製，具備均分與固定間隔模式。
- **粒子密度控制 (NEW)**：
    - **1:1 精確校正**：UI 數值、預覽效果與實際生成結果完全一致。
    - **即時預覽圖**：在調整時可直觀看到粒子的分佈疏密感。
- **參考人物模型 (NEW)**：
    - 內建 1.8 單位高度的 Steve 模型，作為比例與空間感參考。
    - 支援 **100% 模式**、**幽靈模式 (Ghost)** 與 **隱藏模式**。
- **動畫系統**：支援逐粒子延遲（Tick Delay），內建即時動畫預覽。
- **Minecraft 1.21 兼容**：內建完整的粒子清單。
- **專案管理**：支援將作品儲存為 `.gemote3d` 格式以供後續編輯。

## 🛠️ 詳細使用說明 (節錄)
1. **一鍵啟動 (Windows)**：直接雙擊資料夾中的 `run.bat`。
2. **手動啟動**：執行 `python run.py`。
3. **匯出**：點擊「生成程式碼」，將 `.yml` 放入伺服器 `plugins/GEmote/emotes/` 目錄。

---

<a name="简体中文"></a>

# 🇨🇳 简体中文

## 📜 致谢与项目背景

本项目是基于 **[Ninepin123](https://github.com/Ninepin123)** 所开发的 [MythicMobs 粒子编辑器](https://github.com/Ninepin123/Ninepin123.github.io) 进行深度修改与重构而成。

**特别说明**：原始项目与本重构项目均采用 **AI 辅助生成**。若您在开发过程中遇到任何问题或 bug，欢迎在 [GitHub Issues](https://github.com/LingFeng4559/GemoteParticleEditorWeb/issues) 进行反馈。

原项目主要用于制作 MythicMobs 的技能特效。我们将视角核心逻辑转向支持 **GEmote** 的 YAML 格式，并加入了专属设定与现代化的多语言界面。

## 🚀 功能特色

- **3D 互动画布**：支持 360 度旋转、缩放与平移。
- **多样化绘图工具**：支持笔刷、点、矩形与圆形。
- **进阶对称系统**：支持 X、Y、Z 三轴独立镜像及放射镜像。
- **粒子密度控制**：1:1 精确校正，实时预览。
- **参考人物模型**：内置 Steve 模型作为空间参考。
- **动画系统**：支持逐粒子延迟（Tick Delay）与动画预览。

## 🛠️ 运行环境准备
- **一键启动 (Windows)**：双击 `run.bat`。
- **手动启动**：执行 `python run.py` 或使用 VS Code "Live Server"。

---

<a name="english"></a>

# 🇺🇸 English

## 📜 Credits & Background

This project is deeply modified and refactored based on the [MythicMobs Particle Editor](https://github.com/Ninepin123/Ninepin123.github.io) developed by **[Ninepin123](https://github.com/Ninepin123)**.

**Note**: Please report any bugs on [GitHub Issues](https://github.com/LingFeng4559/GemoteParticleEditorWeb/issues).

The original project was for MythicMobs. We refactored it to support **GEmote** YAML format and added a modern multi-language interface.

## 🚀 Key Features

- **3D Interactive Canvas**: 360-degree rotation, zooming, and panning.
- **Diverse Drawing Tools**: Brush, Point, and Shapes (Rectangle/Circle).
- **Advanced Symmetry System**: Independent Triple-Axis Mirroring and Radial Symmetry.
- **Particle Density Control**: 1:1 Calibration with real-time preview.
- **Reference Character**: Built-in 1.8-unit height Steve model.
- **Animation System**: Per-particle Tick Delay and real-time preview.
- **Project Management**: Save as `.gemote3d` files.

## 🛠️ Environment Setup
- **One-Click Start**: Double-click `run.bat`.
- **Manual Start**: Run `python run.py` or use "Live Server".

---

## 📄 License

This project is released as open-source. For the GEmote plugin itself, please refer to the original author's license agreement.
l author's license agreement.
