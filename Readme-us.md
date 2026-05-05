# Gemote Particle Effect 3D Editor

A professional 3D web-based drawing tool designed specifically for the Minecraft plugin **GEmote**.

## 📜 Credits & Background

This project is deeply modified and refactored based on the [MythicMobs Particle Editor](https://github.com/Ninepin123/Ninepin123.github.io) developed by **[Ninepin123](https://github.com/Ninepin123)**.

**Note**: Both the original project and this refactored version were developed with **AI assistance**. If you encounter any bugs during development, please feel free to report them on [GitHub Issues](https://github.com/WeiChia/GemoteWeb/issues).

The original project was primarily used for creating MythicMobs skill effects. We have refactored the core logic to support **GEmote**'s YAML format and added exclusive settings and a modern multi-language interface. You can add or modify custom language configurations in the `js/lang` folder.

## 🚀 Key Features

- **3D Interactive Canvas**: Supports 360-degree rotation, zooming, and panning to draw effects from any angle.
- **Diverse Drawing Tools**:
    - **Brush**: Hand-draw freely on the 3D plane.
    - **Point**: Place individual particles precisely.
    - **Shapes**: Quickly generate perfect rectangles and circles.
- **Advanced Symmetry System (NEW)**:
    - **Independent Triple-Axis Mirroring**: X, Y, and Z axes can be enabled independently or stacked.
    - **Custom Pivot**: Set a custom center for symmetry, with "Auto-Follow Platform" support.
    - **Radial Symmetry**: Supports rotation cloning around three axes with Equal and Fixed spacing modes.
- **Particle Density Control (NEW)**:
    - **1:1 Calibration**: UI values, preview, and actual generated particles are perfectly matched 1:1.
    - Real-time Preview: Visualize particle density instantly while adjusting values.
- **Reference Character (NEW)**:
    - Built-in 1.8-unit height Steve model for scale and spatial reference.
    - Supports **100% Mode**, **Ghost Mode**, and **Hidden Mode**.
- **Animation System**: Supports per-particle delay (Tick Delay) with built-in real-time animation preview.
- **Minecraft 1.21 Compatible**: Built-in comprehensive particle list.
- **Project Management**: Save your work as `.gemote3d` files for later editing.

## 🛠️ Detailed Usage

### 💻 Environment Setup
Due to browser security restrictions on JavaScript modules, you **cannot** simply double-click `index.html` to open it.
1.  **One-Click Start (Windows)**: Double-click `run.bat` in the folder. It will start a Python server and open your browser automatically.
2.  **Manual Start**: Run `python run.py` in the directory or use VS Code's "Live Server".

### 🖱️ 3D Canvas Controls
-   **Left Click/Drag**: Execute the current tool (Draw, Select, Place Mirror, etc.).
-   **Right Drag**: Rotate the camera view.
-   **Middle Drag (or Ctrl+Left)**: Pan the camera view.
-   **Scroll Wheel**: Zoom in/out.
-   **Middle Click**: Reset camera target to origin (0,0,0).
-   **Ctrl + Z**: Global Undo (Go back one step).

### 🎨 Core Control Panel

#### 1. Drawing Tools
-   **Camera Mode**: View-only mode to prevent accidental drawing.
-   **Select Mode**: Click particle groups to move or delete them. Supports marquee selection for multiple groups.
-   **Brush Mode**: Freehand drawing on the current 3D plane.
-   **Mirror Mode**: Click twice to define a "Mirror Line"; all subsequent particles will be generated symmetrically.
-   **Shape Tool**: Quickly create perfect rectangles or circles (filled or outline).

#### 2. Particle Settings
-   **Type Selection**: Over 40 built-in Minecraft 1.21 particles.
-   **Advanced Color Control** (Redstone only):
    -   **Full Color Palette**: Pick hues directly.
    -   **Brightness Slider**: Quickly adjust light/dark levels.
    -   **RGB Input**: Manually enter precise 0-255 values.
    -   *All three are bi-directionally synced.*

#### 3. Animation
-   **Enable Animation**: When checked, new strokes will have sequential delays.
-   **Preview Animation**: Click the "Preview Animation" button to watch the effect in 3D.
-   **Group Override**: Select a specific group to set an independent playback speed (Tick Delay).

#### 4. Project Management
-   **Save Project**: Export your design to `.gemote3d` (JSON) format.
-   **Effect ID**: This ID determines the exported YML filename.

### 🔄 Workflow
1.  **Naming**: Set your Effect ID (e.g., `FireRing`) in Project Management.
2.  **Coloring**: Switch to "Redstone" and use the advanced panel to pick colors.
3.  **Layout**: Adjust "Platform Height" and "Plane Rotation" to position your drawing space.
4.  **Drawing**: Use brush or shape tools to create patterns.
5.  **Testing**: Click "Preview Animation" to verify the motion.
6.  **Exporting**: Click "Generate Code" and place the `.yml` in your server's `plugins/GEmote/emotes/` folder.
7.  **Applying**: Run `/gemote reload` on the server, then `/gemote FireRing` to see it!

## 📄 License

This project is released as open-source. For the GEmote plugin itself, please refer to the original author's license agreement.

---

*Making Minecraft effect creation easier.*
