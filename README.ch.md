# Pro Metronome — 節拍可編輯的節拍器(適配移動端)
https://metronome-practice.vercel.app/

[English README](README.en.md)
### 憑藉自身興趣以及吉他練習需求做的，還有很多不足之處請包涵


一款基於瀏覽器，提供預設庫、節奏編輯器與極簡演出模式。全部邏輯於前端運行，無需後端伺服器。

## 技術棧

| 層級 | 技術 |
|------|------|
| UI 框架 | React 19 (JSX) |
| 建構工具 | Vite 8 |
| 樣式 | Tailwind CSS 3 + PostCSS + Autoprefixer |
| 狀態管理 | Zustand 5 |
| 音訊 | Web Audio API |
| 設計風格 | Material Design 3 |

## 功能特色

### 三大檢視模式

**預設庫 (Presets)**
<img width="1809" height="912" alt="螢幕擷取畫面 2026-06-04 215812" src="https://github.com/user-attachments/assets/3a7cf279-ebe3-4060-96fe-d3acfd6f45dd" />


- 內建經典節奏預設（標準 4/4、複合 6/8 等）
- 自訂節奏的儲存、收藏與刪除
- 依名稱或標籤搜尋，依拍號篩選
- 最近使用記錄（最多 10 筆）
- 底部狀態列顯示當前 BPM、拍號、經過時間與小節數

**編輯器 (Editor)**
 <img width="1812" height="912" alt="image" src="https://github.com/user-attachments/assets/742deec8-72ff-4ae8-b29b-7f1ecd468675" />
- BPM 控制：範圍 20–300，支援滑桿、按鈕微調與直接輸入，並顯示速度名稱（Largo、Andante、Allegro、Presto 等）
- Tap Tempo：透過連續點擊自動計算 BPM
- 拍號設定：內建常用拍號（4/4、3/4、6/8、5/4、7/8、2/4）及自訂拍號
- 節奏編輯：以小節 → 拍 → 細分音符的階層結構編輯節奏型態
- 兩個分頁：
  - **Beat**：比例式時間軸（`SequenceGrid`）與逐拍細分編輯，含容量條與溢出警告
  - **Mixer**：主音量、重音音量與音色
- 重音系統：強 / 中 / 普通 / 靜音四級重音
- 支援附點音符與連結線（Tie）
- 播放限制：所有拍的細分音符必須恰好填滿，才能開始播放（防止節拍漂移）
- 匯出 .json以保存節奏型態，且可匯入從這網站匯出的.json
 


**演出模式 (Performance)**
<img width="1786" height="922" alt="image" src="https://github.com/user-attachments/assets/3f63b16e-d3d1-4594-8dae-eb2902d97dd4" />

- 極簡舞台介面，大字顯示 BPM
- 圓形節拍器 UI，顯示細分音符點與分數標記
- 點擊圓形區域即可播放/暫停
- 底部顯示Sequence Grid

### 音訊引擎

- 基於 Web Audio API 的前瞻排程器（25ms 前瞻，100ms 預排程）
- 四種音色：木魚（預設）、電子、邊鼓、嗶聲
- 獨立重音音量控制與主音量控制
- 播放中可即時更新 BPM、音量與排程參數
- 支援暫停/恢復/停止

### 節奏理論模型

- 以 480 ticks 為一個四分音符的精度
- 支援全音符至三十二分音符，以及三連音
- 完整的拍容量驗證系統，確保節奏型態的正確性

## 安裝與使用(如果想要本地端運行)

### 環境需求

- [Node.js](https://nodejs.org/)（附帶 npm）

### 安裝步驟

```bash
git clone <repository-url>
cd Metronome_practice
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 Vite 顯示的網址（預設為 **http://localhost:5173/**）。

> **注意：** 瀏覽器的 AudioContext 政策要求使用者必須先與頁面互動（例如點擊）才能播放音訊。

### 其他指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器（支援熱更新） |
| `npm run build` | 建構生產版本至 `dist/` 目錄 |
| `npm run preview` | 本地預覽生產版本 |
| `npm run lint` | 執行 ESLint 程式碼檢查 |

## 專案結構

```
Metronome_practice/
├── public/                       # 靜態資源（Vite 原樣輸出）
│   ├── favicon.svg
│   └── icons.svg                 # Material Symbols 圖示集
├── src/
│   ├── main.jsx                  # React 進入點
│   ├── App.jsx                   # 依 store.view 切換三種檢視
│   ├── App.css                   # 應用級樣式
│   ├── index.css                 # Tailwind + MD3 元件樣式
│   ├── assets/                   # 圖片等前端資源
│   ├── engine/                   # 節奏理論與音訊（與 UI 無關）
│   │   ├── musicTheory.js        # Tick 計算、容量驗證、播放條目生成
│   │   └── audioEngine.js        # Web Audio 單例前瞻排程器
│   ├── hooks/
│   │   ├── useMetronome.js       # 播放 / 暫停 / 停止傳輸控制
│   │   ├── useTapTempo.js        # Tap Tempo BPM 計算
│   │   └── useMediaQuery.js      # 響應式媒體查詢（斷點偵測）
│   ├── store/
│   │   └── metronomeStore.js     # Zustand 單一狀態來源（節奏、播放、預設庫）
│   ├── pages/
│   │   ├── PresetsPage.jsx       # 預設庫
│   │   ├── EditorPage.jsx        # 節奏編輯器（桌面 / 行動版版面）
│   │   └── PerformancePage.jsx   # 演出模式
│   └── components/
│       ├── LibraryMenu.jsx       # 側邊導覽（Presets / Editor / Performance）
│       ├── BpmControl.jsx        # BPM 滑桿、按鈕微調、Tap Tempo
│       ├── TimeSignatureControl.jsx
│       ├── SequenceGrid.jsx      # 比例式時間軸（Beat 分頁）
│       ├── SubdivisionEditor.jsx # 逐拍細分音符編輯
│       ├── MixerPanel.jsx        # 音量與音色（Mixer 分頁）
│       ├── PlaybackControls.jsx  # 播放 / 暫停 / 停止與統計
│       ├── BeatIndicator.jsx     # 當前拍指示
│       ├── PresetCard.jsx        # 預設卡片
│       └── Icon.jsx              # Material Symbols 封裝
├── index.html                    # HTML 殼層
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── package.json
└── PROJECT_CONTEXT.md            # 開發者交接說明（非執行時依賴）
```

**架構說明**

- **無路由套件**：檢視由 `metronomeStore` 的 `view` 欄位（`presets` | `editor` | `performance`）驅動，`App.jsx` 依值渲染對應頁面。
- **狀態與音訊分離**：UI 與預設庫邏輯在 `store/`；節拍數學在 `engine/musicTheory.js`；實際發聲在 `engine/audioEngine.js`。
- **三頁共用導覽**：`LibraryMenu` 出現在 Presets、Editor、Performance，負責切換檢視與全域導覽。

## 資料模型

```
timeSignature: { beats, noteValue }
measures: [
  {
    id,
    beats: [
      {
        id,
        subdivisions: [
          { id, value, dotted, tie, accent }
        ],
        carryOver
      }
    ]
  }
]
```

- **value**：音符時值（quarter、eighth、sixteenth 等）
- **dotted**：是否為附點音符
- **tie**：是否與下一音符連結
- **accent**：重音等級（strong / medium / normal / none）

## 使用流程

1. **開啟應用** — 預設進入預設庫頁面
2. **選擇或建立節奏** — 載入內建預設，或點擊「New Preset」從空白 4/4 開始
3. **編輯節奏** — 在編輯器中調整 BPM、拍號、細分音符與重音
4. **試聽** — 當所有拍的音符填滿後，點擊播放按鈕試聽
5. **儲存** — 儲存為預設或匯出 JSON 檔案
6. **演出** — 切換至演出模式，使用極簡介面搭配練習或表演

## 未來展望

1. **支持帳號密碼登入保存數據(後端&資料庫)**
2. **鼓機和更多節拍器聲音**
3. **更多節奏型**
4. **UI顏色自定義**
5. **實作第二個小節並讓延音線可以延過去**

## 注意事項

- 所有資料僅保存於瀏覽器記憶體中，**重新整理頁面會遺失自訂預設**。請使用「Export JSON」功能匯出備份。
- 切換拍號會**重設**為一個預設小節。
- 離開編輯器或演出模式會自動停止音訊並重設播放狀態。
- 預設 BPM 為 120，拍號為 4/4，音色為木魚，主音量 0.8。

## 授權

本專案僅供學習與練習使用。
